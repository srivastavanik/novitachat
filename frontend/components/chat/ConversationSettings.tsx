import React, { useState, useEffect } from 'react'
import axios from 'axios'

interface ConversationSettingsProps {
  conversation: any
  isOpen: boolean
  onClose: () => void
  onUpdate: (updates: any) => void
}

export default function ConversationSettings({
  conversation,
  isOpen,
  onClose,
  onUpdate
}: ConversationSettingsProps) {
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(2048)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (conversation) {
      setTemperature(conversation.temperature || 0.7)
      setMaxTokens(conversation.max_tokens || 2048)
      setSystemPrompt(conversation.system_prompt || '')
      setTitle(conversation.title || '')
    }
  }, [conversation])

  const handleSave = async () => {
    if (!conversation) return

    setIsSaving(true)
    try {
      const response = await axios.put(`/api/chat/conversations/${conversation.id}`, {
        title,
        temperature,
        max_tokens: maxTokens,
        system_prompt: systemPrompt || null
      })
      
      onUpdate(response.data)
      onClose()
    } catch (error) {
      console.error('Failed to update conversation settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[var(--nova-bg-primary)] border border-[var(--nova-border-primary)] rounded-xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-[var(--nova-border-primary)]">
          <h2 className="text-lg font-semibold text-[var(--nova-text-primary)]">Conversation Settings</h2>
          <button
            onClick={onClose}
            className="text-[var(--nova-text-secondary)] hover:text-[var(--nova-text-primary)] transition-colors p-1 hover:bg-[var(--nova-bg-secondary)] rounded-lg"
          >
            Close
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--nova-text-primary)]">
              Conversation Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--nova-bg-secondary)] border border-[var(--nova-border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nova-primary)] focus:border-transparent text-[var(--nova-text-primary)] placeholder-[var(--nova-text-tertiary)]"
              placeholder="Enter conversation title"
            />
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--nova-text-primary)]">
              Temperature: {temperature.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full nova-slider"
            />
            <div className="flex justify-between text-xs text-[var(--nova-text-tertiary)] mt-1">
              <span>Focused (0)</span>
              <span>Balanced (1)</span>
              <span>Creative (2)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--nova-text-primary)]">
              Max Tokens: {maxTokens}
            </label>
            <input
              type="range"
              min="100"
              max="4096"
              step="100"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full nova-slider"
            />
            <div className="flex justify-between text-xs text-[var(--nova-text-tertiary)] mt-1">
              <span>100</span>
              <span>2048</span>
              <span>4096</span>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--nova-text-primary)]">
              System Prompt (Optional)
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--nova-bg-secondary)] border border-[var(--nova-border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nova-primary)] focus:border-transparent resize-none text-[var(--nova-text-primary)] placeholder-[var(--nova-text-tertiary)]"
              rows={4}
              placeholder="Enter a system prompt to guide the AI's behavior..."
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-[var(--nova-border-primary)]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-[var(--nova-border-primary)] rounded-lg hover:bg-[var(--nova-bg-secondary)] transition-colors text-[var(--nova-text-primary)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-[var(--nova-primary)] text-[var(--nova-text-inverse)] rounded-lg hover:bg-[var(--nova-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
