import { Router } from 'express'
import { Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// In-memory usage tracking (in production, use Redis or database)
const dailyUsage = new Map<string, {
  totalQueries: number
  webSearchQueries: number
  deepResearchQueries: number
  lastReset: string // ISO date string for tracking daily reset
}>()

const getDailyUsageKey = (userId: string): string => {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  return `${userId}:${today}`
}

const getOrCreateUsage = (userId: string) => {
  const key = getDailyUsageKey(userId)
  const today = new Date().toISOString().split('T')[0]
  
  if (!dailyUsage.has(key)) {
    dailyUsage.set(key, {
      totalQueries: 0,
      webSearchQueries: 0,
      deepResearchQueries: 0,
      lastReset: today
    })
  }
  
  return dailyUsage.get(key)!
}

// Get current usage
router.get('/usage', authenticateToken, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const usage = getOrCreateUsage(userId)
    
    res.json({
      usage: {
        totalQueries: usage.totalQueries,
        webSearchQueries: usage.webSearchQueries,
        deepResearchQueries: usage.deepResearchQueries,
        maxTotal: 100,
        maxWebSearch: 20,
        maxDeepResearch: 3
      }
    })
  } catch (error) {
    console.error('Error fetching usage:', error)
    res.status(500).json({ error: 'Failed to fetch usage data' })
  }
})

// Update usage (called by chat endpoints)
export const updateUsage = (userId: string, type: 'total' | 'webSearch' | 'deepResearch' = 'total') => {
  const usage = getOrCreateUsage(userId)
  
  usage.totalQueries += 1
  
  if (type === 'webSearch') {
    usage.webSearchQueries += 1
  } else if (type === 'deepResearch') {
    usage.deepResearchQueries += 1
  }
  
  const key = getDailyUsageKey(userId)
  dailyUsage.set(key, usage)
}

// Check if user has remaining quota
export const hasRemainingQuota = (userId: string, type: 'total' | 'webSearch' | 'deepResearch' = 'total'): boolean => {
  const usage = getOrCreateUsage(userId)
  
  switch (type) {
    case 'total':
      return usage.totalQueries < 100
    case 'webSearch':
      return usage.webSearchQueries < 20
    case 'deepResearch':
      return usage.deepResearchQueries < 3
    default:
      return false
  }
}

// Reset usage (called by a daily cron job or middleware)
export const resetDailyUsage = () => {
  const today = new Date().toISOString().split('T')[0]
  
  // Clear old entries (keep only today's data)
  for (const [key, usage] of dailyUsage.entries()) {
    if (usage.lastReset !== today) {
      dailyUsage.delete(key)
    }
  }
}

export default router