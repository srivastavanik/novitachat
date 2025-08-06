'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Briefcase, Palette, Code } from 'lucide-react'

const styles = [
  {
    id: 'professional',
    name: 'Professional',
    icon: Briefcase,
    prompt: 'You are a professional assistant...',
    color: 'from-blue-500 to-indigo-600',
    response: 'I understand you need a comprehensive analysis. Let me break this down systematically with clear action items and measurable outcomes.'
  },
  {
    id: 'creative',
    name: 'Creative',
    icon: Palette,
    prompt: 'You are a creative thinker...',
    color: 'from-purple-500 to-pink-600',
    response: 'What if we approached this from a completely different angle? Imagine combining unexpected elements to create something truly unique!'
  },
  {
    id: 'technical',
    name: 'Technical',
    icon: Code,
    prompt: 'You are a technical expert...',
    color: 'from-green-500 to-emerald-600',
    response: 'Based on the technical specifications, the optimal solution involves implementing a microservices architecture with async message queuing.'
  }
]

export default function StyleShowcase() {
  const [activeStyle, setActiveStyle] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    setIsTyping(true)
    setDisplayedText('')
    
    const text = styles[activeStyle].response
    let index = 0
    
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1))
        index++
      } else {
        setIsTyping(false)
        clearInterval(interval)
      }
    }, 30)

    return () => clearInterval(interval)
  }, [activeStyle])

  // Auto-cycle through styles
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStyle((prev) => (prev + 1) % styles.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-[#00FF7F]/10 to-[#00D96A]/10 rounded-2xl blur-3xl" />
      
      <div className="relative bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#00FF7F]" />
            Style System
          </h3>
          <div className="flex gap-2">
            {styles.map((style, index) => {
              const Icon = style.icon
              return (
                <button
                  key={style.id}
                  onClick={() => setActiveStyle(index)}
                  className={`p-2 rounded-lg transition-all ${
                    activeStyle === index 
                      ? 'bg-gradient-to-r ' + style.color + ' text-white shadow-lg' 
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          {/* Style Selector Pills */}
          <div className="flex gap-2 flex-wrap">
            {styles.map((style, index) => (
              <div
                key={style.id}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeStyle === index
                    ? 'bg-[#00FF7F]/20 text-[#00FF7F] border border-[#00FF7F]/30'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}
                onClick={() => setActiveStyle(index)}
              >
                {style.name}
              </div>
            ))}
          </div>

          {/* Mock Chat Response */}
          <div className="bg-black/30 rounded-lg p-4 min-h-[100px]">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${styles[activeStyle].color} flex items-center justify-center flex-shrink-0`}>
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white/90 leading-relaxed">
                  {displayedText}
                  {isTyping && <span className="inline-block w-2 h-4 bg-[#00FF7F] animate-pulse ml-1" />}
                </p>
              </div>
            </div>
          </div>

          {/* System Prompt Preview */}
          <div className="bg-black/20 rounded-lg p-3 border border-white/5">
            <p className="text-xs text-white/40 font-mono">
              system_prompt: "{styles[activeStyle].prompt}"
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}