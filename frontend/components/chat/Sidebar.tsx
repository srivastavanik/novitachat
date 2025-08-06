import React, { useState, useMemo, useEffect } from 'react'
import { isToday, isYesterday, isThisWeek, isThisMonth, format } from 'date-fns'
import ConversationItem from './ConversationItem'
import UsageIndicator from './UsageIndicator'
import ApiKeySelector from './ApiKeySelector'
import axios from '@/lib/axios-config'
import { useTheme } from '../ThemeProvider'
import { Sun, Moon } from 'lucide-react'

interface SidebarProps {
  conversations: any[]
  currentConversation: any
  user: any
  isOpen: boolean
  onToggle: () => void
  onNewConversation: () => void
  onSelectConversation: (conversation: any) => void
  onLogout: () => void
  dailyUsage?: {
    totalQueries: number
    webSearchQueries: number
    deepResearchQueries: number
    maxTotal: number
    maxWebSearch: number
    maxDeepResearch: number
  }
  activeKey?: 'novita' | 'user'
  userApiKey?: string | null
  onKeyChange?: (key: 'novita' | 'user') => void
  onAddApiKey?: () => void
  onRemoveApiKey?: () => void
}

export default function Sidebar({
  conversations,
  currentConversation,
  user,
  isOpen,
  onToggle,
  onNewConversation,
  onSelectConversation,
  onLogout,
  dailyUsage,
  activeKey = 'novita',
  userApiKey = null,
  onKeyChange,
  onAddApiKey,
  onRemoveApiKey
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null)
  const { theme, toggleTheme } = useTheme()

  // Perform search when query changes
  useEffect(() => {
    if (searchTimer) {
      clearTimeout(searchTimer)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    // Debounce search by 300ms
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await axios.get('/api/chat/search', {
          params: { q: searchQuery }
        })
        setSearchResults(response.data || [])
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    setSearchTimer(timer)

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [searchQuery])

  // Use search results if searching, otherwise use all conversations
  const displayConversations = searchQuery.trim() ? searchResults : conversations

  // Group conversations by day
  const groupedConversations = useMemo(() => {
    const groups: { [key: string]: any[] } = {}
    
    displayConversations.forEach(conv => {
      const date = new Date(conv.updated_at)
      let groupKey: string
      
      if (isToday(date)) {
        groupKey = 'Today'
      } else if (isYesterday(date)) {
        groupKey = 'Yesterday'
      } else if (isThisWeek(date)) {
        groupKey = 'This Week'
      } else if (isThisMonth(date)) {
        groupKey = 'This Month'
      } else {
        groupKey = format(date, 'MMMM yyyy')
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(conv)
    })
    
    // Sort groups
    const orderedKeys = ['Today', 'Yesterday', 'This Week', 'This Month']
    const sortedGroups: { [key: string]: any[] } = {}
    
    orderedKeys.forEach(key => {
      if (groups[key]) {
        sortedGroups[key] = groups[key]
      }
    })
    
    // Add remaining groups (older months)
    Object.keys(groups).forEach(key => {
      if (!orderedKeys.includes(key)) {
        sortedGroups[key] = groups[key]
      }
    })
    
    return sortedGroups
  }, [displayConversations])

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 p-3 rounded-lg bg-[var(--nova-bg-secondary)]/90 backdrop-blur-xl border border-[var(--nova-border-primary)] md:hidden shadow-lg text-[var(--nova-text-primary)] font-medium text-sm"
      >
        Menu
      </button>

      {/* Sidebar */}
      <div className={`${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed md:relative md:translate-x-0 z-40 w-64 h-full bg-[var(--nova-bg-primary)] border-r border-[var(--nova-border-primary)] transition-transform duration-300 flex flex-col`}>
        
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src={theme === 'light' ? "/Logo + wordmark (1).png" : "/nova-logo-wordmark.png"} 
              alt="Nova" 
              className="h-5 object-contain" 
            />
          </div>
          <button
            onClick={onNewConversation}
            className="p-2 rounded-lg hover:bg-[var(--nova-bg-hover)] transition-colors text-[var(--nova-text-secondary)] hover:text-[var(--nova-text-primary)]"
            title="New Chat"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        {/* Search Input */}
        <div className="px-4 pb-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--nova-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full pl-10 pr-3 py-2 bg-[var(--nova-bg-tertiary)] rounded-lg text-[var(--nova-text-primary)] placeholder:text-[var(--nova-text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--nova-primary)]/30 text-sm"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#00FF7F] border-t-transparent" />
              </div>
            )}
          </div>
        </div>
        
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3">
          {Object.keys(groupedConversations).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(groupedConversations).map(([group, convs]) => (
                <div key={group}>
                  <div className="text-[11px] font-medium text-[var(--nova-text-tertiary)] uppercase tracking-wider mb-1.5 px-3">
                    {group}
                  </div>
                  <div className="space-y-1">
                    {convs.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={currentConversation?.id === conv.id}
                        onClick={() => onSelectConversation(conv)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-[var(--nova-text-tertiary)] py-8">
              {searchQuery ? (isSearching ? 'Searching...' : 'No conversations found') : 'No conversations yet. Start a new chat!'}
            </div>
          )}
        </div>

        {/* API Key Selector */}
        {onKeyChange && onAddApiKey && onRemoveApiKey && (
          <div className="px-4 pb-3">
            <ApiKeySelector
              activeKey={activeKey}
              userApiKey={userApiKey}
              onKeyChange={onKeyChange}
              onAddKey={onAddApiKey}
              onRemoveKey={onRemoveApiKey}
              dailyUsage={dailyUsage}
            />
          </div>
        )}

        {/* Usage Indicator - only show for Novita key */}
        {activeKey === 'novita' && (
          <div className="px-4">
            <UsageIndicator
              isTrialMode={false}
              dailyUsage={dailyUsage}
            />
          </div>
        )}

        {/* User Profile & Settings */}
        <div className="p-4 border-t border-[var(--nova-border-primary)] space-y-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--nova-bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 text-[var(--nova-text-secondary)]" />
              ) : (
                <Sun className="h-4 w-4 text-[var(--nova-text-secondary)]" />
              )}
              <span className="text-sm text-[var(--nova-text-secondary)]">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>
            <div className="text-xs text-[var(--nova-text-tertiary)]">
              Switch to {theme === 'dark' ? 'light' : 'dark'}
            </div>
          </button>
          
          {/* User Profile */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--nova-bg-hover)] transition-colors"
          >
            <div className="flex-shrink-0 w-8 h-8 bg-[var(--nova-primary)] rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-[var(--nova-text-inverse)]">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-[var(--nova-text-primary)]">{user?.username || 'User'}</div>
              <div className="text-xs text-[var(--nova-text-tertiary)]">Free plan</div>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  )
}
