import React, { useRef, useEffect } from 'react'
import Message from './Message'
import { Loader2 } from 'lucide-react'

interface MessageListProps {
  messages: any[]
  streamingMessage: string
  isStreaming: boolean
  loading?: boolean
}

export default function MessageList({
  messages,
  streamingMessage,
  isStreaming,
  loading = false
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const userHasScrolled = useRef(false)
  const lastScrollTop = useRef(0)

  // Track if user has manually scrolled up
  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5
    
    // If user scrolled up from bottom, mark as user scrolled
    if (scrollTop < lastScrollTop.current && !isAtBottom) {
      userHasScrolled.current = true
    }
    
    // If user scrolled back to bottom, allow auto-scroll again
    if (isAtBottom) {
      userHasScrolled.current = false
    }
    
    lastScrollTop.current = scrollTop
  }

  // Only auto-scroll if user hasn't manually scrolled up
  useEffect(() => {
    if (!userHasScrolled.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingMessage])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (messages.length === 0 && !streamingMessage) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium">No messages yet</h3>
          <p className="text-sm text-muted-foreground">
            Start a conversation by typing a message below
          </p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden"
      onScroll={handleScroll}
      style={{ scrollBehavior: 'auto' }} // Prevent conflicts with smooth scrolling
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        {messages.map((message) => (
          <Message 
            key={message.id} 
            message={message} 
            isStreaming={isStreaming && message.metadata?.streaming === true}
          />
        ))}
        
        {/* Add some padding at the bottom */}
        <div className="h-4" />
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
