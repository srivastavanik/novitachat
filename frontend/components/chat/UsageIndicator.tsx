'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'

interface UsageIndicatorProps {
  isTrialMode: boolean
  trialMessageCount?: number
  dailyUsage?: {
    totalQueries: number
    webSearchQueries: number
    deepResearchQueries: number
    maxTotal: number
    maxWebSearch: number
    maxDeepResearch: number
  }
}

export default function UsageIndicator({ isTrialMode, trialMessageCount = 0, dailyUsage }: UsageIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [timeUntilReset, setTimeUntilReset] = useState<string>('')

  useEffect(() => {
    const calculateTimeUntilReset = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
      tomorrow.setUTCHours(0, 0, 0, 0)
      
      const diff = tomorrow.getTime() - now.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      if (hours > 0) {
        setTimeUntilReset(`${hours}h ${minutes}m`)
      } else {
        setTimeUntilReset(`${minutes}m`)
      }
    }

    calculateTimeUntilReset()
    const interval = setInterval(calculateTimeUntilReset, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  const getProgressBarColor = (used: number, max: number) => {
    const percentage = (used / max) * 100
    if (percentage <= 33) return 'bg-green-500'
    if (percentage <= 66) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (isTrialMode) {
    const remaining = Math.max(0, 10 - trialMessageCount)
    const percentage = (trialMessageCount / 10) * 100
    const barColor = getProgressBarColor(trialMessageCount, 10)

    return (
      <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#00FF7F]" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Trial Messages</span>
          </div>
          <span className="text-sm text-gray-600 dark:text-white/60">
            {remaining} left
          </span>
        </div>
        
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-600 dark:text-white/60 mb-1">
            <span>{trialMessageCount} used</span>
            <span>10 total</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
            <div 
              className={`${barColor} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {remaining <= 3 && remaining > 0 && (
          <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
            <span>⚠️</span>
            <span>Only {remaining} message{remaining === 1 ? '' : 's'} remaining</span>
          </div>
        )}

        {remaining === 0 && (
          <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
            <span>🚫</span>
            <span>Trial limit reached</span>
          </div>
        )}
      </div>
    )
  }

  if (!dailyUsage) return null

  const {
    totalQueries,
    webSearchQueries,
    deepResearchQueries,
    maxTotal,
    maxWebSearch,
    maxDeepResearch
  } = dailyUsage

  const totalRemaining = Math.max(0, maxTotal - totalQueries)
  const webSearchRemaining = Math.max(0, maxWebSearch - webSearchQueries)
  const deepResearchRemaining = Math.max(0, maxDeepResearch - deepResearchQueries)

  const totalPercentage = (totalQueries / maxTotal) * 100
  const webSearchPercentage = (webSearchQueries / maxWebSearch) * 100
  const deepResearchPercentage = (deepResearchQueries / maxDeepResearch) * 100
  
  const totalBarColor = getProgressBarColor(totalQueries, maxTotal)
  const webSearchBarColor = getProgressBarColor(webSearchQueries, maxWebSearch)
  const deepResearchBarColor = getProgressBarColor(deepResearchQueries, maxDeepResearch)

  return (
    <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl p-2 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">Daily Usage</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm text-gray-600 dark:text-white/60 whitespace-nowrap">{totalRemaining} left</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400 dark:text-white/40" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400 dark:text-white/40" />
          )}
        </div>
      </button>

      {/* Summary bar */}
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-600 dark:text-white/60 mb-1">
          <span>{totalQueries} used</span>
          <span>{maxTotal} total</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
          <div 
            className={`${totalBarColor} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(100, totalPercentage)}%` }}
          />
        </div>
      </div>

      {/* Detailed breakdown */}
      {isExpanded && (
        <div className="mt-4 space-y-3">
          {/* Web Search */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-700 dark:text-white/80">Web Search</span>
              </div>
              <span className="text-xs text-gray-600 dark:text-white/60">
                {webSearchRemaining} left
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-white/50 mb-1">
              <span>{webSearchQueries} used</span>
              <span>{maxWebSearch} daily</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5">
              <div 
                className={`${webSearchBarColor} h-1.5 rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(100, webSearchPercentage)}%` }}
              />
            </div>
          </div>

          {/* Deep Research */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-700 dark:text-white/80">Deep Research</span>
              </div>
              <span className="text-xs text-gray-600 dark:text-white/60">
                {deepResearchRemaining} left
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-white/50 mb-1">
              <span>{deepResearchQueries} used</span>
              <span>{maxDeepResearch} daily</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5">
              <div 
                className={`${deepResearchBarColor} h-1.5 rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(100, deepResearchPercentage)}%` }}
              />
            </div>
          </div>

          {/* Warnings */}
          {totalRemaining <= 10 && totalRemaining > 0 && (
            <div className="text-xs text-yellow-400 flex items-center gap-1 mt-2">
              <span>⚠️</span>
              <span>Only {totalRemaining} queries remaining today</span>
            </div>
          )}

          {deepResearchRemaining === 0 && (
            <div className="text-xs text-red-400 flex items-center gap-1 mt-2">
              <span>🚫</span>
              <span>Deep research limit reached for today</span>
            </div>
          )}

          {webSearchRemaining === 0 && (
            <div className="text-xs text-red-400 flex items-center gap-1 mt-2">
              <span>🚫</span>
              <span>Web search limit reached for today</span>
            </div>
          )}
        </div>
      )}

      {/* Reset time */}
      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-white/40">
          <span>Resets in {timeUntilReset || 'calculating...'}</span>
        </div>
      </div>
    </div>
  )
}