'use client'

import { useState } from 'react'
import { Key, ChevronDown, Check, AlertCircle, Trash2, Plus } from 'lucide-react'

interface ApiKeySelectorProps {
  activeKey: 'novita' | 'user'
  userApiKey: string | null
  onKeyChange: (key: 'novita' | 'user') => void
  onAddKey: () => void
  onRemoveKey: () => void
  dailyUsage?: {
    totalQueries: number
    webSearchQueries: number
    deepResearchQueries: number
    maxTotal: number
    maxWebSearch: number
    maxDeepResearch: number
  }
}

export default function ApiKeySelector({
  activeKey,
  userApiKey,
  onKeyChange,
  onAddKey,
  onRemoveKey,
  dailyUsage
}: ApiKeySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getRemainingQueries = () => {
    if (!dailyUsage) return null
    return dailyUsage.maxTotal - dailyUsage.totalQueries
  }

  const getKeyStatus = (key: 'novita' | 'user') => {
    if (key === 'novita') {
      const remaining = getRemainingQueries()
      if (remaining === null) return null
      if (remaining === 0) return 'exhausted'
      if (remaining <= 10) return 'low'
      return 'good'
    }
    return userApiKey ? 'active' : null
  }

  const novitaStatus = getKeyStatus('novita')
  const remaining = getRemainingQueries()

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-[#00FF7F]" />
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              {activeKey === 'novita' ? 'Chat Platform Key' : 'Your API Key'}
              {activeKey === 'novita' && novitaStatus === 'exhausted' && (
                <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                  Limit Reached
                </span>
              )}
              {activeKey === 'novita' && novitaStatus === 'low' && (
                <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
                  Low
                </span>
              )}
              {activeKey === 'user' && (
                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                  Unlimited
                </span>
              )}
            </div>
            <div className="text-xs text-gray-600 dark:text-white/60">
              {activeKey === 'novita' 
                ? remaining !== null ? `${remaining} queries left today` : 'Loading...'
                : userApiKey ? `Key ending in ${userApiKey}` : 'No key configured'
              }
            </div>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 dark:text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-black border border-gray-200 dark:border-white/20 rounded-lg shadow-xl z-50 overflow-hidden max-h-96 overflow-y-auto">
            {/* Novita Key Option */}
            <button
              onClick={() => {
                onKeyChange('novita')
                setIsOpen(false)
              }}
              className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${
                activeKey === 'novita' ? 'bg-gray-100 dark:bg-white/5' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activeKey === 'novita' ? 'bg-[#00FF7F]/20' : 'bg-gray-200 dark:bg-white/10'
                }`}>
                  <Key className={`h-5 w-5 ${
                    activeKey === 'novita' ? 'text-[#00FF7F]' : 'text-gray-600 dark:text-white/60'
                  }`} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Chat Platform Key</div>
                  <div className="text-xs text-gray-600 dark:text-white/60">
                    {remaining !== null 
                      ? `${remaining}/${dailyUsage?.maxTotal || 100} queries remaining`
                      : 'Rate limited access'
                    }
                  </div>
                  {novitaStatus === 'exhausted' && (
                    <div className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      Daily limit reached
                    </div>
                  )}
                </div>
              </div>
              {activeKey === 'novita' && (
                <Check className="h-4 w-4 text-[#00FF7F]" />
              )}
            </button>

            {/* User Key Option */}
            {userApiKey ? (
              <button
                onClick={() => {
                  onKeyChange('user')
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors border-t border-white/10 ${
                  activeKey === 'user' ? 'bg-white/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    activeKey === 'user' ? 'bg-[#00FF7F]/20' : 'bg-white/10'
                  }`}>
                    <Key className={`h-5 w-5 ${
                      activeKey === 'user' ? 'text-[#00FF7F]' : 'text-white/60'
                    }`} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">Your API Key</div>
                    <div className="text-xs text-white/60">
                      Ending in {userApiKey} • Unlimited queries
                    </div>
                    <div className="text-xs text-green-400 flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3" />
                      No rate limits
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeKey === 'user' && (
                    <Check className="h-4 w-4 text-[#00FF7F]" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveKey()
                      setIsOpen(false)
                    }}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                    title="Remove API key"
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </button>
                </div>
              </button>
            ) : (
              <button
                onClick={() => {
                  onAddKey()
                  setIsOpen(false)
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-t border-white/10"
              >
                <div className="w-10 h-10 rounded-lg bg-[#00FF7F]/10 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-[#00FF7F]" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-white">Add Your API Key</div>
                  <div className="text-xs text-white/60">
                    Use your own Novita key for unlimited access
                  </div>
                </div>
              </button>
            )}

            {/* Info Section */}
            <div className="px-4 py-3 bg-white/5 border-t border-white/10">
              <div className="text-xs text-white/60">
                {activeKey === 'novita' ? (
                  <>
                    <strong>Chat Platform Key:</strong> Free tier with daily limits. 
                    Resets at midnight UTC.
                  </>
                ) : (
                  <>
                    <strong>Your API Key:</strong> No rate limits. 
                    Charges apply to your Novita account.
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}