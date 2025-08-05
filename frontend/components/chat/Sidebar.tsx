import React from 'react'
import { Plus, Menu, LogOut, User } from 'lucide-react'
import ConversationItem from './ConversationItem'

interface SidebarProps {
  conversations: any[]
  currentConversation: any
  user: any
  isOpen: boolean
  onToggle: () => void
  onNewConversation: () => void
  onSelectConversation: (conversation: any) => void
  onLogout: () => void
}

export default function Sidebar({
  conversations,
  currentConversation,
  user,
  isOpen,
  onToggle,
  onNewConversation,
  onSelectConversation,
  onLogout
}: SidebarProps) {
  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-black/90 backdrop-blur-xl border border-white/10 md:hidden shadow-lg"
      >
        <Menu className="h-5 w-5 text-white" />
      </button>

      {/* Sidebar */}
      <div className={`${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed md:relative md:translate-x-0 z-40 w-64 h-full bg-black/80 backdrop-blur-xl border-r border-white/10 transition-transform duration-300 flex flex-col`}>
        
        {/* New Chat Button */}
        <div className="p-4 border-b border-white/10">
          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00FF7F] to-[#00D96A] text-black rounded-lg hover:opacity-90 transition-all font-medium"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>
        
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {conversations && conversations.length > 0 ? (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={currentConversation?.id === conv.id}
                  onClick={() => onSelectConversation(conv)}
                />
              ))
            ) : (
              <div className="text-center text-sm text-white/40 py-8">
                No conversations yet. Start a new chat!
              </div>
            )}
          </div>
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-[#00FF7F]/10 flex items-center justify-center">
              <User className="h-4 w-4 text-[#00FF7F]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate text-white">{user?.username}</div>
              <div className="text-xs text-white/60 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  )
}
