import React, { useRef, useEffect, useState } from 'react'
import { Send, Loader2, Image, Paperclip, X, Search, FileText, FileImage, Sparkles } from 'lucide-react'
import ModelSelector from './ModelSelector'

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
  
  // Update web search state when query changes
  useEffect(() => {
    setWebSearchEnabled(shouldEnableWebSearch(value))
  }, [value])

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
        webSearch: webSearchEnabled, 
        deepResearch: deepResearchEnabled,
        thinking: supportsThinking && thinkingEnabled
      })
      setAttachments([])
      setDeepResearchEnabled(false)
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
    <form onSubmit={handleSubmit} className="border-t border-white/10 bg-black/50 backdrop-blur-xl p-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-3 flex items-center justify-between">
          {!isTrialMode ? (
        <ModelSelector
          currentModel={currentModel}
          onModelChange={onModelChange}
          hasAttachments={attachments.length > 0}
          attachmentTypes={attachments.map(att => att.type)}
        />
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            {/* Deep Research Toggle */}
            <button
              type="button"
              onClick={() => setDeepResearchEnabled(!deepResearchEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                deepResearchEnabled 
                  ? 'bg-gradient-to-r from-[#00FF7F] to-[#00D96A] text-black' 
                  : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
              }`}
              title="Enable deep research"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Deep Research</span>
            </button>

            {/* Thinking Toggle (only for supported models) */}
            {supportsThinking && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/80">Thinking</span>
                <button
                  type="button"
                  onClick={() => setThinkingEnabled(!thinkingEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black ${
                    thinkingEnabled ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED]' : 'bg-white/20'
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

            {/* Attachment Buttons */}
            {modelCapabilities.includes('image') && (
              <>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files, 'image')}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors"
                  title="Attach images"
                >
                  <Image className="h-4 w-4 text-white/60" />
                </button>
              </>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files, 'document')}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-white/5 transition-colors"
              title="Attach files"
            >
              <Paperclip className="h-4 w-4 text-white/60" />
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
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 backdrop-blur-sm">
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
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
                    <FileText className="h-4 w-4 text-white/60" />
                    <div className="text-sm">
                      <div className="font-medium truncate max-w-[150px] text-white">
                        {attachment.file.name}
                      </div>
                      <div className="text-xs text-white/40">
                        {formatFileSize(attachment.file.size)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X className="h-3 w-3 text-white/60" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Active Options Indicator */}
        {(webSearchEnabled || deepResearchEnabled || thinkingEnabled) && (
          <div className="mb-3 flex items-center gap-2 text-xs text-white/60">
            <span>Active:</span>
            {webSearchEnabled && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#00BFFF]/20 text-[#00BFFF] border border-[#00BFFF]/30">
                <Search className="h-3 w-3" />
                Web Search
                <button
                  type="button"
                  onClick={() => setWebSearchEnabled(false)}
                  className="ml-1 p-0.5 hover:bg-[#00BFFF]/30 rounded-full transition-colors"
                  title="Disable web search"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            {deepResearchEnabled && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#00FF7F]/20 text-[#00FF7F] border border-[#00FF7F]/30">
                <Sparkles className="h-3 w-3" />
                Deep Research
                <button
                  type="button"
                  onClick={() => setDeepResearchEnabled(false)}
                  className="ml-1 p-0.5 hover:bg-[#00FF7F]/30 rounded-full transition-colors"
                  title="Disable deep research"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            {thinkingEnabled && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Thinking Mode
                <button
                  type="button"
                  onClick={() => setThinkingEnabled(false)}
                  className="ml-1 p-0.5 hover:bg-purple-500/30 rounded-full transition-colors"
                  title="Disable thinking mode"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
          </div>
        )}

        <div className="relative flex items-end gap-3">
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
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#00FF7F]/50 focus:ring-1 focus:ring-[#00FF7F]/50 disabled:cursor-not-allowed disabled:opacity-50 max-h-32 overflow-y-auto transition-all"
              style={{ minHeight: '48px' }}
            />
          </div>
          <div className="flex-shrink-0 mb-[1px]">
            <button
              type="submit"
              disabled={disabled || isStreaming || !value.trim()}
              className="rounded-full bg-gradient-to-r from-[#00FF7F] to-[#00D96A] p-3 text-black hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center h-[46px] w-[46px]"
            >
              {isStreaming ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        {isStreaming && (
          <p className="mt-2 text-xs text-white/40 text-center">
            Nova is thinking...
          </p>
        )}
      </div>
    </form>
  )
}
