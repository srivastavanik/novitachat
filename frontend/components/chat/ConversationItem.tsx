import React from 'react'
import { format } from 'date-fns'
import { MessageCircle } from 'lucide-react'

interface ConversationItemProps {
  conversation: {
    id: string
    title: string
    updated_at: string
  }
  isActive: boolean
  onClick: () => void
}

export default function ConversationItem({ 
  conversation, 
  isActive, 
  onClick 
}: ConversationItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50'
      }`}
    >
      <div className="flex items-start gap-2">
        <MessageCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{conversation.title}</div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(conversation.updated_at), 'MMM d, h:mm a')}
          </div>
        </div>
      </div>
    </button>
  )
}
