'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { ChevronDown, Image, Code, MessageSquare, Lightbulb, Calculator, Crown, ChevronRight } from 'lucide-react'

interface Model {
  id: string
  name: string
  description: string
  contextSize: number
  capabilities: string[]
  category: string
  inputPrice?: number
  outputPrice?: number
  supportsThinking?: boolean
}

interface Category {
  id: string
  name: string
  description: string
  icon: string
}

interface ModelSelectorProps {
  currentModel?: string
  onModelChange: (modelId: string, model: Model) => void
  hasAttachments?: boolean
  attachmentTypes?: string[]
  useReasoning?: boolean
  onReasoningChange?: (useReasoning: boolean) => void
}

export default function ModelSelector({ 
  currentModel, 
  onModelChange, 
  hasAttachments = false, 
  attachmentTypes = [],
  useReasoning = false,
  onReasoningChange
}: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([])
  const [categorizedModels, setCategorizedModels] = useState<Record<string, Model[]>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['reasoning']))

  useEffect(() => {
    loadModels()
  }, [hasAttachments, attachmentTypes])

  useEffect(() => {
    if (models.length > 0 && currentModel) {
      const model = models.find(m => m.id === currentModel)
      if (model) {
        setSelectedModel(model)
      }
    }
  }, [models, currentModel])

  const loadModels = async () => {
    try {
      const params = new URLSearchParams()
      
      if (hasAttachments) {
        params.append('hasAttachments', 'true')
        if (attachmentTypes.length > 0) {
          params.append('attachmentTypes', attachmentTypes.join(','))
        }
      }
      
      const response = await axios.get(`/api/models?${params.toString()}`)
      
      // Handle both success and error responses that contain model data
      let modelsData = null
      let categorizedData = null
      let categoriesData = null
      
      if (response.data.models) {
        modelsData = response.data.models
        categorizedData = response.data.categorized || {}
        categoriesData = response.data.categories || []
      } else if (response.data.fallbackModels) {
        modelsData = response.data.fallbackModels
        categorizedData = response.data.categorized || { general: response.data.fallbackModels }
        categoriesData = response.data.categories || []
      }
      
      if (modelsData && modelsData.length > 0) {
        setModels(modelsData)
        setCategorizedModels(categorizedData)
        setCategories(categoriesData)
        
        // Select first model by default
        if (!currentModel && onModelChange) {
          const defaultModel = modelsData[0]
          setSelectedModel(defaultModel)
          onModelChange(defaultModel.id, defaultModel)
        }
      } else {
        throw new Error('No models available')
      }
    } catch (error: any) {
      console.error('Failed to load models:', error)
      
      // Check if error response contains fallback models
      if (error.response?.data?.fallbackModels) {
        const fallbackModels = error.response.data.fallbackModels
        setModels(fallbackModels)
        setCategorizedModels(error.response.data.categorized || { general: fallbackModels })
        setCategories(error.response.data.categories || [])
        const defaultModel = fallbackModels[0]
        setSelectedModel(defaultModel)
        if (onModelChange) {
          onModelChange(defaultModel.id, defaultModel)
        }
      } else {
        // Use fallback models
        const fallbackModels = [
          {
            id: 'meta-llama/llama-3.3-70b-instruct',
            name: 'Llama 3.3 70B',
            description: 'Latest Llama model',
            contextSize: 131072,
            capabilities: ['text', 'code'],
            category: 'general'
          }
        ]
        setModels(fallbackModels)
        setCategorizedModels({ general: fallbackModels })
        setCategories([{ id: 'general', name: 'General Chat', description: 'General purpose models', icon: 'MessageSquare' }])
        setSelectedModel(fallbackModels[0])
        if (onModelChange) {
          onModelChange(fallbackModels[0].id, fallbackModels[0])
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSelectModel = (model: Model) => {
    setSelectedModel(model)
    onModelChange(model.id, model)
    setIsOpen(false)
  }

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'MessageSquare':
        return <MessageSquare className="h-4 w-4" />
      case 'Code':
        return <Code className="h-4 w-4" />
      case 'Image':
        return <Image className="h-4 w-4" />
      case 'Reasoning':
        return <Lightbulb className="h-4 w-4" />
      case 'Brain':
        return <Lightbulb className="h-4 w-4" />
      case 'Calculator':
        return <Calculator className="h-4 w-4" />
      case 'Crown':
        return <Crown className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }


  const formatContextSize = (size: number) => {
    if (size >= 1000000) {
      return `${(size / 1000000).toFixed(1)}M`
    }
    return `${Math.round(size / 1000)}K`
  }

  const selectedModelSupportsThinking = selectedModel?.supportsThinking || 
    selectedModel?.capabilities?.includes('thinking') || false

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--nova-text-tertiary)]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--nova-primary)] border-t-transparent" />
        <span>Loading models...</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--nova-bg-tertiary)] hover:bg-[var(--nova-bg-hover)] transition-all text-sm"
        >
          <span className="font-medium text-[var(--nova-text-primary)]">
            {selectedModel?.name || 'Select Model'}
          </span>
          <ChevronDown className={`h-4 w-4 text-[var(--nova-text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute bottom-full left-0 mb-2 w-[500px] max-h-[600px] overflow-y-auto rounded-xl border border-[var(--nova-border-primary)] bg-[var(--nova-bg-tertiary)] p-3 shadow-2xl z-50">
              {/* Header */}
              <div className="mb-3 pb-2 border-b border-[var(--nova-border-primary)]">
                <h3 className="font-medium text-sm text-[var(--nova-text-primary)]">Choose AI Model</h3>
                <p className="text-xs text-[var(--nova-text-tertiary)] mt-1">Select the best model for your task</p>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                {categories.map((category) => {
                  const categoryModels = categorizedModels[category.id] || []
                  if (categoryModels.length === 0) return null

                  return (
                    <div key={category.id} className="border border-[var(--nova-border-primary)] rounded-lg bg-[var(--nova-bg-secondary)]">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="w-full p-3 flex items-center gap-3 hover:bg-[var(--nova-bg-hover)] transition-colors rounded-t-lg"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div className="text-left">
                            <div className="font-medium text-sm text-[var(--nova-text-primary)]">{category.name}</div>
                            <div className="text-xs text-[var(--nova-text-tertiary)]">{category.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--nova-text-tertiary)] bg-[var(--nova-bg-tertiary)] px-2 py-1 rounded">
                            {categoryModels.length}
                          </span>
                          <ChevronRight 
                            className={`h-4 w-4 text-[var(--nova-text-tertiary)] transition-transform ${
                              expandedCategories.has(category.id) ? 'rotate-90' : ''
                            }`} 
                          />
                        </div>
                      </button>

                      {expandedCategories.has(category.id) && (
                        <div className="border-t border-[var(--nova-border-primary)] p-2 space-y-1">
                          {categoryModels.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => handleSelectModel(model)}
                              className={`w-full text-left p-3 rounded-xl hover:bg-[var(--nova-bg-hover)] transition-colors ${
                                selectedModel?.id === model.id ? 'bg-[var(--nova-primary)]/20' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate text-[var(--nova-text-primary)]">
                                    {model.name}
                                  </div>
                                  <div className="text-xs text-[var(--nova-text-tertiary)] mt-1 line-clamp-2">
                                    {model.description}
                                  </div>
                                  <div className="flex items-center gap-3 mt-2">
                                    <div className="text-xs text-[var(--nova-text-tertiary)]">
                                      {formatContextSize(model.contextSize)} context
                                    </div>
                                  </div>
                                </div>
                                {selectedModel?.id === model.id && (
                                  <div className="flex-shrink-0 mt-1">
                                    <div className="h-2 w-2 rounded-full bg-[var(--nova-primary)]" />
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="mt-3 pt-2 border-t border-[var(--nova-border-primary)] text-xs text-[var(--nova-text-tertiary)] text-center">
                {Object.values(categorizedModels).flat().length} models available
              </div>
            </div>
          </>
        )}
      </div>

      {/* Thinking Toggle */}
      {selectedModelSupportsThinking && onReasoningChange && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#40414F] border border-[#565869]">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-purple-400" />
            <div>
              <div className="text-sm font-medium text-gray-200">Enable Reasoning</div>
              <div className="text-xs text-gray-500">Show step-by-step thinking process</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useReasoning}
              onChange={(e) => onReasoningChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-400/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
          </label>
        </div>
      )}
    </div>
  )
}
