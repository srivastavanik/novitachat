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
      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
        isActive
          ? 'bg-gradient-to-r from-[#00FF7F]/20 to-[#00D96A]/20 text-white border border-[#00FF7F]/50'
          : 'hover:bg-white/10 hover:border hover:border-white/10 text-white/80'
      }`}
    >
      <div className="flex items-start gap-2">
        <MessageCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-[#00FF7F]' : 'text-white/60'}`} />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{conversation.title}</div>
          <div className={`text-xs ${isActive ? 'text-white/80' : 'text-white/40'}`}>
            {format(new Date(conversation.updated_at), 'MMM d, h:mm a')}
          </div>
        </div>
      </div>
    </button>
  )
}
