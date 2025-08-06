'use client'

import { useState, useEffect } from 'react'
const styles = [
  {
    id: 'professional',
    name: 'Professional',
    prompt: 'You are a professional assistant...',
    color: 'from-[#00FF7F]/20 to-[#00D96A]/20',
    response: 'I understand you need a comprehensive analysis. Let me break this down systematically with clear action items and measurable outcomes.'
  },
  {
    id: 'creative',
    name: 'Creative',
    prompt: 'You are a creative thinker...',
    color: 'from-[#00FF7F]/20 to-[#00D96A]/20',
    response: 'What if we approached this from a completely different angle? Imagine combining unexpected elements to create something truly unique!'
  },
  {
    id: 'technical',
    name: 'Technical',
    prompt: 'You are a technical expert...',
    color: 'from-[#00FF7F]/20 to-[#00D96A]/20',
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
          <h3 className="text-lg font-medium text-white">
            Style System
          </h3>
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
                <div className="w-2 h-2 bg-[#00FF7F] rounded-full" />
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