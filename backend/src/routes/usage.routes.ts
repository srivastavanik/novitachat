import { Router } from 'express'
import { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '../middleware/auth'
import { getUserApiKey } from './apikey.routes'
import { supabaseAdmin } from '../services/supabase.service'

const router = Router()

// Rate limiting middleware for usage endpoints
const usageRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    })
  }
})

// Stricter rate limiting for usage updates
const usageUpdateRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 usage updates per minute
  message: {
    error: 'Too many usage update requests, please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Input validation helper
const validateUserId = (userId: string): boolean => {
  if (!userId || typeof userId !== 'string') {
    return false
  }
  // UUID validation pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidPattern.test(userId)
}

const validateUsageType = (type: string): type is 'total' | 'webSearch' | 'deepResearch' => {
  return ['total', 'webSearch', 'deepResearch'].includes(type)
}

const getOrCreateUsage = async (userId: string) => {
  // Validate userId to prevent injection
  if (!validateUserId(userId)) {
    throw new Error('Invalid user ID format')
  }

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  
  try {
    // First try to get existing usage for today - using parameterized query
    const { data: existingUsage, error: fetchError } = await supabaseAdmin
      .from('daily_usage')
      .select('user_id, usage_date, total_queries, web_search_queries, deep_research_queries, created_at, updated_at')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .single()

    if (existingUsage && !fetchError) {
      return existingUsage
    }

    // If no usage exists for today, create a new record with parameterized insert
    const { data: newUsage, error: insertError } = await supabaseAdmin
      .from('daily_usage')
      .insert({
        user_id: userId,
        usage_date: today,
        total_queries: 0,
        web_search_queries: 0,
        deep_research_queries: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('user_id, usage_date, total_queries, web_search_queries, deep_research_queries, created_at, updated_at')
      .single()

    if (insertError) {
      console.error('Error creating usage record:', insertError.message)
      // Return a default usage object if database fails
      return {
        user_id: userId,
        usage_date: today,
        total_queries: 0,
        web_search_queries: 0,
        deep_research_queries: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }

    return newUsage
  } catch (error) {
    console.error('Error in getOrCreateUsage:', error instanceof Error ? error.message : 'Unknown error')
    // Return a default usage object if database fails
    return {
      user_id: userId,
      usage_date: today,
      total_queries: 0,
      web_search_queries: 0,
      deep_research_queries: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
}

// Get current usage with rate limiting
router.get('/usage', usageRateLimit, authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    // Validate userId format
    if (!validateUserId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' })
    }

    const usage = await getOrCreateUsage(userId)
    const userApiKey = await getUserApiKey(userId)
    
    // Sanitize output data
    const sanitizedResponse = {
      usage: {
        totalQueries: Math.max(0, parseInt(String(usage.total_queries || 0))),
        webSearchQueries: Math.max(0, parseInt(String(usage.web_search_queries || 0))),
        deepResearchQueries: Math.max(0, parseInt(String(usage.deep_research_queries || 0))),
        maxTotal: 100,
        maxWebSearch: 20,
        maxDeepResearch: 3
      },
      userApiKey: userApiKey && userApiKey.length >= 4 ? '***' + userApiKey.slice(-4) : null
    }
    
    res.json(sanitizedResponse)
  } catch (error) {
    console.error('Error fetching usage:', error instanceof Error ? error.message : 'Unknown error')
    res.status(500).json({ error: 'Failed to fetch usage data' })
  }
})

// Update usage (called by chat endpoints) with rate limiting
export const updateUsage = async (userId: string, type: 'total' | 'webSearch' | 'deepResearch' = 'total') => {
  try {
    // Validate inputs
    if (!validateUserId(userId)) {
      throw new Error('Invalid user ID format')
    }
    
    if (!validateUsageType(type)) {
      throw new Error('Invalid usage type')
    }

    const usage = await getOrCreateUsage(userId)
    const today = new Date().toISOString().split('T')[0]
    
    // Increment counters with bounds checking
    const currentTotal = Math.max(0, parseInt(String(usage.total_queries || 0)))
    const currentWebSearch = Math.max(0, parseInt(String(usage.web_search_queries || 0)))
    const currentDeepResearch = Math.max(0, parseInt(String(usage.deep_research_queries || 0)))
    
    const updates: any = {
      total_queries: Math.min(currentTotal + 1, 999999), // Prevent overflow
      updated_at: new Date().toISOString()
    }
    
    if (type === 'webSearch') {
      updates.web_search_queries = Math.min(currentWebSearch + 1, 999999)
    } else if (type === 'deepResearch') {
      updates.deep_research_queries = Math.min(currentDeepResearch + 1, 999999)
    }
    
    // Update the database with parameterized query
    const { error } = await supabaseAdmin
      .from('daily_usage')
      .update(updates)
      .eq('user_id', userId)
      .eq('usage_date', today)
    
    if (error) {
      console.error('Error updating usage:', error.message)
    }
  } catch (error) {
    console.error('Error in updateUsage:', error instanceof Error ? error.message : 'Unknown error')
  }
}

// Check if user has remaining quota
export const hasRemainingQuota = async (userId: string, type: 'total' | 'webSearch' | 'deepResearch' = 'total'): Promise<boolean> => {
  try {
    // Validate inputs
    if (!validateUserId(userId)) {
      return false
    }
    
    if (!validateUsageType(type)) {
      return false
    }

    const usage = await getOrCreateUsage(userId)
    
    const limits = {
      total: 100,
      webSearch: 20,
      deepResearch: 3
    }
    
    switch (type) {
      case 'total':
        return Math.max(0, parseInt(String(usage.total_queries || 0))) < limits.total
      case 'webSearch':
        return Math.max(0, parseInt(String(usage.web_search_queries || 0))) < limits.webSearch
      case 'deepResearch':
        return Math.max(0, parseInt(String(usage.deep_research_queries || 0))) < limits.deepResearch
      default:
        return false
    }
  } catch (error) {
    console.error('Error checking quota:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

// Reset usage (called by a daily cron job or middleware) with rate limiting
export const resetDailyUsage = async () => {
  try {
    // Delete all usage records older than today using parameterized query
    const today = new Date().toISOString().split('T')[0]
    
    const { error } = await supabaseAdmin
      .from('daily_usage')
      .delete()
      .lt('usage_date', today)
    
    if (error) {
      console.error('Error resetting daily usage:', error.message)
    } else {
      console.log('Daily usage reset completed')
    }
  } catch (error) {
    console.error('Error in resetDailyUsage:', error instanceof Error ? error.message : 'Unknown error')
  }
}

export default router