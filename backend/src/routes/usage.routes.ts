import { Router } from 'express'
import { Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { getUserApiKey } from './apikey.routes'
import { supabaseAdmin } from '../services/supabase.service'
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import Redis from 'ioredis'

const router = Router()

// Initialize Redis client for distributed rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3
})

// Configure rate limiter with Redis store for distributed environments
const usageRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:usage:',
    sendCommand: (...args: string[]) => (redisClient as any).call(...args)
  }),
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // 10 requests per minute per authenticated user
  message: 'Too many usage requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use authenticated user ID as rate limit key
    const userId = (req as any).user?.userId
    return userId || req.ip // Fallback to IP if user ID not available
  },
  skip: (req: Request) => {
    // Skip rate limiting for service accounts if needed
    const serviceAccount = req.headers['x-service-account']
    return serviceAccount === process.env.SERVICE_ACCOUNT_KEY
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please wait before making another request.',
      retryAfter: res.getHeader('Retry-After')
    })
  }
})

// Global rate limiter to prevent overall system abuse
const globalRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100, // 100 requests per hour globally
  message: 'Global rate limit exceeded',
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: () => 'global',
  skip: (req: Request) => {
    const serviceAccount = req.headers['x-service-account']
    return serviceAccount === process.env.SERVICE_ACCOUNT_KEY
  }
})

const getOrCreateUsage = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  
  try {
    // First try to get existing usage for today
    const { data: existingUsage, error: fetchError } = await supabaseAdmin
      .from('daily_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .single()

    if (existingUsage && !fetchError) {
      return existingUsage
    }

    // If no usage exists for today, create a new record
    const { data: newUsage, error: insertError } = await supabaseAdmin
      .from('daily_usage')
      .insert({
        user_id: userId,
        usage_date: today,
        total_queries: 0,
        web_search_queries: 0,
        deep_research_queries: 0
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating usage record:', insertError)
      // Return a default usage object if database fails
      return {
        user_id: userId,
        usage_date: today,
        total_queries: 0,
        web_search_queries: 0,
        deep_research_queries: 0
      }
    }

    return newUsage
  } catch (error) {
    console.error('Error in getOrCreateUsage:', error)
    // Return a default usage object if database fails
    return {
      user_id: userId,
      usage_date: today,
      total_queries: 0,
      web_search_queries: 0,
      deep_research_queries: 0
    }
  }
}

// Get current usage
router.get('/usage', authenticate, usageRateLimiter, globalRateLimiter, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const usage = await getOrCreateUsage(userId)
    const userApiKey = await getUserApiKey(userId)
    
    res.json({
      usage: {
        totalQueries: usage.total_queries || 0,
        webSearchQueries: usage.web_search_queries || 0,
        deepResearchQueries: usage.deep_research_queries || 0,
        maxTotal: 100,
        maxWebSearch: 20,
        maxDeepResearch: 3
      },
      userApiKey: userApiKey ? '***' + userApiKey.slice(-4) : null // Send masked version for security
    })
  } catch (error) {
    console.error('Error fetching usage:', error)
    res.status(500).json({ error: 'Failed to fetch usage data' })
  }
})

// Update usage (called by chat endpoints)
export const updateUsage = async (userId: string, type: 'total' | 'webSearch' | 'deepResearch' = 'total') => {
  try {
    const usage = await getOrCreateUsage(userId)
    const today = new Date().toISOString().split('T')[0]
    
    // Increment counters
    const updates: any = {
      total_queries: (usage.total_queries || 0) + 1,
      updated_at: new Date().toISOString()
    }
    
    if (type === 'webSearch') {
      updates.web_search_queries = (usage.web_search_queries || 0) + 1
    } else if (type === 'deepResearch') {
      updates.deep_research_queries = (usage.deep_research_queries || 0) + 1
    }
    
    // Update the database
    const { error } = await supabaseAdmin
      .from('daily_usage')
      .update(updates)
      .eq('user_id', userId)
      .eq('usage_date', today)
    
    if (error) {
      console.error('Error updating usage:', error)
    }
  } catch (error) {
    console.error('Error in updateUsage:', error)
  }
}

// Check if user has remaining quota
export const hasRemainingQuota = async (userId: string, type: 'total' | 'webSearch' | 'deepResearch' = 'total'): Promise<boolean> => {
  try {
    const usage = await getOrCreateUsage(userId)
    
    const limits = {
      total: 100,
      webSearch: 20,
      deepResearch: 3
    }
    
    switch (type) {
      case 'total':
        return (usage.total_queries || 0) < limits.total
      case 'webSearch':
        return (usage.web_search_queries || 0) < limits.webSearch
      case 'deepResearch':
        return (usage.deep_research_queries || 0) < limits.deepResearch
      default:
        return false
    }
  } catch (error) {
    console.error('Error checking quota:', error)
    return false
  }
}

// Reset usage (called by a daily cron job or middleware)
export const resetDailyUsage = async () => {
  try {
    // Delete all usage records older than today
    const today = new Date().toISOString().split('T')[0]
    
    const { error } = await supabaseAdmin
      .from('daily_usage')
      .delete()
      .lt('usage_date', today)
    
    if (error) {
      console.error('Error resetting daily usage:', error)
    } else {
      console.log('Daily usage reset completed')
    }
  } catch (error) {
    console.error('Error in resetDailyUsage:', error)
  }
}

export default router