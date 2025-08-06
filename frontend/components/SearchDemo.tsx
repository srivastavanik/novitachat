'use client'

import { useState, useEffect } from 'react'
import { Search, Globe, Loader2, Check, Sparkles } from 'lucide-react'

export default function SearchDemo() {
  const [currentQuery, setCurrentQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [currentExample, setCurrentExample] = useState(0)
  
  const searchExamples = [
    {
      query: "What's the weather in Tokyo?",
      results: [
        { source: 'Weather.com', snippet: 'Tokyo, Japan: 22°C, Partly Cloudy' },
        { source: 'AccuWeather', snippet: 'Current conditions with 60% humidity' }
      ]
    },
    {
      query: "Latest AI developments 2025",
      results: [
        { source: 'TechCrunch', snippet: 'GPT-5 announced with multimodal capabilities' },
        { source: 'MIT News', snippet: 'Breakthrough in quantum machine learning' }
      ]
    },
    {
      query: "Best practices for React performance",
      results: [
        { source: 'React Blog', snippet: 'Use React.memo for expensive components' },
        { source: 'Dev.to', snippet: 'Implement code splitting and lazy loading' }
      ]
    }
  ]
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Reset state
      setCurrentQuery('')
      setIsSearching(false)
      setShowResults(false)
      
      // Start typing animation
      const example = searchExamples[currentExample]
      let charIndex = 0
      
      const typeInterval = setInterval(() => {
        if (charIndex < example.query.length) {
          setCurrentQuery(example.query.slice(0, charIndex + 1))
          charIndex++
        } else {
          clearInterval(typeInterval)
          // Start searching
          setTimeout(() => {
            setIsSearching(true)
            // Show results after delay
            setTimeout(() => {
              setIsSearching(false)
              setShowResults(true)
            }, 1500)
          }, 500)
        }
      }, 50)
      
      setCurrentExample((prev) => (prev + 1) % searchExamples.length)
      
      return () => clearInterval(typeInterval)
    }, 6000)
    
    return () => clearInterval(interval)
  }, [currentExample])
  
  return (
    <div className="nova-card p-6 h-[400px] relative overflow-hidden">
      {/* Background gradient animation */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--nova-info)] via-[var(--nova-accent)] to-[var(--nova-primary)] animate-pulse" />
      </div>
      
      {/* Search Input */}
      <div className="relative z-10">
        <div className="nova-input flex items-center gap-3 px-4 py-3 mb-6">
          <Search className="h-5 w-5 text-[var(--nova-text-tertiary)]" />
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[var(--nova-text-primary)]">
              {currentQuery}
              <span className="inline-block w-0.5 h-5 bg-[var(--nova-primary)] animate-pulse ml-0.5" />
            </span>
          </div>
          {isSearching && (
            <div className="flex items-center gap-2 text-[var(--nova-info)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Searching...</span>
            </div>
          )}
        </div>
        
        {/* Search Detection Indicator */}
        {(isSearching || showResults) && (
          <div className="mb-4 flex items-center gap-2 text-sm text-[var(--nova-info)] animate-fadeIn">
            <Sparkles className="h-4 w-4" />
            <span>Web search automatically detected</span>
          </div>
        )}
        
        {/* Results */}
        {showResults && (
          <div className="space-y-3 animate-fadeIn">
            {searchExamples[currentExample === 0 ? searchExamples.length - 1 : currentExample - 1].results.map((result, idx) => (
              <div 
                key={idx} 
                className="nova-card p-4 border-[var(--nova-border-secondary)] hover:border-[var(--nova-info)] transition-all duration-300"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="flex items-start gap-3">
                  <Globe className="h-4 w-4 text-[var(--nova-info)] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--nova-info)] mb-1">{result.source}</p>
                    <p className="text-sm text-[var(--nova-text-secondary)]">{result.snippet}</p>
                  </div>
                  <Check className="h-4 w-4 text-[var(--nova-success)]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Bottom indicator */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {searchExamples.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
              idx === currentExample 
                ? 'w-8 bg-[var(--nova-primary)]' 
                : 'bg-[var(--nova-border-secondary)]'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
