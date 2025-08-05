import React, { useState, useEffect } from 'react'
import { Search, Globe, CheckCircle, Loader2, ChevronDown, ChevronUp, Database, BookOpen, FlaskConical, BarChart } from 'lucide-react'

interface SearchProgressProps {
  content: string
  isActive?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  autoMinimizeDelay?: number
}

export default function SearchProgress({ content, isActive = true, isExpanded = true, onToggleExpand, autoMinimizeDelay = 2000 }: SearchProgressProps) {
  const [showFullContent, setShowFullContent] = useState(isExpanded)
  const [hasAutoMinimized, setHasAutoMinimized] = useState(false)
  const lines = content.split('\n').filter(line => line.trim())
  
  const isComplete = content.includes('✅') || content.includes('completed')
  
  // Auto-minimize after search completion
  useEffect(() => {
    if (isComplete && !hasAutoMinimized) {
      const timer = setTimeout(() => {
        setShowFullContent(false)
        setHasAutoMinimized(true)
      }, autoMinimizeDelay)
      
      return () => clearTimeout(timer)
    }
  }, [isComplete, hasAutoMinimized, autoMinimizeDelay])
  
  // Reset auto-minimize state when content changes (new search)
  useEffect(() => {
    if (isActive) {
      setHasAutoMinimized(false)
    }
  }, [isActive])
  
  const getLineIcon = (line: string) => {
    if (line.includes('🔍')) return <Search className="h-4 w-4 text-[#00BFFF]" />
    if (line.includes('🔬')) return <FlaskConical className="h-4 w-4 text-[#00FF7F]" />
    if (line.includes('📊')) return <BarChart className="h-4 w-4 text-[#FFD700]" />
    if (line.includes('✅')) return <CheckCircle className="h-4 w-4 text-[#00FF7F]" />
    if (line.includes('🌐')) return <Globe className="h-3 w-3 text-white/60" />
    if (line.includes('📚')) return <BookOpen className="h-4 w-4 text-[#40E0D0]" />
    if (line.includes('🗄️')) return <Database className="h-4 w-4 text-[#00BFFF]" />
    if (line.includes('📈')) return <BarChart className="h-4 w-4 text-[#00FF7F]" />
    return null
  }

  const formatLine = (line: string) => {
    const cleanLine = line.replace(/[🔍🔬📊✅🌐📍📚🗄️📈🔎]/g, '').trim()
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = cleanLine.split(urlRegex)
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        let domain = part
        try {
          domain = new URL(part).hostname.replace('www.', '')
        } catch (e) {
          // If URL parsing fails, use the full URL
        }
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00BFFF] hover:text-[#00DFFF] underline inline-flex items-center gap-1"
          >
            <Globe className="h-3 w-3" />
            {domain}
          </a>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  const isMainAction = (line: string) => {
    return line.includes('Searching') || line.includes('Starting') || line.includes('Research query') || line.includes('Analyzing') || line.includes('Processing')
  }

  const isDeepResearch = content.includes('🔬')

  const sourceCount = lines.filter(line => line.includes('🌐')).length
  const databaseCount = lines.filter(line => line.includes('🗄️')).length
  const analysisCount = lines.filter(line => line.includes('📊') || line.includes('📈')).length

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand()
    } else {
      setShowFullContent(!showFullContent)
    }
  }

  return (
    <div className="flex justify-center p-4">
      <div className="max-w-3xl w-full">
        <div 
          className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl transition-all duration-300 ease-out shadow-xl"
          style={{
            animation: 'fadeInUp 0.3s ease-out',
          }}
        >
          <div 
            className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={handleToggle}
          >
            <div className="flex items-center gap-3">
              {isComplete ? (
                <CheckCircle className="h-5 w-5 text-[#00FF7F]" />
              ) : (
                <div className="animate-spin">
                  <Loader2 className="h-5 w-5 text-[#00FF7F]" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-white">
                  {isDeepResearch ? 'Deep Research Analysis' : 'Web Search Results'}
                </h3>
                {isComplete && (
                  <div className="flex items-center gap-4 mt-1 text-xs text-white/60">
                    {sourceCount > 0 && <span>{sourceCount} sources analyzed</span>}
                    {databaseCount > 0 && <span>{databaseCount} databases queried</span>}
                    {analysisCount > 0 && <span>{analysisCount} analysis steps</span>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isActive && (
                <span className="text-xs text-white/40 mr-2">
                  Click to {showFullContent ? 'collapse' : 'expand'}
                </span>
              )}
              {showFullContent ? (
                <ChevronUp className="h-5 w-5 text-white/60" />
              ) : (
                <ChevronDown className="h-5 w-5 text-white/60" />
              )}
            </div>
          </div>

          {showFullContent && (
            <div className="px-6 pb-6 space-y-2 border-t border-white/10">
              {lines.map((line, index) => {
                const icon = getLineIcon(line)
                const isMain = isMainAction(line)
                const isIndented = line.startsWith('  ')
                
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-2 ${isIndented ? 'ml-6' : ''} ${isMain ? 'font-medium' : ''} transition-all duration-300 nova-fade-in`}
                    style={{
                      animationDelay: `${index * 0.05}s`,
                    }}
                  >
                    {icon && <div className="mt-0.5 flex-shrink-0">{icon}</div>}
                    <div className="text-sm text-white/80 flex-1">
                      {formatLine(line)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!isComplete && isActive && showFullContent && (
            <div 
              className="px-6 pb-6 flex items-center gap-2 text-xs text-white/40"
              style={{
                animation: 'fadeIn 0.5s ease-out',
              }}
            >
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-[#00FF7F] rounded-full"
                    style={{
                      animation: `pulse 1s infinite ${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
              <span>Processing search results...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
