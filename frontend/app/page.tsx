'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, MessageSquare, Zap, Shield, ArrowRight, Code2, Search, Brain, Lock, GitBranch, BarChart3, Globe, Cpu, Layers, Moon, Sun, Send, Paperclip } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import SearchDemo from '@/components/SearchDemo'
import { useRouter } from 'next/navigation'

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
      
      <nav className="navbar">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className="text-white font-medium">Nova</span>
              <div className="hidden md:flex space-x-6 text-white/80 text-sm">
                <Link href="/" className="nav-link">Home</Link>
                <Link href="/docs" className="nav-link">Docs</Link>
                <Link href="/about" className="nav-link">About</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-white text-sm border border-white/20 rounded-full px-5 py-2 hover:bg-white/10 transition-all">
                Sign In
              </Link>
              <Link href="/register" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="nova-hero-background">
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
        
        <div className="px-6 max-w-6xl mx-auto mt-20 md:mt-32">
          <div className="md:max-w-2xl mx-auto text-center">
            <h1 className="hero-headline select-text">
              Chat with <span className="accent" data-text="Intelligence">Intelligence</span>
            </h1>
            <p className="text-white/70 mt-6 text-lg select-text">
              Experience the future of AI conversation with Nova – powered by advanced language models
              that understand context, remember your preferences, and deliver brilliant responses.
            </p>
            
            <div className="mt-10 flex flex-wrap gap-4 justify-center">
              <Link href="/register" className="btn-primary">
                Get Started
              </Link>
              <Link href="/demo" className="btn-secondary">
                Learn More
              </Link>
            </div>
            
            {/* Trial Chat Input - Liquid Glass Design */}
            <div className="mt-20 max-w-3xl mx-auto">
              <form onSubmit={handleTrialSubmit}>
                <div className="chat-input-container">
                  <div className="flex items-end gap-3 p-4">
                    <textarea
                      value={trialQuery}
                      onChange={(e) => setTrialQuery(e.target.value)}
                      placeholder="Ask Nova anything..."
                      className="flex-1 bg-transparent border-none outline-none resize-none text-white placeholder:text-white/50 text-base min-h-[24px] max-h-[200px]"
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
                  Try Nova free – 10 messages, no signup required
                </p>
              </form>
            </div>
            
            {/* Minimal Stats */}
            <div className="grid grid-cols-3 gap-8 mt-20 text-white max-w-md mx-auto">
              <div className="text-center">
                <p className="text-2xl font-light">12K+</p>
                <p className="text-white/50 text-sm mt-1">Active Users</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-light">99.9%</p>
                <p className="text-white/50 text-sm mt-1">Uptime</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-light">4.9</p>
                <p className="text-white/50 text-sm mt-1">User Rating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-[var(--nova-border-primary)] to-transparent"></div>

      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light mb-4 select-text">Why Choose Nova?</h2>
            <p className="text-white/70 text-lg max-w-2xl mx-auto select-text">
              Built for developers, designers, and thinkers who demand more from their AI assistant.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="feature-card">
              <div className="flex items-center mb-4">
                <MessageSquare className="h-8 w-8 text-[#00FF7F]" />
              </div>
              <h3 className="text-xl font-medium mb-3 select-text">Smart Conversations</h3>
              <p className="text-white/60 text-sm leading-relaxed select-text">
                Contextual understanding that feels natural. Nova remembers your conversation history 
                and provides relevant, thoughtful responses.
              </p>
            </div>

            <div className="feature-card">
              <div className="flex items-center mb-4">
                <Zap className="h-8 w-8 text-[#00FF7F]" />
              </div>
              <h3 className="text-xl font-medium mb-3 select-text">Lightning Fast</h3>
              <p className="text-white/60 text-sm leading-relaxed select-text">
                Streaming responses that appear in real-time. No more waiting for complete responses – 
                see thoughts form as they're generated.
              </p>
            </div>

            <div className="feature-card">
              <div className="flex items-center mb-4">
                <Shield className="h-8 w-8 text-[#00FF7F]" />
              </div>
              <h3 className="text-xl font-medium mb-3 select-text">Privacy First</h3>
              <p className="text-white/60 text-sm leading-relaxed select-text">
                Your conversations stay yours. Enterprise-grade security with end-to-end encryption 
                and zero data retention policies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-[var(--nova-border-primary)] to-transparent"></div>

      {/* Intelligent Web Search Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-black/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#00FF7F]/10 text-[#00FF7F] text-sm font-medium mb-6">
                <Search className="h-4 w-4 mr-2" />
                Intelligent Search Detection
              </div>
              <h2 className="text-4xl font-light mb-6 select-text">Web Search That Just Works</h2>
              <p className="text-white/70 text-lg mb-8 select-text">
                Nova automatically detects when you need web search – no buttons, no toggles, no hassle. 
                Just ask naturally and watch Nova understand your intent.
              </p>
              <div className="space-y-6">
                <div>
                  <p className="font-medium text-white mb-2">Context-Aware Detection</p>
                  <p className="text-sm text-white/60">Recognizes questions, searches, and information requests automatically</p>
                </div>
                <div>
                  <p className="font-medium text-white mb-2">Smart Results Integration</p>
                  <p className="text-sm text-white/60">Seamlessly blends web results with AI-powered analysis</p>
                </div>
                <div>
                  <p className="font-medium text-white mb-2">Real-Time Progress</p>
                  <p className="text-sm text-white/60">See exactly what Nova is searching for and finding</p>
                </div>
              </div>
            </div>
            
            <div>
              <SearchDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-[var(--nova-border-primary)] to-transparent"></div>

      {/* Developer Features Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light mb-4">Built for Developers</h2>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              All the features you need to accelerate your workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="feature-card">
              <Code2 className="h-8 w-8 text-[#00FF7F] mb-4" />
              <h3 className="font-medium mb-2">Code Generation</h3>
              <p className="text-xs text-white/60">
                Generate code snippets, debug issues, and refactor with AI assistance.
              </p>
            </div>

            <div className="feature-card">
              <GitBranch className="h-8 w-8 text-[#00FF7F] mb-4" />
              <h3 className="font-medium mb-2">Version Control</h3>
              <p className="text-xs text-white/60">
                Understand git commands, resolve conflicts, and manage branches effortlessly.
              </p>
            </div>

            <div className="feature-card">
              <Globe className="h-8 w-8 text-[#00FF7F] mb-4" />
              <h3 className="font-medium mb-2">API Integration</h3>
              <p className="text-xs text-white/60">
                Build and test API calls, understand documentation, and debug responses.
              </p>
            </div>

            <div className="feature-card">
              <Layers className="h-8 w-8 text-[#00FF7F] mb-4" />
              <h3 className="font-medium mb-2">Architecture</h3>
              <p className="text-xs text-white/60">
                Design patterns, system architecture, and best practices guidance.
              </p>
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
            <h2 className="text-4xl font-light mb-4">Ready to Experience the Future?</h2>
            <p className="text-white/70 text-lg mb-8">
              Join thousands of developers, designers, and teams who've already made the switch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="btn-primary">
                Get Started Free
                <ArrowRight className="inline-block ml-2 h-4 w-4" />
              </Link>
              <Link href="/demo" className="btn-secondary">
                Watch Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="relative z-10 py-8 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <p className="text-white/40 text-xs">© 2024 Nova. All rights reserved.</p>
          <div className="flex space-x-4">
            <a href="#" className="text-white/40 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
              </svg>
            </a>
            <a href="#" className="text-white/40 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
