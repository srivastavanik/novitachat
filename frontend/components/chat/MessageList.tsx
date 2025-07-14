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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        
        {streamingMessage && (
          <Message
            message={{
              id: 'streaming',
              content: streamingMessage,
              sender_type: 'assistant',
              created_at: new Date().toISOString()
            }}
            isStreaming={isStreaming}
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
