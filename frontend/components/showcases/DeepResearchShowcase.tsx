'use client'

import { useState, useEffect } from 'react'
import { Brain, Search, FileSearch, Database, Sparkles, CheckCircle, Loader2 } from 'lucide-react'

const researchSteps = [
  { 
    id: 'initial', 
    label: 'Understanding Query', 
    icon: Brain, 
    duration: 1500,
    detail: 'Analyzing question complexity...'
  },
  { 
    id: 'search1', 
    label: 'Primary Search', 
    icon: Search, 
    duration: 2000,
    detail: 'Searching academic databases...'
  },
  { 
    id: 'search2', 
    label: 'Cross-Reference', 
    icon: FileSearch, 
    duration: 1800,
    detail: 'Verifying across sources...'
  },
  { 
    id: 'synthesis', 
    label: 'Data Synthesis', 
    icon: Database, 
    duration: 1500,
    detail: 'Combining findings...'
  },
  { 
    id: 'complete', 
    label: 'Analysis Complete', 
    icon: Sparkles, 
    duration: 1000,
    detail: 'Comprehensive report ready'
  }
]

export default function DeepResearchShowcase() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  useEffect(() => {
    const runResearch = () => {
      setCurrentStep(0)
      setCompletedSteps(new Set())
      setIsActive(true)

      let stepIndex = 0
      let totalDelay = 0

      researchSteps.forEach((step, index) => {
        setTimeout(() => {
          setCurrentStep(index)
          
          setTimeout(() => {
            setCompletedSteps(prev => {
              const newSet = new Set(prev)
              newSet.add(index)
              return newSet
            })
            
            if (index === researchSteps.length - 1) {
              setTimeout(() => {
                setIsActive(false)
              }, 1000)
            }
          }, step.duration - 200)
        }, totalDelay)
        
        totalDelay += step.duration
      })
    }

    // Start initial animation
    runResearch()

    // Repeat every 10 seconds
    const interval = setInterval(runResearch, 10000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl blur-3xl" />
      
      <div className="relative bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Brain className="h-5 w-5 text-[#00FF7F]" />
            Deep Research Mode
          </h3>
          {isActive && (
            <div className="px-3 py-1 bg-[#00FF7F]/10 rounded-full">
              <p className="text-xs text-[#00FF7F] font-medium">Researching...</p>
            </div>
          )}
        </div>

        {/* Research Pipeline */}
        <div className="space-y-4">
          {/* Progress Steps */}
          <div className="relative">
            {/* Connection Lines */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-white/10" />
            
            <div className="space-y-3">
              {researchSteps.map((step, index) => {
                const Icon = step.icon
                const isCompleted = completedSteps.has(index)
                const isCurrent = currentStep === index
                
                return (
                  <div 
                    key={step.id}
                    className={`relative flex items-center gap-4 p-3 rounded-lg transition-all ${
                      isCurrent ? 'bg-[#00FF7F]/10 border border-[#00FF7F]/30' :
                      isCompleted ? 'bg-green-500/5 border border-green-500/20' :
                      'bg-white/5 border border-white/10'
                    }`}
                  >
                    {/* Step Icon */}
                    <div className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      isCurrent ? 'bg-gradient-to-r from-[#00FF7F] to-[#00D96A]' :
                      isCompleted ? 'bg-green-500/20' :
                      'bg-white/10'
                    }`}>
                      {isCompleted && !isCurrent ? (
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      ) : isCurrent ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      ) : (
                        <Icon className={`h-6 w-6 ${
                          isCurrent ? 'text-white' : 'text-white/40'
                        }`} />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        isCurrent ? 'text-[#00FF7F]' :
                        isCompleted ? 'text-green-400' :
                        'text-white/60'
                      }`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {isCurrent ? step.detail : isCompleted ? 'Complete' : 'Pending'}
                      </p>
                    </div>

                    {/* Step Number */}
                    <div className={`text-xs font-mono ${
                      isCurrent ? 'text-[#00FF7F]' :
                      isCompleted ? 'text-green-400' :
                      'text-white/30'
                    }`}>
                      {index + 1}/{researchSteps.length}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sample Output */}
          {completedSteps.has(researchSteps.length - 1) && (
            <div className="mt-4 p-4 bg-gradient-to-r from-[#00FF7F]/5 to-[#00D96A]/5 rounded-lg border border-[#00FF7F]/20">
              <p className="text-xs font-medium text-[#00FF7F] mb-2">Research Complete</p>
              <p className="text-xs text-white/70 leading-relaxed">
                Analyzed 12 sources • Cross-referenced 3 databases • Confidence: 94%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}