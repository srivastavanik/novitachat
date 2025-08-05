'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { ChevronDown, Sparkles, Image, Code, MessageSquare, Lightbulb, Calculator, Crown, ChevronRight } from 'lucide-react'

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
      case 'Sparkles':
        return <Sparkles className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getCapabilityIcon = (capability: string) => {
    switch (capability) {
      case 'text':
        return <MessageSquare className="h-3 w-3" />
      case 'image':
        return <Image className="h-3 w-3" />
      case 'code':
        return <Code className="h-3 w-3" />
      default:
        return <Sparkles className="h-3 w-3" />
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
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-white/60">
        <Sparkles className="h-4 w-4 animate-pulse text-[#00FF7F]" />
        <span>Loading models...</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm"
        >
          <Sparkles className="h-4 w-4 text-[#00FF7F]" />
          <span className="font-medium text-white">
            {selectedModel?.name || 'Select Model'}
          </span>
          <ChevronDown className={`h-4 w-4 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute bottom-full left-0 mb-2 w-[500px] max-h-[600px] overflow-y-auto rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl p-3 shadow-lg z-50">
              {/* Header */}
              <div className="mb-3 pb-2 border-b border-white/10">
                <h3 className="font-medium text-sm text-white">Choose AI Model</h3>
                <p className="text-xs text-white/60 mt-1">Select the best model for your task</p>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                {categories.map((category) => {
                  const categoryModels = categorizedModels[category.id] || []
                  if (categoryModels.length === 0) return null

                  return (
                    <div key={category.id} className="border border-white/10 rounded-lg bg-white/5">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="w-full p-3 flex items-center gap-3 hover:bg-white/10 transition-colors rounded-t-lg"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div className="text-[#00FF7F]">
                            {getCategoryIcon(category.icon)}
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-sm text-white">{category.name}</div>
                            <div className="text-xs text-white/60">{category.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                            {categoryModels.length}
                          </span>
                          <ChevronRight 
                            className={`h-4 w-4 text-white/60 transition-transform ${
                              expandedCategories.has(category.id) ? 'rotate-90' : ''
                            }`} 
                          />
                        </div>
                      </button>

                      {expandedCategories.has(category.id) && (
                        <div className="border-t border-white/10 p-2 space-y-1">
                          {categoryModels.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => handleSelectModel(model)}
                              className={`w-full text-left p-3 rounded-md hover:bg-white/10 transition-colors ${
                                selectedModel?.id === model.id ? 'bg-[#00FF7F]/20 text-white' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate text-white">
                                    {model.name}
                                  </div>
                                  <div className="text-xs text-white/60 mt-1 line-clamp-2">
                                    {model.description}
                                  </div>
                                  <div className="flex items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1">
                                      {model.capabilities.slice(0, 3).map((cap) => (
                                        <div
                                          key={cap}
                                          className="flex items-center gap-1 text-xs text-white/40"
                                          title={cap}
                                        >
                                          {getCapabilityIcon(cap)}
                                        </div>
                                      ))}
                                      {model.capabilities.length > 3 && (
                                        <span className="text-xs text-white/40">+{model.capabilities.length - 3}</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-white/40">
                                      {formatContextSize(model.contextSize)} context
                                    </div>
                                  </div>
                                </div>
                                {selectedModel?.id === model.id && (
                                  <div className="flex-shrink-0 mt-1">
                                    <div className="h-2 w-2 rounded-full bg-[#00FF7F]" />
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
              <div className="mt-3 pt-2 border-t border-white/10 text-xs text-white/60 text-center">
                {Object.values(categorizedModels).flat().length} models available
              </div>
            </div>
          </>
        )}
      </div>

      {/* Thinking Toggle */}
      {selectedModelSupportsThinking && onReasoningChange && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <div>
              <div className="text-sm font-medium text-white">Enable Reasoning</div>
              <div className="text-xs text-white/60">Show step-by-step thinking process</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useReasoning}
              onChange={(e) => onReasoningChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-400/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
          </label>
        </div>
      )}
    </div>
  )
}
