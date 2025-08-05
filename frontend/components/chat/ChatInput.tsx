import React, { useRef, useEffect, useState } from 'react'
import ModelSelector from './ModelSelector'
import StyleSelector from './StyleSelector'

interface Attachment {
  id: string
  file: File
  type: 'image' | 'document'
  preview?: string
}

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (attachments?: Attachment[], options?: { webSearch?: boolean; deepResearch?: boolean; thinking?: boolean }) => void
  isStreaming: boolean
  disabled?: boolean
  currentModel?: string
  onModelChange: (modelId: string, model: any) => void
  modelCapabilities?: string[]
  placeholder?: string
  isTrialMode?: boolean
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  isStreaming,
  disabled = false,
  currentModel,
  onModelChange,
  modelCapabilities = [],
  placeholder,
  isTrialMode = false
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false)
  const [thinkingEnabled, setThinkingEnabled] = useState(false)
  const [currentStyle, setCurrentStyle] = useState<any>(null)
  
  // Check if current model supports thinking (based on Novita AI models)
  const supportsThinking = currentModel?.includes('thinking') || 
                          currentModel?.includes('deepseek-r1') || 
                          currentModel?.includes('deepseek-v3') ||
                          currentModel?.includes('glm-4.1v-9b-thinking') ||
                          currentModel?.includes('qwen3-235b-a22b-thinking') ||
                          currentModel?.includes('qwen-2.5-72b-instruct-thinking') ||
                          currentModel?.includes('reflection') ||
                          currentModel?.includes('reasoning') ||
                          false

  // Much stricter web search auto-detection - only for clearly search-oriented queries
  const shouldEnableWebSearch = (query: string): boolean => {
    const strictSearchKeywords = [
      'search for', 'google', 'find me', 'look up', 'current price of', 'latest news about',
      'weather in', 'today\'s weather', 'stock price', 'breaking news', 'recent events',
      'what happened', 'current status of', 'real-time', 'live updates', 'browse',
      'search the web', 'check online', 'verify online', 'current information'
    ]
    
    const timeRelatedQueries = [
      'today', 'yesterday', 'this week', 'this month', 'this year', '2024', '2025',
      'current', 'latest', 'recent', 'now', 'right now'
    ]
    
    const lowerQuery = query.toLowerCase().trim()
    
    // Check for strict search keywords
    if (strictSearchKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return true
    }
    
    // Check for time-related queries combined with factual requests
    const hasTimeReference = timeRelatedQueries.some(time => lowerQuery.includes(time))
    const isFactualQuery = lowerQuery.startsWith('what') || lowerQuery.startsWith('who') || 
                          lowerQuery.startsWith('when') || lowerQuery.startsWith('where') ||
                          lowerQuery.includes('price') || lowerQuery.includes('cost')
    
    return hasTimeReference && isFactualQuery && lowerQuery.length > 20
  }

  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [manualWebSearchOverride, setManualWebSearchOverride] = useState(false)
  
  // Update web search state when query changes
  useEffect(() => {
    if (!manualWebSearchOverride) {
      setWebSearchEnabled(shouldEnableWebSearch(value))
    }
  }, [value, manualWebSearchOverride])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && !isStreaming && value.trim()) {
        handleSubmit()
      }
    }
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!disabled && !isStreaming && value.trim()) {
      onSend(attachments, { 
        webSearch: webSearchEnabled || manualWebSearchOverride, 
        deepResearch: deepResearchEnabled,
        thinking: supportsThinking && thinkingEnabled
      })
      setAttachments([])
      setDeepResearchEnabled(false)
      setManualWebSearchOverride(false)
      // Keep thinking enabled for future queries
    }
  }

  const handleFileSelect = async (files: FileList | null, type: 'image' | 'document') => {
    if (!files) return

    const newAttachments: Attachment[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const attachment: Attachment = {
        id: `${Date.now()}-${i}`,
        file,
        type
      }

      // Generate preview for images
      if (type === 'image' && file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const preview = e.target?.result as string
          setAttachments(prev => prev.map(a => 
            a.id === attachment.id ? { ...a, preview } : a
          ))
        }
        reader.readAsDataURL(file)
      }

      newAttachments.push(attachment)
    }

    setAttachments(prev => [...prev, ...newAttachments])
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-[var(--nova-border-primary)] bg-[var(--nova-bg-secondary)] p-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-3 flex items-center justify-between">
          {!isTrialMode ? (
            <div className="flex items-center gap-3">
              <ModelSelector
                currentModel={currentModel}
                onModelChange={onModelChange}
                hasAttachments={attachments.length > 0}
                attachmentTypes={attachments.map(att => att.type)}
              />
              <StyleSelector 
                onStyleChange={setCurrentStyle}
              />
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            {/* Thinking Toggle (only for supported models) - moved to left */}
            {supportsThinking && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--nova-text-tertiary)]">Thinking</span>
                <button
                  type="button"
                  onClick={() => setThinkingEnabled(!thinkingEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--nova-primary)] focus:ring-offset-2 focus:ring-offset-[var(--nova-bg-secondary)] ${
                    thinkingEnabled ? 'bg-gradient-to-r from-[var(--nova-primary)] to-[var(--nova-primary-dark)]' : 'bg-[var(--nova-bg-tertiary)]'
                  }`}
                  title="Toggle thinking mode for reasoning-enabled models"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      thinkingEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Web Search Button */}
            <button
              type="button"
              onClick={() => {
                setManualWebSearchOverride(!manualWebSearchOverride)
                if (!manualWebSearchOverride) {
                  setWebSearchEnabled(true)
                } else {
                  setWebSearchEnabled(shouldEnableWebSearch(value))
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                (webSearchEnabled || manualWebSearchOverride) 
                  ? 'bg-[#00BFFF] text-white shadow-lg shadow-[#00BFFF]/25' 
                  : 'bg-[var(--nova-bg-tertiary)] hover:bg-[var(--nova-bg-hover)] text-[var(--nova-text-secondary)]'
              }`}
              title="Toggle web search"
            >
              <img src="/web-search-icon.png" alt="Web Search" className="h-4 w-4 object-contain" />
              <span>Web Search</span>
            </button>

            {/* Deep Research Button */}
            <button
              type="button"
              onClick={() => setDeepResearchEnabled(!deepResearchEnabled)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                deepResearchEnabled 
                  ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/25' 
                  : 'bg-[var(--nova-bg-tertiary)] hover:bg-[var(--nova-bg-hover)] text-[var(--nova-text-secondary)]'
              }`}
              title="Enable deep research"
            >
              <img src="/Daco_4819829.png" alt="Deep Research" className="h-4 w-4 object-contain" />
              <span>Deep Research</span>
            </button>
          </div>
        </div>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group"
              >
                {attachment.type === 'image' && attachment.preview ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#565869]">
                    <img
                      src={attachment.preview}
                      alt={attachment.file.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#565869]/50 border border-[#565869]">
                    <div className="text-sm">
                      <div className="font-medium truncate max-w-[150px] text-gray-200">
                        {attachment.file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(attachment.file.size)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="p-1 rounded-full hover:bg-[#444654] transition-colors text-gray-400"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Active Options Indicator */}
        {((webSearchEnabled || manualWebSearchOverride) || deepResearchEnabled || thinkingEnabled) && (
          <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
            <span>Active:</span>
            {(webSearchEnabled || manualWebSearchOverride) && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#00BFFF]/20 text-[#00BFFF] border border-[#00BFFF]/30">
                Web Search {manualWebSearchOverride && '(Manual)'}
                <button
                  type="button"
                  onClick={() => {
                    setWebSearchEnabled(false)
                    setManualWebSearchOverride(false)
                  }}
                  className="ml-1 p-0.5 hover:bg-[#00BFFF]/30 rounded-full transition-colors text-xs"
                  title="Disable web search"
                >
                  ×
                </button>
              </span>
            )}
            {deepResearchEnabled && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#00FF7F]/20 text-[#00FF7F] border border-[#00FF7F]/30">
                Deep Research
                <button
                  type="button"
                  onClick={() => setDeepResearchEnabled(false)}
                  className="ml-1 p-0.5 hover:bg-[#00FF7F]/30 rounded-full transition-colors text-xs"
                  title="Disable deep research"
                >
                  ×
                </button>
              </span>
            )}
            {thinkingEnabled && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#00FF7F]/20 text-[#00FF7F] border border-[#00FF7F]/30">
                Thinking Mode
                <button
                  type="button"
                  onClick={() => setThinkingEnabled(false)}
                  className="ml-1 p-0.5 hover:bg-[#00FF7F]/30 rounded-full transition-colors text-xs"
                  title="Disable thinking mode"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        <div className="relative flex items-end gap-3">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files, 'document')}
            accept=".pdf,.doc,.docx,.txt,.md,.csv,.json"
            multiple
          />
          <input
            ref={imageInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files, 'image')}
            accept="image/*"
            multiple
          />
          
          {/* Attachment buttons */}
          <div className="flex items-center gap-1 mb-[1px]">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              className="p-2 rounded-lg hover:bg-[var(--nova-bg-hover)] transition-colors text-[var(--nova-text-tertiary)] hover:text-[var(--nova-text-secondary)]"
              title="Attach files"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                imageInputRef.current?.click()
              }}
              className="p-2 rounded-lg hover:bg-[var(--nova-bg-hover)] transition-colors text-[var(--nova-text-tertiary)] hover:text-[var(--nova-text-secondary)]"
              title="Attach images"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                placeholder ||
                (deepResearchEnabled 
                  ? "Ask a question for deep research..." 
                  : webSearchEnabled
                  ? "Ask a question to search the web..."
                  : "Type your message...")
              }
              disabled={disabled || isStreaming}
              rows={1}
              className="w-full resize-none rounded-2xl border border-[var(--nova-border-primary)] bg-[var(--nova-bg-tertiary)] px-4 py-3 text-sm text-[var(--nova-text-primary)] placeholder:text-[var(--nova-text-tertiary)] focus:outline-none focus:border-[var(--nova-primary)]/50 focus:ring-1 focus:ring-[var(--nova-primary)]/50 disabled:cursor-not-allowed disabled:opacity-50 max-h-32 overflow-y-auto transition-all"
              style={{ minHeight: '48px' }}
            />
          </div>
          <div className="flex-shrink-0 mb-[1px]">
            <button
              type="submit"
              disabled={disabled || isStreaming || !value.trim()}
              className="rounded-full bg-gradient-to-r from-[var(--nova-primary)] to-[var(--nova-primary-dark)] p-3 text-[var(--nova-text-inverse)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--nova-primary)]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center h-[46px] w-[46px]"
            >
              {isStreaming ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19l7-7-7-7" />
                  <path d="M5 12h14" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {isStreaming && (
          <p className="mt-2 text-xs text-[var(--nova-text-tertiary)] text-center">
            Nova is thinking...
          </p>
        )}
      </div>
    </form>
  )
}
