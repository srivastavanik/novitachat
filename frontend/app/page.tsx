'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Send, Paperclip } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import { useRouter } from 'next/navigation'
import StyleShowcase from '@/components/showcases/StyleShowcase'
import SearchShowcase from '@/components/showcases/SearchShowcase'
import DeepResearchShowcase from '@/components/showcases/DeepResearchShowcase'
import ModelShowcase from '@/components/showcases/ModelShowcase'

export default function LandingPage() {
  const gradientRef = useRef<HTMLDivElement>(null)
  const grainRef = useRef<HTMLCanvasElement>(null)
  const [trialQuery, setTrialQuery] = useState('')
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  
  const handleTrialSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (trialQuery.trim()) {
      // Navigate to chat page with trial mode
      router.push(`/chat?trial=true&q=${encodeURIComponent(trialQuery)}`)
    }
  }

  useEffect(() => {
    // Cursor-following gradient effect
    const handleMouseMove = (e: MouseEvent) => {
      if (gradientRef.current) {
        const x = e.clientX
        const y = e.clientY
        gradientRef.current.style.left = `${x}px`
        gradientRef.current.style.top = `${y}px`
      }
    }

    // Grain filter effect
    const createGrain = () => {
      if (!grainRef.current) return
      const canvas = grainRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      const imageData = ctx.createImageData(canvas.width, canvas.height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 255
        data[i] = noise       // Red
        data[i + 1] = noise   // Green
        data[i + 2] = noise   // Blue
        data[i + 3] = 25      // Alpha (more visible texture)
      }

      ctx.putImageData(imageData, 0, 0)
    }

    createGrain()
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', createGrain)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', createGrain)
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Liquid Glass Background Layers */}
      <div className="grain-overlay"></div>
      <div className="gradient-grid"></div>
      <div className="radial-glow"></div>
      
      <nav className="navbar relative">
        <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-white text-lg font-normal tracking-wide">Chat by</span>
              <img src="/novita-logo.png" alt="Novita" className="h-7 object-contain brightness-0 invert" />
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-white text-sm font-medium border border-white/20 rounded-full px-6 py-2.5 hover:bg-white/10 transition-all">
                Sign In
              </Link>
              <Link href="/register" className="bg-[#00FF7F] text-black text-sm font-medium rounded-full px-6 py-2.5 hover:bg-[#00E572] transition-all">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="nova-hero-background relative">
        {/* Dynamic Grid Overlay */}
        <div className="nova-dynamic-grid"></div>
        
        {/* Floating Particles */}
        <div className="nova-particles">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="nova-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${-Math.random() * 25}s`,
                animationDuration: `${15 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>
        
        <div className="px-4 sm:px-6 max-w-6xl mx-auto mt-2 md:mt-4 relative">
          <div className="md:max-w-2xl mx-auto text-center relative">
            {/* Clean glowing ring with pulse - responsive sizing */}
            <div className="absolute inset-0 -inset-x-40 sm:-inset-x-60 md:-inset-x-80 -inset-y-32 sm:-inset-y-48 md:-inset-y-64 flex items-center justify-center pointer-events-none">
              <div className="relative w-[800px] sm:w-[1100px] md:w-[1400px] h-[800px] sm:h-[1100px] md:h-[1400px]">
                {/* Clean hollow ring with glow and pulse animation */}
                <div className="absolute inset-0 rounded-full border-[24px] sm:border-[36px] md:border-[48px] border-[#00FF7F] animate-pulse-slow"
                     style={{
                       boxShadow: `0 0 40px #00FF7F, 
                                   0 0 80px #00FF7F,
                                   inset 0 0 40px #00FF7F`,
                       animation: 'pulse-glow 4s ease-in-out infinite'
                     }}>
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-white select-text relative z-10 mt-12 sm:mt-18 md:mt-24">
              Open Source <span className="text-[#00FF7F]">AI Chat</span>
            </h1>
            <p className="text-white/60 mt-4 sm:mt-6 md:mt-8 text-base sm:text-lg md:text-xl lg:text-2xl font-normal leading-relaxed select-text relative z-10 max-w-3xl mx-auto px-4">
              Powered by cutting-edge models including Kimi K2, OpenAI OSS, and more. 
              Built with transparency, customizable with style prompts, and enhanced with real-time web search.
            </p>
            
            <div className="mt-6 sm:mt-8 md:mt-10 flex flex-col sm:flex-row flex-wrap gap-4 justify-center px-4">
              <Link href="/register" className="bg-[#00FF7F] text-black text-base font-medium rounded-full px-8 py-3 hover:bg-[#00E572] transition-all">
                Get Started
              </Link>
              <Link href="#features" className="border border-white/20 text-white text-base font-medium rounded-full px-8 py-3 hover:bg-white/10 transition-all">
                Learn More
              </Link>
            </div>
            
            {/* Trial Chat Input - Liquid Glass Design */}
            <div className="mt-12 max-w-4xl mx-auto">
              <form onSubmit={handleTrialSubmit}>
                <div className="chat-input-container">
                  <div className="flex items-end gap-4 p-6">
                    <textarea
                      value={trialQuery}
                      onChange={(e) => setTrialQuery(e.target.value)}
                      placeholder="Ask anything..."
                      className="flex-1 bg-transparent border-none outline-none resize-none text-white placeholder:text-white/50 text-lg min-h-[32px] max-h-[200px]"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleTrialSubmit(e)
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-2 rounded-full hover:bg-white/5 transition-colors opacity-50 cursor-not-allowed"
                        disabled
                        title="Attachments available after sign up"
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                      <button
                        type="submit"
                        className="p-2 rounded-full bg-gradient-to-r from-[#00FF7F] to-[#00D96A] text-black hover:opacity-90 transition-opacity disabled:opacity-50"
                        disabled={!trialQuery.trim()}
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-center text-white/50 mt-3">
                  Try Chat free – 10 messages, no signup required
                </p>
              </form>
            </div>
            

          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-[var(--nova-border-primary)] to-transparent"></div>

      <section className="relative z-10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-semibold tracking-tight mb-4 select-text">Powerful AI Models</h2>
            <p className="text-white/60 text-lg font-normal max-w-2xl mx-auto select-text">
              Access state-of-the-art language models through a single, unified interface.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="feature-card">
              <h3 className="text-xl font-medium mb-3 select-text">Reasoning Models</h3>
              <p className="text-white/60 text-sm leading-relaxed select-text">
                ChatGPT OSS 120B, Kimi K2, DeepSeek R1, and GLM 4.1V with thinking capabilities for complex multi-step reasoning and research.
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-xl font-medium mb-3 select-text">Production Ready</h3>
              <p className="text-white/60 text-sm leading-relaxed select-text">
                GLM-4.5, DeepSeek V3, and Qwen models optimized for production workloads with fast inference and reliable performance.
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-xl font-medium mb-3 select-text">Specialized Models</h3>
              <p className="text-white/60 text-sm leading-relaxed select-text">
                Vision models for image analysis, code-optimized models for development, and math models for complex calculations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-[var(--nova-border-primary)] to-transparent"></div>

      {/* Interactive Showcases Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold tracking-tight mb-4">Experience the Features</h2>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              Interactive demonstrations of our most powerful capabilities.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Style System Showcase */}
            <StyleShowcase />
            
            {/* Model Showcase */}
            <ModelShowcase />
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Search Showcase */}
            <SearchShowcase />
            
            {/* Deep Research Showcase */}
            <DeepResearchShowcase />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-[var(--nova-border-primary)] to-transparent"></div>

      {/* Key Features Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold tracking-tight mb-4">Core Features</h2>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              Everything you need for productive AI conversations.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Style System */}
            <div className="feature-card group hover:border-[#00FF7F]/30 transition-all duration-300">
              <h3 className="text-lg font-medium mb-3">Custom Style Prompts</h3>
              <p className="text-white/60 text-sm mb-4">
                Personalize AI responses with custom system prompts. Choose from professional, creative, or technical styles.
              </p>
              <div className="bg-black/50 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-[#00FF7F] font-mono">styles: ["Professional", "Creative", "Technical", "Custom"]</p>
              </div>
            </div>
            
            {/* Web Search */}
            <div className="feature-card group hover:border-[#00FF7F]/30 transition-all duration-300">
              <h3 className="text-lg font-medium mb-3">Real-time Web Search</h3>
              <p className="text-white/60 text-sm mb-4">
                Get current information with integrated web search. Perfect for news, research, and fact-checking.
              </p>
              <div className="bg-black/50 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-[#00FF7F] font-mono">search: enabled | sources: verified</p>
              </div>
            </div>
            
            {/* Deep Research */}
            <div className="feature-card group hover:border-[#00FF7F]/30 transition-all duration-300">
              <h3 className="text-lg font-medium mb-3">Deep Research Mode</h3>
              <p className="text-white/60 text-sm mb-4">
                Comprehensive analysis with multiple searches and cross-referenced sources for thorough answers.
              </p>
              <div className="bg-black/50 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-[#00FF7F] font-mono">depth: maximum | accuracy: enhanced</p>
              </div>
            </div>
            
            {/* File Attachments */}
            <div className="feature-card group hover:border-[#00FF7F]/30 transition-all duration-300">
              <h3 className="text-lg font-medium mb-3">File Analysis</h3>
              <p className="text-white/60 text-sm mb-4">
                Upload documents, images, and code files for AI analysis and discussion.
              </p>
              <div className="bg-black/50 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-[#00FF7F] font-mono">formats: [pdf, txt, jpg, png, code]</p>
              </div>
            </div>
            
            {/* API Keys */}
            <div className="feature-card group hover:border-[#00FF7F]/30 transition-all duration-300">
              <h3 className="text-lg font-medium mb-3">Bring Your Own Key</h3>
              <p className="text-white/60 text-sm mb-4">
                Use your own Novita API key for unlimited access and custom rate limits.
              </p>
              <div className="bg-black/50 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-[#00FF7F] font-mono">api: flexible | limits: customizable</p>
              </div>
            </div>
            

          </div>
        </div>
      </section>



      {/* Divider */}
      <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-[var(--nova-border-primary)] to-transparent"></div>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="feature-card bg-gradient-to-br from-[#00FF7F]/5 to-[#00D96A]/5 border-[#00FF7F]/20">
            <h2 className="text-4xl font-semibold tracking-tight mb-4">Start Your AI Journey</h2>
            <p className="text-white/70 text-lg mb-8">
              Try 10 free messages without signup. Experience the power of advanced AI models today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/chat?trial=true" className="btn-primary">
                Try Free Now
              </Link>
              <Link href="/register" className="btn-secondary">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="relative z-10 py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-4 text-xs text-white/40">
            <span>By Nick Srivastava</span>
            <span>|</span>
            <div className="flex items-center gap-2">
              <span>Made with</span>
              <img src="/novita-logo.png" alt="Novita" className="h-4 object-contain brightness-0 invert opacity-60" />
            </div>
            <span>|</span>
            <div className="flex items-center gap-3">
              <a 
                href="https://www.linkedin.com/company/novita-ai-labs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a 
                href="https://x.com/novita_labs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
