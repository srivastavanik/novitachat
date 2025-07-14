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
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-background border md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar */}
      <div className={`${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed md:relative md:translate-x-0 z-40 w-64 h-full bg-muted/50 border-r transition-transform duration-300 flex flex-col`}>
        
        {/* New Chat Button */}
        <div className="p-4 border-b">
          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>
        
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={currentConversation?.id === conv.id}
                onClick={() => onSelectConversation(conv)}
              />
            ))}
          </div>
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{user?.username}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 z-30 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  )
}
