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
      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
        isActive
          ? 'bg-[#00FF7F]/20 border border-[#00FF7F]/50'
          : 'hover:bg-[#565869]/50 text-gray-300'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className={`text-[11px] font-medium truncate ${isActive ? 'text-[#00FF7F]' : 'text-gray-300'}`}>
            {conversation.title}
          </div>
        </div>
        <div className={`text-[10px] flex-shrink-0 ${isActive ? 'text-[#00FF7F]/70' : 'text-gray-500'}`}>
          {format(new Date(conversation.updated_at), 'h:mm a')}
        </div>
      </div>
    </button>
  )
}
