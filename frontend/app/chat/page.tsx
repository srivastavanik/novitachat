'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { io, Socket } from 'socket.io-client'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import Sidebar from '@/components/chat/Sidebar'
import MessageList from '@/components/chat/MessageList'
import ChatInput from '@/components/chat/ChatInput'

export default function ChatPage() {
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [currentConversation, setCurrentConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // Initialize WebSocket connection
  useEffect(() => {
    if (user) {
      const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('access_token')
        }
      })

      socketInstance.on('connect', () => {
        console.log('Connected to WebSocket')
      })

      socketInstance.on('user_message_saved', (data) => {
        setMessages(prev => [...prev, data.message])
      })

      socketInstance.on('stream_start', () => {
        setIsStreaming(true)
        setStreamingMessage('')
      })

      socketInstance.on('stream_chunk', (data) => {
        setStreamingMessage(prev => prev + data.chunk)
      })

      socketInstance.on('stream_complete', (data) => {
        setIsStreaming(false)
        setMessages(prev => [...prev, data.message])
        setStreamingMessage('')
      })

      socketInstance.on('stream_error', (data) => {
        setIsStreaming(false)
        console.error('Stream error:', data.error)
        setStreamingMessage('')
      })

      setSocket(socketInstance)

      return () => {
        socketInstance.disconnect()
      }
    }
  }, [user])

  // Load conversations
  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  const loadConversations = async () => {
    try {
      const response = await axios.get('/api/chat/conversations')
      setConversations(response.data.conversations)
      
      // Select the first conversation if available
      if (response.data.conversations.length > 0 && !currentConversation) {
        selectConversation(response.data.conversations[0])
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  const createNewConversation = async () => {
    try {
      const response = await axios.post('/api/chat/conversations', {
        title: 'New Chat'
      })
      setConversations(prev => [response.data.conversation, ...prev])
      setCurrentConversation(response.data.conversation)
      setMessages([])
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  const selectConversation = async (conversation: any) => {
    setCurrentConversation(conversation)
    setMessagesLoading(true)
    try {
      const response = await axios.get(`/api/chat/conversations/${conversation.id}/messages`)
      setMessages(response.data.messages)
      if (socket) {
        socket.emit('conversation:join', { conversationId: conversation.id })
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setMessagesLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentConversation || isStreaming) return

    const message = inputMessage.trim()
    setInputMessage('')

    if (socket) {
      socket.emit('chat:stream', {
        conversationId: currentConversation.id,
        content: message
      })
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        conversations={conversations}
        currentConversation={currentConversation}
        user={user}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNewConversation={createNewConversation}
        onSelectConversation={selectConversation}
        onLogout={handleLogout}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b flex items-center px-4">
          <h2 className="font-semibold">
            {currentConversation ? currentConversation.title : 'Select a conversation'}
          </h2>
        </div>

        {/* Messages */}
        {currentConversation ? (
          <>
            <MessageList
              messages={messages}
              streamingMessage={streamingMessage}
              isStreaming={isStreaming}
              loading={messagesLoading}
            />
            <ChatInput
              value={inputMessage}
              onChange={setInputMessage}
              onSend={sendMessage}
              isStreaming={isStreaming}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium">Welcome to Nova</h3>
              <p className="text-sm text-muted-foreground">
                Create a new chat or select an existing conversation to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
