'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, AlertCircle, Sparkles, Paperclip, X, Search, Microscope, FileText, Image as ImageIcon } from 'lucide-react'

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

interface Attachment {
  id: string
  file: File
  type: 'image' | 'document'
  preview?: string
}

const TRIAL_MESSAGE_LIMIT = 10

export default function TrialChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<TrialMessage[]>([])
  const [messageCount, setMessageCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showDeepResearchModal, setShowDeepResearchModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const hasInitialized = useRef(false)

  // Load trial data from localStorage
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    // Load existing trial messages
    const savedMessages = localStorage.getItem('trialMessages')
    const savedCount = localStorage.getItem('trialMessageCount')
    
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages)
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })))
      } catch (e) {
        console.error('Failed to parse trial messages:', e)
      }
    }

    if (savedCount) {
      const count = parseInt(savedCount, 10)
      setMessageCount(count)
      
      // Check if trial is exhausted
      if (count >= TRIAL_MESSAGE_LIMIT) {
        router.push('/register?exhausted=true')
        return
      }
    }

    // Handle initial query from home page
    const initialQuery = searchParams.get('q')
    if (initialQuery && (!savedMessages || JSON.parse(savedMessages).length === 0)) {
      handleSendMessage(initialQuery)
    }
  }, [searchParams, router])

  // Save trial data to localStorage whenever it changes
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('trialMessages', JSON.stringify(messages))
      localStorage.setItem('trialMessageCount', messageCount.toString())
    }
  }, [messages, messageCount])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

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

  const handleFileSelect = async (files: FileList | null, type: 'image' | 'document') => {
    if (!files) return

    const newAttachments: Attachment[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const attachment: Attachment = {
        id: `${Date.now()}-${i}`,
        file,
        type,
        preview: undefined
      }

      // Generate preview for images
      if (type === 'image' && file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const preview = e.target?.result as string
          setAttachments(prev => prev.map(a => 
            a.id === attachment.id ? { ...a, preview } : a
          ))
        }
        reader.readAsDataURL(file)
      }

      newAttachments.push(attachment)
    }

    setAttachments(prev => [...prev, ...newAttachments])
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleSendMessage = async (content: string, currentAttachments: Attachment[] = []) => {
    if (!content.trim() || isLoading) return

    const webSearchEnabled = shouldEnableWebSearch(content)

    // Check message limit
    if (messageCount >= TRIAL_MESSAGE_LIMIT - 1) {
      // This will be their last message
      const userMessage: TrialMessage = {
        id: Date.now().toString(),
        content,
        role: 'user',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, userMessage])
      setMessageCount(prev => prev + 1)
      
      // Show limit reached message
      setTimeout(() => {
        const limitMessage: TrialMessage = {
          id: (Date.now() + 1).toString(),
          content: "You've reached the 10 message limit for the free trial. Please sign up to continue chatting with Nova and unlock unlimited conversations!",
          role: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, limitMessage])
        
        // Redirect to register after 3 seconds
        setTimeout(() => {
          router.push('/register?exhausted=true&preserveTrial=true')
        }, 3000)
      }, 1000)
      
      return
    }

    // Convert attachments to base64 for storage
    const messageAttachments = await Promise.all(
      currentAttachments.map(async (att) => {
        const reader = new FileReader()
        const dataPromise = new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string)
        })
        reader.readAsDataURL(att.file)
        const data = await dataPromise
        
        return {
          id: att.id,
          name: att.file.name,
          type: att.type,
          size: att.file.size,
          data: data.split(',')[1] // Remove data:image/png;base64, prefix
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
    
    setMessages(prev => [...prev, userMessage])
    setMessageCount(prev => prev + 1)
    setIsLoading(true)
    setStreamingMessage('')
    setAttachments([]) // Clear attachments after sending

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
      setMessages(prev => [...prev, searchMessage])
    }

    try {
      // Make API call to get response
      const response = await fetch('http://localhost:3001/api/chat/trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          history: messages.filter(msg => msg.role !== 'system').map(msg => ({
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
                if (data.content) {
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

      // Update search message if it exists
      if (searchMessageId && webSearchEnabled) {
        setMessages(prev => prev.map(msg => 
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
      
      setMessages(prev => [...prev, assistantMessage])
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
      
      setMessages(prev => [...prev, errorMessage])
      setStreamingMessage('')
    } finally {
      setIsLoading(false)
    }
  }

  const remainingMessages = TRIAL_MESSAGE_LIMIT - messageCount

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
                className="p-2 rounded-lg hover:bg-[var(--nova-bg-tertiary)] transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                  Nova Trial Chat
                  <span className="nova-badge-primary text-xs">
                    <Sparkles className="h-3 w-3 mr-1 inline" />
                    Free Trial
                  </span>
                </h1>
                <p className="text-sm nova-text-muted">
                  {remainingMessages} {remainingMessages === 1 ? 'message' : 'messages'} remaining
                </p>
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

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--nova-primary)]/10 mb-4">
                  <Sparkles className="h-8 w-8 text-[var(--nova-primary)]" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Welcome to Nova Trial Chat!</h2>
                <p className="nova-text-muted max-w-md mx-auto">
                  You have {TRIAL_MESSAGE_LIMIT} free messages to experience Nova's capabilities. 
                  Ask me anything to get started!
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-6 ${
                  message.role === 'system' 
                    ? 'text-center' 
                    : message.role === 'user' 
                    ? 'text-right' 
                    : 'text-left'
                }`}
              >
                {message.role === 'system' ? (
                  <div className="inline-block px-4 py-2 rounded-full bg-[var(--nova-bg-secondary)] border border-[var(--nova-border-primary)] text-sm">
                    {message.content}
                  </div>
                ) : (
                  <div
                    className={`inline-block max-w-[80%] px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-[var(--nova-primary)] text-white'
                        : 'bg-[var(--nova-bg-secondary)] border border-[var(--nova-border-primary)]'
                    }`}
                  >
                    {message.metadata?.webSearch && message.role === 'user' && (
                      <div className="flex items-center gap-1 text-xs mb-2 opacity-80">
                        <Search className="h-3 w-3" />
                        <span>Web search enabled</span>
                      </div>
                    )}
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mb-2 space-y-2">
                        {message.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center gap-2 text-sm">
                            {attachment.type === 'image' ? (
                              <ImageIcon className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            <span className="truncate">{attachment.name}</span>
                            <span className="text-xs opacity-60">
                              ({formatFileSize(attachment.size)})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-white/70' : 'nova-text-muted'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
            
            {streamingMessage && (
              <div className="mb-6 text-left">
                <div className="inline-block max-w-[80%] px-4 py-3 rounded-lg bg-[var(--nova-bg-secondary)] border border-[var(--nova-border-primary)]">
                  <p className="whitespace-pre-wrap">{streamingMessage}</p>
                  <span className="inline-block w-2 h-5 bg-[var(--nova-primary)] animate-pulse ml-1" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-[var(--nova-border-primary)] bg-[var(--nova-bg-secondary)] px-6 py-4">
          <div className="max-w-4xl mx-auto">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="relative group"
                  >
                    {attachment.type === 'image' && attachment.preview ? (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-[var(--nova-border-primary)]">
                        <img
                          src={attachment.preview}
                          alt={attachment.file.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--nova-bg-elevated)] border border-[var(--nova-border-primary)]">
                        <FileText className="h-4 w-4 text-[var(--nova-text-secondary)]" />
                        <div className="text-sm">
                          <div className="font-medium truncate max-w-[150px]">
                            {attachment.file.name}
                          </div>
                          <div className="text-xs text-[var(--nova-text-tertiary)]">
                            {formatFileSize(attachment.file.size)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="p-1 rounded-full hover:bg-[var(--nova-bg-hover)] transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <form 
              onSubmit={(e) => {
                e.preventDefault()
                const input = e.currentTarget.querySelector('textarea') as HTMLTextAreaElement
                if (input?.value.trim()) {
                  handleSendMessage(input.value, attachments)
                  input.value = ''
                }
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1 relative">
                <textarea
                  disabled={isLoading || messageCount >= TRIAL_MESSAGE_LIMIT}
                  placeholder={
                    messageCount >= TRIAL_MESSAGE_LIMIT
                      ? "Trial limit reached. Sign up to continue..."
                      : "Type your message..."
                  }
                  className="w-full resize-none rounded-lg border border-[var(--nova-border-primary)] bg-[var(--nova-bg-tertiary)] px-4 py-3 pr-24 text-sm placeholder:text-[var(--nova-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--nova-primary)] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[52px] max-h-[200px]"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      const form = e.currentTarget.closest('form')
                      form?.dispatchEvent(new Event('submit', { bubbles: true }))
                    }
                  }}
                />
                
                {/* Action buttons */}
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowDeepResearchModal(true)}
                    className="p-1.5 rounded hover:bg-[var(--nova-bg-tertiary)] transition-colors"
                    title="Deep Research (Sign up required)"
                  >
                    <Microscope className="h-4 w-4 text-[var(--nova-text-muted)]" />
                  </button>
                  
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files, 'image')}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="p-1.5 rounded hover:bg-[var(--nova-bg-tertiary)] transition-colors"
                    title="Attach images"
                  >
                    <ImageIcon className="h-4 w-4 text-[var(--nova-text-muted)]" />
                  </button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files, 'document')}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded hover:bg-[var(--nova-bg-tertiary)] transition-colors"
                    title="Attach files"
                  >
                    <Paperclip className="h-4 w-4 text-[var(--nova-text-muted)]" />
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading || messageCount >= TRIAL_MESSAGE_LIMIT}
                className="rounded-lg bg-[var(--nova-primary)] p-3 text-white hover:bg-[var(--nova-primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--nova-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
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
                <Microscope className="h-8 w-8 text-[var(--nova-primary)]" />
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
    </div>
  )
}
