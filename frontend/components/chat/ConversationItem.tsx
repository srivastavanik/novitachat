import React from 'react'
import { format } from 'date-fns'

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
      className={`w-full text-left px-3 py-2 rounded-xl transition-all ${
        isActive
          ? 'bg-[#00FF7F] hover:bg-[#00D96A]'
          : 'hover:bg-[var(--nova-bg-hover)] text-[var(--nova-text-secondary)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className={`text-[11px] font-medium truncate ${isActive ? 'text-black' : 'text-[var(--nova-text-primary)]'}`}>
            {conversation.title}
          </div>
        </div>
        <div className={`text-[10px] flex-shrink-0 ${isActive ? 'text-black/70' : 'text-[var(--nova-text-tertiary)]'}`}>
          {format(new Date(conversation.updated_at), 'h:mm a')}
        </div>
      </div>
    </button>
  )
}
