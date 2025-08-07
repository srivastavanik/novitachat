import React, { useState, useEffect, useRef } from 'react'
import { ChevronRight, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

interface ThinkingDisplayProps {
  content: string
  isActive: boolean
}

export default function ThinkingDisplay({ content, isActive }: ThinkingDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [content])

  // Auto-collapse when thinking completes
  useEffect(() => {
    if (!isActive && isExpanded) {
      // Keep it expanded for a moment to show completion
      setTimeout(() => setIsExpanded(false), 500)
    }
  }, [isActive])

  return (
    <div className="px-4 py-2 will-change-transform"> {/* Add will-change for better performance */}
      <div 
        className={`inline-flex items-center gap-2 cursor-pointer select-none transition-all duration-300 ${
          isActive ? 'opacity-40 hover:opacity-60' : 'opacity-30 hover:opacity-50'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronRight 
          className={`h-3 w-3 text-white/40 transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : ''
          }`} 
        />
        <span className="text-sm text-white/40">
          {isActive ? 'Thinking...' : 'Reasoning complete'}
        </span>
        {isActive && (
          <div className="relative w-3 h-3">
            <div className="absolute inset-0 rounded-full bg-purple-500/20"></div>
            <div className="absolute inset-0 rounded-full border border-purple-500/40 animate-ping"></div>
            <Loader2 className="h-3 w-3 text-purple-400 animate-spin" />
          </div>
        )}
      </div>

      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out will-change-auto`}
        style={{ 
          maxHeight: isExpanded ? `${contentHeight + 24}px` : '0px',
          opacity: isExpanded ? 1 : 0,
          transform: 'translateZ(0)' // Force hardware acceleration
        }}
      >
        <div 
          ref={contentRef}
          className="mt-3 p-4 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm"
        >
          <div className="text-xs text-white/50 leading-relaxed">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({children}) => <p className="mb-1.5 last:mb-0">{children}</p>,
                code: ({children}) => (
                  <code className="bg-white/10 px-1 py-0.5 rounded text-[#00FF7F]/80 text-[10px]">
                    {children}
                  </code>
                ),
                strong: ({children}) => <strong className="text-white/70 font-medium">{children}</strong>,
                em: ({children}) => <em className="text-white/60">{children}</em>,
                ul: ({children}) => <ul className="list-disc list-inside mb-1.5 ml-2 space-y-0.5">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal list-inside mb-1.5 ml-2 space-y-0.5">{children}</ol>,
                li: ({children}) => <li className="mb-0.5 text-white/50">{children}</li>,
                blockquote: ({children}) => (
                  <blockquote className="border-l-2 border-white/20 pl-2 my-1.5 text-white/40">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {content || 'Processing reasoning steps...'}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}
