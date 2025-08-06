'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { io, Socket } from 'socket.io-client'
import axios from '@/lib/axios-config'
import { Loader2, Settings, AlertCircle, MessageSquare, X } from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/chat/Sidebar'
import MessageList from '@/components/chat/MessageList'
import ChatInput from '@/components/chat/ChatInput'
import ConversationSettings from '@/components/chat/ConversationSettings'
import ThinkingDisplay from '@/components/chat/ThinkingDisplay'
import TrialLimitModal from '@/components/chat/TrialLimitModal'
import UsageIndicator from '@/components/chat/UsageIndicator'
import ChatFooter from '@/components/chat/ChatFooter'
import ApiKeyModal from '@/components/chat/ApiKeyModal'
import ApiKeySelector from '@/components/chat/ApiKeySelector'
import { getCookie } from '@/lib/utils'

interface TrialMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  attachments?: Array<{
    id: string
    name: string
    type: 'image' | 'document'
    size: number
    data?: string
  }>
  metadata?: {
    webSearch?: boolean
    isSearchProgress?: boolean
  }
}

const TRIAL_MESSAGE_LIMIT = 10

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, logout } = useAuth()
  const isTrialMode = searchParams.get('trial') === 'true'
  const initialQuery = searchParams.get('q')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [currentConversation, setCurrentConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [currentModel, setCurrentModel] = useState<string>('')
  const [modelCapabilities, setModelCapabilities] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  
  // Trial mode states
  const [trialMessages, setTrialMessages] = useState<TrialMessage[]>([])
  const [trialMessageCount, setTrialMessageCount] = useState(0)
  const [showTrialLimitModal, setShowTrialLimitModal] = useState(false)
  const [showDeepResearchModal, setShowDeepResearchModal] = useState(false)
  const hasInitialized = useRef(false)
  
  // Daily usage tracking for authenticated users
  const [dailyUsage, setDailyUsage] = useState({
    totalQueries: 0,
    webSearchQueries: 0,
    deepResearchQueries: 0,
    maxTotal: 100,
    maxWebSearch: 20,
    maxDeepResearch: 3
  })
  
  // API key management
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKeyModalReason, setApiKeyModalReason] = useState<'limit_exceeded' | 'no_credits' | 'setup'>('setup')
  const [apiKeyLimitType, setApiKeyLimitType] = useState<'total' | 'webSearch' | 'deepResearch'>('total')
  const [userApiKey, setUserApiKey] = useState<string | null>(null)
  const [activeKey, setActiveKey] = useState<'novita' | 'user'>('novita')
  const [useUserKey, setUseUserKey] = useState(false)
  
  // Thinking state for trial mode
  const [trialThinkingContent, setTrialThinkingContent] = useState<string>('')
  const [isTrialThinking, setIsTrialThinking] = useState(false)
  
  // Thinking state for authenticated users
  const [thinkingMessage, setThinkingMessage] = useState<{ id: string; content: string; isThinking: boolean } | null>(null)

  // Redirect if not authenticated and not in trial mode
  useEffect(() => {
    if (!isTrialMode && !authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router, isTrialMode])

  // Initialize trial mode
  useEffect(() => {
    if (isTrialMode && !hasInitialized.current) {
      hasInitialized.current = true
      
      // Load existing trial messages
      const savedMessages = localStorage.getItem('trialMessages')
      const savedCount = localStorage.getItem('trialMessageCount')
      
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages)
          setTrialMessages(parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })))
        } catch (e) {
          console.error('Failed to parse trial messages:', e)
        }
      }

      if (savedCount) {
        const count = parseInt(savedCount, 10)
        setTrialMessageCount(count)
        
        // Check if trial is exhausted
        if (count >= TRIAL_MESSAGE_LIMIT) {
          setShowTrialLimitModal(true)
          return
        }
      }

      // Handle initial query from home page
      if (initialQuery && (!savedMessages || JSON.parse(savedMessages).length === 0)) {
        // Set the initial message in the input
        setInputMessage(initialQuery)
        // Send it after a brief delay to ensure everything is initialized
        setTimeout(() => {
          handleTrialSendMessage(initialQuery)
        }, 100)
      }
    }
  }, [isTrialMode, initialQuery, router])

  // Save trial data to localStorage whenever it changes
  useEffect(() => {
    if (isTrialMode && trialMessages.length > 0) {
      localStorage.setItem('trialMessages', JSON.stringify(trialMessages))
      localStorage.setItem('trialMessageCount', trialMessageCount.toString())
    }
  }, [isTrialMode, trialMessages, trialMessageCount])

  // Initialize WebSocket connection (only for authenticated users)
  useEffect(() => {
    if (user && !isTrialMode) {
      const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
        auth: {
          token: getCookie('access_token')
        }
      })

      socketInstance.on('connect', () => {
        console.log('Connected to WebSocket')
      })

      socketInstance.on('user_message_saved', (data) => {
        setMessages(prev => [...prev, data.message])
      })

      socketInstance.on('search_progress', (data) => {
        setMessages(prev => [...prev, data.message])
      })

      socketInstance.on('search_update', (data) => {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { 
                ...msg, 
                content: msg.content + '\n' + data.update,
                metadata: { 
                  ...msg.metadata, 
                  linkPreviews: data.links || msg.metadata?.linkPreviews,
                  searchSources: data.links || msg.metadata?.searchSources,
                  isComplete: data.isComplete || false
                }
              }
            : msg
        ))
      })

      // Handle thinking messages
      socketInstance.on('thinking_start', (data) => {
        console.log('Thinking started:', data)
        setThinkingMessage({ id: data.messageId, content: '', isThinking: true })
      })

      socketInstance.on('thinking_chunk', (data) => {
        console.log('Thinking chunk:', data.chunk)
        setThinkingMessage(prev => prev && prev.id === data.messageId 
          ? { ...prev, content: prev.content + data.chunk }
          : prev
        )
      })

      socketInstance.on('thinking_complete', (data) => {
        console.log('Thinking complete:', data)
        setThinkingMessage(prev => prev && prev.id === data.messageId 
          ? { ...prev, isThinking: false }
          : prev
        )
        // Don't clear immediately - let user see the complete reasoning
      })

      socketInstance.on('stream_start', (data) => {
        setIsStreaming(true)
        setStreamingMessage('')
        // Add the empty assistant message to the messages array
        if (data.message) {
          setMessages(prev => [...prev, data.message])
        }
      })

      socketInstance.on('stream_chunk', (data) => {
        setStreamingMessage(prev => prev + data.chunk)
        // Also update the message in the messages array
        if (data.messageId) {
          setMessages(prev => prev.map(msg => 
            msg.id === data.messageId 
              ? { ...msg, content: msg.content + data.chunk }
              : msg
          ))
        }
      })

      socketInstance.on('stream_complete', (data) => {
        setIsStreaming(false)
        // Update the existing message instead of adding a duplicate
        setMessages(prev => prev.map(msg => 
          msg.id === data.message.id 
            ? {
                ...data.message,
                // Preserve link previews from search results
                metadata: {
                  ...data.message.metadata,
                  linkPreviews: msg.metadata?.linkPreviews || data.message.metadata?.linkPreviews
                }
              }
            : msg
        ))
        setStreamingMessage('')
      })

      socketInstance.on('stream_error', (data) => {
        setIsStreaming(false)
        console.error('Stream error:', data.error)
        setStreamingMessage('')
        
        // Check if it's an API key error
        if (data.error?.includes('insufficient') || data.error?.includes('credits') || data.error?.includes('quota')) {
          setApiKeyModalReason('no_credits')
          setShowApiKeyModal(true)
        } else if (data.error?.includes('Invalid API key') || data.error?.includes('Unauthorized')) {
          // Invalid API key - remove it and switch back to Novita
          handleRemoveApiKey()
          alert('Your API key is invalid or expired. Switching back to Nova platform key.')
        }
      })

      socketInstance.on('conversation_title_updated', (data) => {
        // Update the conversation title in both current conversation and list
        setCurrentConversation((prev: any) => 
          prev && prev.id === data.conversationId 
            ? { ...prev, title: data.title }
            : prev
        )
        setConversations(prev => 
          prev.map(conv => 
            conv.id === data.conversationId 
              ? { ...conv, title: data.title }
              : conv
          )
        )
      })

      setSocket(socketInstance)

      return () => {
        socketInstance.disconnect()
      }
    }
  }, [user, isTrialMode])

  // Load conversations and daily usage (only for authenticated users)
  useEffect(() => {
    if (user && !isTrialMode) {
      loadConversations()
      loadDailyUsage()
    }
  }, [user, isTrialMode])

  const handleRemoveApiKey = async () => {
    try {
      await axios.delete('/api/auth/api-key')
      setUserApiKey(null)
      setActiveKey('novita')
      setUseUserKey(false)
      // Reload usage after removing key
      loadDailyUsage()
    } catch (error) {
      console.error('Failed to remove API key:', error)
    }
  }

  const handleKeySwitch = (key: 'novita' | 'user') => {
    setActiveKey(key)
    setUseUserKey(key === 'user')
  }

  const loadDailyUsage = async () => {
    try {
      const response = await axios.get('/api/auth/usage')
      if (response.data.usage) {
        setDailyUsage(response.data.usage)
      }
      if (response.data.userApiKey) {
        setUserApiKey(response.data.userApiKey)
        // If user has API key and Novita key is exhausted, auto-switch to user key
        if (response.data.usage.totalQueries >= response.data.usage.maxTotal) {
          setActiveKey('user')
          setUseUserKey(true)
        }
      }
    } catch (error) {
      console.error('Failed to load daily usage:', error)
      // Set default values if API fails
      setDailyUsage({
        totalQueries: 0,
        webSearchQueries: 0,
        deepResearchQueries: 0,
        maxTotal: 100,
        maxWebSearch: 20,
        maxDeepResearch: 3
      })
    }
  }

  const updateUsageAfterMessage = (type: 'webSearch' | 'deepResearch' | 'normal' = 'normal') => {
    setDailyUsage(prev => ({
      ...prev,
      totalQueries: prev.totalQueries + 1,
      webSearchQueries: type === 'webSearch' ? prev.webSearchQueries + 1 : prev.webSearchQueries,
      deepResearchQueries: type === 'deepResearch' ? prev.deepResearchQueries + 1 : prev.deepResearchQueries
    }))
  }

  const checkUsageLimits = (type: 'webSearch' | 'deepResearch' | 'normal' = 'normal'): boolean => {
    // If using user's own API key, no limits apply
    if (activeKey === 'user' && userApiKey) return true

    // Only check limits when using Novita platform key
    if (activeKey === 'novita') {
      // Check limits
      if (dailyUsage.totalQueries >= dailyUsage.maxTotal) {
        // If user has their own key, suggest switching
        if (userApiKey) {
          setApiKeyModalReason('limit_exceeded')
          setApiKeyLimitType('total')
          // Auto-switch to user key
          setActiveKey('user')
          setUseUserKey(true)
          return true // Allow sending with user key
        } else {
          // Show modal to add key
          setApiKeyModalReason('limit_exceeded')
          setApiKeyLimitType('total')
          setShowApiKeyModal(true)
          return false
        }
      }

      if (type === 'webSearch' && dailyUsage.webSearchQueries >= dailyUsage.maxWebSearch) {
        if (userApiKey) {
          setActiveKey('user')
          setUseUserKey(true)
          return true
        } else {
          setApiKeyModalReason('limit_exceeded')
          setApiKeyLimitType('webSearch')
          setShowApiKeyModal(true)
          return false
        }
      }

      if (type === 'deepResearch' && dailyUsage.deepResearchQueries >= dailyUsage.maxDeepResearch) {
        if (userApiKey) {
          setActiveKey('user')
          setUseUserKey(true)
          return true
        } else {
          setApiKeyModalReason('limit_exceeded')
          setApiKeyLimitType('deepResearch')
          setShowApiKeyModal(true)
          return false
        }
      }
    }

    return true
  }

  const loadConversations = async () => {
    try {
      const response = await axios.get('/api/chat/conversations')
      const convs = response.data.conversations || []
      setConversations(convs)
      
      // Select the first conversation if available
      if (convs.length > 0 && !currentConversation) {
        selectConversation(convs[0])
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  const createNewConversation = async () => {
    try {
      const response = await axios.post('/api/chat/conversations', {
        title: 'New Chat',
        model: currentModel || 'openai/gpt-oss-120b',  // Default to ChatGPT OSS 120B
        max_tokens: 8192  // Increased for better deep research
      })
      const newConversation = response.data.conversation
      setConversations(prev => [newConversation, ...(prev || [])])
      setCurrentConversation(newConversation)
      setCurrentModel('openai/gpt-oss-120b')  // Ensure default model is set
      setMessages([])
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  const selectConversation = async (conversation: any) => {
    setCurrentConversation(conversation)
    setCurrentModel(conversation.model || 'openai/gpt-oss-120b')
    setMessagesLoading(true)
    try {
      const response = await axios.get(`/api/chat/conversations/${conversation.id}/messages`)
      setMessages(response.data.messages || [])
      if (socket) {
        socket.emit('conversation:join', { conversationId: conversation.id })
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setMessagesLoading(false)
    }
  }

  // Auto-detect if web search should be enabled
  const shouldEnableWebSearch = (query: string): boolean => {
    const searchKeywords = [
      'search', 'find', 'look up', 'what is', 'who is', 'when is', 'where is', 
      'how to', 'latest', 'news', 'current', 'today', 'recent', 'update',
      'price', 'cost', 'weather', 'definition', 'explain', 'information about',
      'tell me about', 'show me', 'google', 'check', 'verify'
    ]
    
    const lowerQuery = query.toLowerCase()
    return searchKeywords.some(keyword => lowerQuery.includes(keyword)) || query.includes('?')
  }

  const handleTrialSendMessage = async (content: string, attachments?: any[], options?: { webSearch?: boolean; deepResearch?: boolean }) => {
    if (!content.trim() || isStreaming) return

    const webSearchEnabled = options?.webSearch || shouldEnableWebSearch(content)

    // Check message limit
    if (trialMessageCount >= TRIAL_MESSAGE_LIMIT - 1) {
      // This will be their last message
      const userMessage: TrialMessage = {
        id: Date.now().toString(),
        content,
        role: 'user',
        timestamp: new Date()
      }
      
      setTrialMessages(prev => [...prev, userMessage])
      setTrialMessageCount(prev => prev + 1)
      
      // Show limit reached modal
      setTimeout(() => {
        setShowTrialLimitModal(true)
      }, 1000)
      
      return
    }

    // Convert attachments to base64 for storage
    const messageAttachments = await Promise.all(
      (attachments || []).map(async (att) => {
        const base64 = await fileToBase64(att.file)
        return {
          id: att.id,
          name: att.file.name,
          type: att.type,
          size: att.file.size,
          data: base64
        }
      })
    )

    // Add user message with metadata
    const userMessage: TrialMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
      metadata: webSearchEnabled ? { webSearch: true } : undefined
    }
    
    setTrialMessages(prev => [...prev, userMessage])
    setTrialMessageCount(prev => prev + 1)
    setIsStreaming(true)
    setStreamingMessage('')

    // Add search progress message if web search is enabled
    let searchMessageId: string | null = null
    if (webSearchEnabled) {
      const searchMessage: TrialMessage = {
        id: `search-${Date.now()}`,
        content: '🔍 Searching the web...',
        role: 'system',
        timestamp: new Date(),
        metadata: { isSearchProgress: true }
      }
      searchMessageId = searchMessage.id
      setTrialMessages(prev => [...prev, searchMessage])
    }

    try {
      // Make API call to get response
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/chat/trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          history: trialMessages.filter(msg => msg.role !== 'system').map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          attachments: messageAttachments,
          webSearch: webSearchEnabled
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''
      let fullThinking = ''
      let hasThinkingContent = false

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.thinking) {
                  // Handle thinking content
                  if (!hasThinkingContent) {
                    hasThinkingContent = true
                    setIsTrialThinking(true)
                    setTrialThinkingContent('')
                  }
                  fullThinking += data.thinking
                  setTrialThinkingContent(fullThinking)
                } else if (data.content) {
                  // Handle regular content
                  fullResponse += data.content
                  setStreamingMessage(fullResponse)
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      // End thinking state if we had thinking content
      if (hasThinkingContent) {
        setIsTrialThinking(false)
        // Keep thinking content visible for user to review
      }

      // Update search message if it exists
      if (searchMessageId && webSearchEnabled) {
        setTrialMessages(prev => prev.map(msg => 
          msg.id === searchMessageId 
            ? { ...msg, content: '✅ Web search completed!' }
            : msg
        ))
      }

      // Add assistant message
      const assistantMessage: TrialMessage = {
        id: (Date.now() + 1).toString(),
        content: fullResponse || "I'm here to help! Feel free to ask me anything.",
        role: 'assistant',
        timestamp: new Date()
      }
      
      setTrialMessages(prev => [...prev, assistantMessage])
      setStreamingMessage('')
      
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Add error message
      const errorMessage: TrialMessage = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I encountered an error. Please try again or sign up for a full account for a better experience.",
        role: 'assistant',
        timestamp: new Date()
      }
      
      setTrialMessages(prev => [...prev, errorMessage])
      setStreamingMessage('')
    } finally {
      setIsStreaming(false)
    }
  }

  const handleSendMessage = async (attachments?: any[], options?: { webSearch?: boolean; deepResearch?: boolean; thinking?: boolean; style?: any }) => {
    // Handle trial mode
    if (isTrialMode) {
      return handleTrialSendMessage(inputMessage, attachments, { 
        webSearch: options?.webSearch,
        deepResearch: options?.deepResearch 
      })
    }

    // Normal authenticated flow
    if (!inputMessage.trim() || !currentConversation || isStreaming) return

    // Check usage limits for authenticated users
    const messageType = options?.deepResearch ? 'deepResearch' : 
                       options?.webSearch ? 'webSearch' : 'normal'
    
    if (!checkUsageLimits(messageType)) {
      return // Modal will be shown by checkUsageLimits
    }

    // Prepare the message data
    const messageData: any = {
      conversationId: currentConversation.id,
      content: inputMessage.trim(),
      userId: user?.id
    }

    // Add options if provided
    if (options?.webSearch) {
      messageData.webSearch = true
    }
    if (options?.deepResearch) {
      messageData.deepResearch = true
    }
    if (options?.thinking) {
      messageData.thinking = true
    }
    if (options?.style) {
      messageData.style = options.style
    }

    // Handle attachments if provided
    if (attachments && attachments.length > 0) {
      // Convert attachments to the format expected by backend
      const processedAttachments = await Promise.all(
        attachments.map(async (att) => {
          const base64 = await fileToBase64(att.file)
          return {
            name: att.file.name,
            type: att.type === 'image' ? 'image' : 'document',
            mimeType: att.file.type,
            size: att.file.size,
            data: base64
          }
        })
      )
      messageData.attachments = processedAttachments
    }

    // Include user's API key if they're using it
    if (activeKey === 'user' && userApiKey) {
      messageData.userApiKey = userApiKey
      messageData.useUserKey = true
    } else {
      messageData.useNovitaKey = true
    }

    if (socket) {
      socket.emit('chat:stream', messageData)
      
      // Update usage after sending message (only if using Novita platform key)
      if (activeKey === 'novita') {
        updateUsageAfterMessage(messageType)
      }
    }
  }

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        // Remove the data URL prefix to get just the base64 string
        const base64Data = base64.split(',')[1]
        resolve(base64Data)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const handleModelChange = async (modelId: string, model: any) => {
    setCurrentModel(modelId)
    setModelCapabilities(model.capabilities || [])
    
    // Update the current conversation with the new model
    if (currentConversation) {
      try {
        await axios.put(`/api/chat/conversations/${currentConversation.id}`, {
          model: modelId
        })
        // Update local state
        setCurrentConversation((prev: any) => ({ ...prev, model: modelId }))
      } catch (error) {
        console.error('Failed to update conversation model:', error)
      }
    }
  }

  if (authLoading && !isTrialMode) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Trial mode UI
  if (isTrialMode) {
    const remainingMessages = TRIAL_MESSAGE_LIMIT - trialMessageCount

    return (
      <div className="flex h-screen bg-[var(--nova-bg-primary)]">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-[var(--nova-border-primary)] bg-[var(--nova-bg-secondary)] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link 
                  href="/" 
                  className="text-xl font-bold nova-text-gradient"
                >
                  Nova
                </Link>
                <div className="flex items-center gap-2">
                  <span className="nova-badge-primary text-xs">
                    Free Trial
                  </span>
                  <span className="text-sm nova-text-muted">
                    {remainingMessages} {remainingMessages === 1 ? 'message' : 'messages'} remaining
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {remainingMessages <= 3 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--nova-warning)]/10 text-[var(--nova-warning)]">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {remainingMessages} {remainingMessages === 1 ? 'message' : 'messages'} left
                    </span>
                  </div>
                )}
                
                <Link 
                  href="/register?preserveTrial=true" 
                  className="nova-button-primary px-4 py-2 text-sm"
                >
                  Sign Up to Continue
                </Link>
              </div>
            </div>
          </div>

          {/* Thinking Display for Trial Mode */}
          {trialThinkingContent && (
            <div className="border-b border-[var(--nova-border-primary)] bg-[var(--nova-bg-secondary)]/50 backdrop-blur-xl">
              <ThinkingDisplay 
                content={trialThinkingContent}
                isActive={isTrialThinking}
              />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-4">
              {/* Usage Indicator for Trial */}
              <UsageIndicator
                isTrialMode={true}
                trialMessageCount={trialMessageCount}
              />
              
              {trialMessages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--nova-primary)]/10 mb-4">
                      <MessageSquare className="h-8 w-8 text-[var(--nova-primary)]" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Welcome to Nova Trial Chat!</h2>
                    <p className="nova-text-muted max-w-md mx-auto">
                      You have {TRIAL_MESSAGE_LIMIT} free messages to experience Nova's capabilities. 
                      Ask me anything to get started!
                    </p>
                  </div>
                </div>
              )}
              
              {trialMessages.length > 0 && (
                <MessageList
                  messages={trialMessages.map(msg => ({
                    ...msg,
                    created_at: msg.timestamp.toISOString()
                  }))}
                  streamingMessage={streamingMessage}
                  isStreaming={isStreaming}
                  loading={false}
                />
              )}
            </div>
          </div>

          {/* Input */}
          <div className="px-4">
            <ChatInput
              value={inputMessage}
              onChange={setInputMessage}
              onSend={(attachments, options) => {
                if (inputMessage.trim()) {
                  handleSendMessage(attachments, options)
                  setInputMessage('')
                }
              }}
              isStreaming={isStreaming || trialMessageCount >= TRIAL_MESSAGE_LIMIT}
              disabled={isStreaming || trialMessageCount >= TRIAL_MESSAGE_LIMIT}
              currentModel="openai/gpt-oss-120b"
              onModelChange={() => {}}
              modelCapabilities={['chat']}
              placeholder={
                trialMessageCount >= TRIAL_MESSAGE_LIMIT
                  ? "Trial limit reached. Sign up to continue..."
                  : "Type your message..."
              }
              isTrialMode={true}
            />
            <ChatFooter />
          </div>
        </div>

        {/* Deep Research Modal */}
        {showDeepResearchModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="nova-card max-w-md w-full p-6 relative">
              <button
                onClick={() => setShowDeepResearchModal(false)}
                className="absolute top-4 right-4 p-1 rounded hover:bg-[var(--nova-bg-tertiary)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--nova-primary)]/10 mb-4">
                  <MessageSquare className="h-8 w-8 text-[var(--nova-primary)]" />
                </div>
                
                <h3 className="text-xl font-semibold mb-2">Deep Research Available for Members</h3>
                <p className="nova-text-muted mb-6">
                  Unlock advanced research capabilities that analyze multiple sources, 
                  cross-reference information, and provide comprehensive insights with citations.
                </p>
                
                <div className="space-y-3 text-left mb-6">
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-[var(--nova-accent)] mt-2 flex-shrink-0" />
                    <p className="text-sm">Multi-source analysis for comprehensive answers</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-[var(--nova-accent)] mt-2 flex-shrink-0" />
                    <p className="text-sm">Academic-quality research with proper citations</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-[var(--nova-accent)] mt-2 flex-shrink-0" />
                    <p className="text-sm">Real-time data synthesis from trusted sources</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeepResearchModal(false)}
                    className="flex-1 nova-button-ghost px-4 py-2"
                  >
                    Continue Trial
                  </button>
                  <Link
                    href="/register?feature=deep-research"
                    className="flex-1 nova-button-primary px-4 py-2 text-center"
                  >
                    Sign Up Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trial Limit Modal */}
        <TrialLimitModal
          isOpen={showTrialLimitModal}
          onClose={() => setShowTrialLimitModal(false)}
          messageCount={trialMessageCount}
        />

        {/* API Key Modal */}
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => setShowApiKeyModal(false)}
          onSave={(apiKey) => {
            setUserApiKey(apiKey)
            setShowApiKeyModal(false)
            // Reload usage to reflect API key status
            loadDailyUsage()
          }}
          currentKey={userApiKey || ''}
          reason={apiKeyModalReason}
          limitType={apiKeyLimitType}
        />
      </div>
    )
  }

  // Normal authenticated UI
  return (
      <div className="flex h-screen bg-[var(--nova-bg-primary)] text-[var(--nova-text-primary)]">
      <Sidebar
        conversations={conversations}
        currentConversation={currentConversation}
        user={user}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNewConversation={createNewConversation}
        onSelectConversation={selectConversation}
        onLogout={handleLogout}
        dailyUsage={dailyUsage}
        activeKey={activeKey}
        userApiKey={userApiKey}
        onKeyChange={handleKeySwitch}
        onAddApiKey={() => {
          setApiKeyModalReason('setup')
          setShowApiKeyModal(true)
        }}
        onRemoveApiKey={handleRemoveApiKey}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[var(--nova-bg-primary)]">
        {/* Header */}
        <div className="h-14 border-b border-[var(--nova-border-primary)] bg-[var(--nova-bg-secondary)] flex items-center justify-between px-6">
          <h2 className="font-semibold text-[var(--nova-text-primary)]">
            {currentConversation ? currentConversation.title : 'Select a conversation'}
          </h2>
          {currentConversation && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-[#3E3F4A] rounded-md transition-colors text-gray-400 hover:text-gray-200"
              title="Conversation Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Messages */}
        {currentConversation ? (
          <>
            {/* Thinking Display - Separate from messages */}
            {thinkingMessage && (
              <div className="border-b border-[var(--nova-border-primary)] bg-[var(--nova-bg-secondary)]/50 backdrop-blur-xl">
                <ThinkingDisplay 
                  content={thinkingMessage.content}
                  isActive={thinkingMessage.isThinking}
                />
              </div>
            )}
            
            <MessageList
              messages={messages.filter(msg => !msg.metadata?.isThinking)}
              streamingMessage={streamingMessage}
              isStreaming={isStreaming}
              loading={messagesLoading}
            />
            <div className="px-4">
              {/* Active Key Indicator */}
              {user && (
                <div className="flex items-center justify-between mb-2 px-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${activeKey === 'user' ? 'bg-green-400' : 'bg-blue-400'}`} />
                    <span className="text-gray-600 dark:text-white/60">
                      Using: {activeKey === 'user' ? 'Your API Key' : 'Nova Platform Key'}
                    </span>
                    {activeKey === 'novita' && dailyUsage && (
                      <span className="text-gray-500 dark:text-white/40">
                        ({dailyUsage.maxTotal - dailyUsage.totalQueries} queries left)
                      </span>
                    )}
                  </div>
                </div>
              )}
              <ChatInput
                value={inputMessage}
                onChange={setInputMessage}
                onSend={(attachments, options) => {
                  if (inputMessage.trim()) {
                    handleSendMessage(attachments, options)
                    setInputMessage('')
                  }
                }}
                isStreaming={isStreaming}
                currentModel={currentModel}
                onModelChange={handleModelChange}
                modelCapabilities={modelCapabilities}
                placeholder={thinkingMessage && thinkingMessage.isThinking ? "Nova is thinking..." : undefined}
              />
              <ChatFooter />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium text-[var(--nova-text-primary)]">Welcome to Nova</h3>
              <p className="text-sm text-[var(--nova-text-tertiary)]">
                Create a new chat or select an existing conversation to get started
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <ConversationSettings
        conversation={currentConversation}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onUpdate={(updatedConversation) => {
          setCurrentConversation(updatedConversation)
          setConversations(prev => 
            prev.map(conv => 
              conv.id === updatedConversation.id ? updatedConversation : conv
            )
          )
        }}
      />

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={(apiKey) => {
          setUserApiKey(apiKey)
          setShowApiKeyModal(false)
          // Reload usage to reflect API key status
          loadDailyUsage()
        }}
        currentKey={userApiKey || ''}
        reason={apiKeyModalReason}
        limitType={apiKeyLimitType}
      />
    </div>
  )
}
