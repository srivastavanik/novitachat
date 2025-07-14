import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { format } from 'date-fns'
import { User, Bot } from 'lucide-react'

interface MessageProps {
  message: {
    id: string
    content: string
    sender_type: 'user' | 'assistant'
    created_at: string
    user?: {
      username: string
    }
  }
  isStreaming?: boolean
}

export default function Message({ message, isStreaming = false }: MessageProps) {
  const isUser = message.sender_type === 'user'

  return (
    <div className={`flex gap-3 p-4 ${isUser ? 'bg-background' : 'bg-muted/50'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary/10' : 'bg-secondary/10'
      }`}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isUser ? message.user?.username || 'You' : 'Nova AI'}
          </span>
          {!isStreaming && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.created_at), 'h:mm a')}
            </span>
          )}
        </div>
        
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  )
}
