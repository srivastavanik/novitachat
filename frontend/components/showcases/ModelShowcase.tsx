'use client'

import { useState, useEffect } from 'react'
const models = [
  {
    id: 'chatgpt-oss',
    name: 'ChatGPT OSS 120B',
    description: 'OpenAI\'s open-source model with reasoning capabilities',
    color: 'from-[#00FF7F]/30 to-[#00D96A]/30',
    features: ['131K context', 'Thinking mode', 'Code generation'],
    speed: 95,
    accuracy: 98
  },
  {
    id: 'kimi-k2',
    name: 'Kimi K2',
    description: 'Advanced reasoning from Moonshot AI',
    color: 'from-[#00FF7F]/30 to-[#00D96A]/30',
    features: ['Extended context', 'Multi-step reasoning', 'Research'],
    speed: 90,
    accuracy: 96
  },
  {
    id: 'deepseek',
    name: 'DeepSeek V3',
    description: 'Latest DeepSeek with 163K context window',
    color: 'from-[#00FF7F]/30 to-[#00D96A]/30',
    features: ['163K context', 'Code expertise', 'Fast inference'],
    speed: 98,
    accuracy: 94
  },
  {
    id: 'glm',
    name: 'GLM-4',
    description: 'Zhipu AI\'s flagship multilingual model',
    color: 'from-[#00FF7F]/30 to-[#00D96A]/30',
    features: ['Multilingual', 'Vision capable', 'Function calling'],
    speed: 92,
    accuracy: 95
  },
  {
    id: 'qwen-vl',
    name: 'Qwen2.5-VL 72B',
    description: 'Advanced vision-language model for images and documents',
    color: 'from-[#00FF7F]/30 to-[#00D96A]/30',
    features: ['Vision & Documents', 'PDF analysis', 'Image understanding'],
    speed: 88,
    accuracy: 97
  },
  {
    id: 'gemma-3',
    name: 'Gemma 3 27B',
    description: 'Google\'s multimodal model with 140+ language support',
    color: 'from-[#00FF7F]/30 to-[#00D96A]/30',
    features: ['Multimodal', '140+ languages', 'Function calling'],
    speed: 90,
    accuracy: 96
  }
]

export default function ModelShowcase() {
  const [selectedModel, setSelectedModel] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setSelectedModel((prev) => (prev + 1) % models.length)
        setIsAnimating(false)
      }, 300)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  const currentModel = models[selectedModel]

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-[#00FF7F]/10 to-[#00D96A]/10 rounded-2xl blur-3xl" />
      
      <div className="relative bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-white">
            AI Models
          </h3>
          <div className="flex gap-1">
            {models.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedModel(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  selectedModel === index 
                    ? 'bg-[#00FF7F] w-6' 
                    : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>

        <div className={`space-y-4 transition-all duration-300 ${isAnimating ? 'opacity-50' : 'opacity-100'}`}>
          {/* Model Card */}
          <div className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${currentModel.color} p-[1px]`}>
            <div className="bg-black/90 backdrop-blur rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-1">{currentModel.name}</h4>
                  <p className="text-xs text-white/70">{currentModel.description}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${currentModel.color} flex items-center justify-center`}>
                  <div className="w-2 h-2 bg-[#00FF7F] rounded-full" />
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-4">
                {currentModel.features.map((feature, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-white/10 rounded-md text-xs text-white/80"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Performance Metrics */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">Speed</span>
                    <span className="text-white/80">{currentModel.speed}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#00FF7F] to-[#00D96A] transition-all duration-700"
                      style={{ width: `${currentModel.speed}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">Accuracy</span>
                    <span className="text-white/80">{currentModel.accuracy}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#00FF7F] to-[#00D96A] transition-all duration-700"
                      style={{ width: `${currentModel.accuracy}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Model Selector Grid */}
          <div className="grid grid-cols-2 gap-2">
            {models.map((model, index) => {
              return (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(index)}
                  className={`p-3 rounded-xl border transition-all ${
                    selectedModel === index
                      ? 'bg-[#00FF7F]/10 border-[#00FF7F]/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${
                      selectedModel === index ? 'text-[#00FF7F]' : 'text-white/60'
                    }`}>
                      {model.name}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}