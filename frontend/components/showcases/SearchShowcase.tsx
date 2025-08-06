'use client'

import { useState, useEffect } from 'react'
import { Search, Globe, FileText, CheckCircle, Loader2 } from 'lucide-react'

const searchSteps = [
  {
    query: "Latest developments in quantum computing 2024",
    sources: [
      { name: "Nature.com", url: "nature.com/quantum-breakthrough", status: 'scanning' },
      { name: "MIT News", url: "news.mit.edu/quantum-2024", status: 'pending' },
      { name: "ArXiv Papers", url: "arxiv.org/quantum-computing", status: 'pending' }
    ],
    results: "Found 3 breakthrough developments including room-temperature quantum processors..."
  }
]

export default function SearchShowcase() {
  const [currentStep, setCurrentStep] = useState(0)
  const [searchProgress, setSearchProgress] = useState(0)
  const [sourceStatuses, setSourceStatuses] = useState<Record<number, string>>({})
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    // Start search animation cycle
    const startSearch = () => {
      setIsSearching(true)
      setSearchProgress(0)
      setShowResults(false)
      setSourceStatuses({})

      // Animate progress bar
      let progress = 0
      const progressInterval = setInterval(() => {
        progress += 2
        setSearchProgress(progress)
        
        // Update source statuses
        if (progress > 30) setSourceStatuses(prev => ({ ...prev, 0: 'scanning' }))
        if (progress > 60) {
          setSourceStatuses(prev => ({ ...prev, 0: 'complete', 1: 'scanning' }))
        }
        if (progress > 90) {
          setSourceStatuses(prev => ({ ...prev, 1: 'complete', 2: 'scanning' }))
        }
        
        if (progress >= 100) {
          clearInterval(progressInterval)
          setSourceStatuses({ 0: 'complete', 1: 'complete', 2: 'complete' })
          setTimeout(() => {
            setShowResults(true)
            setIsSearching(false)
          }, 500)
        }
      }, 50)
    }

    // Start initial search
    startSearch()

    // Repeat animation every 8 seconds
    const cycleInterval = setInterval(startSearch, 8000)

    return () => clearInterval(cycleInterval)
  }, [])

  const currentSearch = searchSteps[currentStep]

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl blur-3xl" />
      
      <div className="relative bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Search className="h-5 w-5 text-[#00FF7F]" />
            Intelligent Web Search
          </h3>
          {isSearching && (
            <div className="flex items-center gap-2 text-xs text-[#00FF7F]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Searching...
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Search Query */}
          <div className="bg-black/30 rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-white/40" />
              <p className="text-sm text-white/90">{currentSearch.query}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00FF7F] to-[#00D96A] transition-all duration-300"
                style={{ width: `${searchProgress}%` }}
              />
            </div>
          </div>

          {/* Sources Being Searched */}
          <div className="space-y-2">
            {currentSearch.sources.map((source, index) => {
              const status = sourceStatuses[index] || 'pending'
              return (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    status === 'scanning' 
                      ? 'bg-blue-500/10 border-blue-500/30' 
                      : status === 'complete'
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Globe className={`h-4 w-4 ${
                      status === 'complete' ? 'text-green-400' : 
                      status === 'scanning' ? 'text-blue-400' : 
                      'text-white/40'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-white/90">{source.name}</p>
                      <p className="text-xs text-white/40">{source.url}</p>
                    </div>
                  </div>
                  <div>
                    {status === 'complete' && <CheckCircle className="h-4 w-4 text-green-400" />}
                    {status === 'scanning' && <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />}
                    {status === 'pending' && <div className="h-4 w-4 rounded-full bg-white/20" />}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Results Preview */}
          {showResults && (
            <div className="bg-gradient-to-r from-[#00FF7F]/10 to-[#00D96A]/10 rounded-lg p-4 border border-[#00FF7F]/20">
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-[#00FF7F] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#00FF7F] mb-1">Results Found</p>
                  <p className="text-xs text-white/70 leading-relaxed">
                    {currentSearch.results}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}