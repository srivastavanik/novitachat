'use client'

import { useState, useCallback, useMemo, memo, type MouseEvent } from 'react'
import { ChevronDown, Check, AlertCircle, Trash2, Plus } from 'lucide-react'

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

function ApiKeySelector({
  activeKey,
  userApiKey,
  onKeyChange,
  onAddKey,
  onRemoveKey,
  dailyUsage
}: ApiKeySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const remaining = useMemo(() => {
    if (!dailyUsage) return null
    return dailyUsage.maxTotal - dailyUsage.totalQueries
  }, [dailyUsage])

  const novitaStatus = useMemo(() => {
    if (remaining === null) return null
    if (remaining === 0) return 'exhausted'
    if (remaining <= 10) return 'low'
    return 'good'
  }, [remaining])

  const toggleOpen = useCallback(() => {
    setIsOpen((prev: boolean) => !prev)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const selectNovita = useCallback(() => {
    onKeyChange('novita')
    setIsOpen(false)
  }, [onKeyChange])

  const selectUser = useCallback(() => {
    onKeyChange('user')
    setIsOpen(false)
  }, [onKeyChange])

  const removeKey = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    onRemoveKey()
    setIsOpen(false)
  }, [onRemoveKey])

  const addKey = useCallback(() => {
    onAddKey()
    setIsOpen(false)
  }, [onAddKey])

  const isNovitaActive = activeKey === 'novita'
  const isUserActive = activeKey === 'user'

  const chevronClass = useMemo(() => {
    return `h-4 w-4 text-[var(--nova-text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`
  }, [isOpen])

  const remainingDisplay = useMemo(() => {
    if (isNovitaActive) {
      return remaining !== null ? `${remaining} queries left today` : 'Loading...'
    }
    return userApiKey ? `Key ending in ${userApiKey}` : 'No key configured'
  }, [isNovitaActive, remaining, userApiKey])

  const novitaRemainingDetail = useMemo(() => {
    return remaining !== null 
      ? `${remaining}/${dailyUsage?.maxTotal || 100} queries remaining`
      : 'Rate limited access'
  }, [remaining, dailyUsage])

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--nova-bg-secondary)] border border-[var(--nova-border-primary)] rounded-xl hover:bg-[var(--nova-bg-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="text-left">
            <div className="text-sm font-medium text-[var(--nova-text-primary)] flex items-center gap-2">
              {isNovitaActive ? 'Chat Platform Key' : 'Your API Key'}
              {isNovitaActive && novitaStatus === 'exhausted' && (
                <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                  Limit Reached
                </span>
              )}
              {isNovitaActive && novitaStatus === 'low' && (
                <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
                  Low
                </span>
              )}
              {isUserActive && (
                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                  Unlimited
                </span>
              )}
            </div>
            <div className="text-xs text-[var(--nova-text-secondary)]">
              {remainingDisplay}
            </div>
          </div>
        </div>
        <ChevronDown className={chevronClass} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={close}
          />
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-[var(--nova-bg-primary)] border border-[var(--nova-border-primary)] rounded-xl shadow-xl z-50 overflow-hidden max-h-96 overflow-y-auto">
            {/* Novita Key Option */}
            <button
              onClick={selectNovita}
              className={`w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--nova-bg-secondary)] transition-colors ${
                isNovitaActive ? 'bg-[var(--nova-bg-secondary)]' : ''
              }`}
            >
              <div className="flex items-center gap-3">

                <div className="text-left">
                  <div className="text-sm font-medium text-[var(--nova-text-primary)]">Chat Platform Key</div>
                  <div className="text-xs text-[var(--nova-text-secondary)]">
                    {novitaRemainingDetail}
                  </div>
                  {novitaStatus === 'exhausted' && (
                    <div className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      Daily limit reached
                    </div>
                  )}
                </div>
              </div>
              {isNovitaActive && (
                <Check className="h-4 w-4 text-[#00FF7F]" />
              )}
            </button>

            {/* User Key Option */}
            {userApiKey ? (
              <button
                onClick={selectUser}
                className={`w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--nova-bg-secondary)] transition-colors border-t border-[var(--nova-border-primary)] ${
                  isUserActive ? 'bg-[var(--nova-bg-secondary)]' : ''
                }`}
              >
                <div className="flex items-center gap-3">

                  <div className="text-left">
                    <div className="text-sm font-medium text-[var(--nova-text-primary)]">Your API Key</div>
                    <div className="text-xs text-[var(--nova-text-secondary)]">
                      Ending in {userApiKey} • Unlimited queries
                    </div>
                    <div className="text-xs text-green-400 flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3" />
                      No rate limits
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isUserActive && (
                    <Check className="h-4 w-4 text-[#00FF7F]" />
                  )}
                  <button
                    onClick={removeKey}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                    title="Remove API key"
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </button>
                </div>
              </button>
            ) : (
              <button
                onClick={addKey}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--nova-bg-secondary)] transition-colors border-t border-[var(--nova-border-primary)]"
              >
                <div className="w-10 h-10 rounded-lg bg-[#00FF7F]/10 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-[#00FF7F]" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-[var(--nova-text-primary)]">Add Your API Key</div>
                  <div className="text-xs text-[var(--nova-text-secondary)]">
                    Use your own Novita key for unlimited access
                  </div>
                </div>
              </button>
            )}

            {/* Info Section */}
            <div className="px-4 py-3 bg-[var(--nova-bg-tertiary)] border-t border-[var(--nova-border-primary)]">
              <div className="text-xs text-[var(--nova-text-secondary)]">
                {isNovitaActive ? (
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

export default memo(ApiKeySelector)