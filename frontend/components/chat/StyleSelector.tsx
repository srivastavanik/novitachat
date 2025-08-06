'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface Style {
  id: string
  name: string
  description: string
  systemPrompt: string
  icon: string
}

const styles: Style[] = [
  {
    id: 'normal',
    name: 'Normal',
    description: 'Default conversational style',
    systemPrompt: '',
    icon: ''
  },
  {
    id: 'formal',
    name: 'Formal',
    description: 'Professional and business-like',
    systemPrompt: `You are a highly professional AI assistant. Your responses should be:
- Formal and business-appropriate in tone
- Well-structured with clear organization
- Using professional vocabulary and complete sentences
- Avoiding colloquialisms, slang, or casual expressions
- Presenting information in a clear, concise manner
- Using proper grammar and punctuation throughout
- Addressing the user respectfully
- Providing thorough but efficient responses`,
    icon: ''
  },
  {
    id: 'explanatory',
    name: 'Explanatory',
    description: 'Detailed educational responses',
    systemPrompt: `You are an educational AI assistant focused on deep understanding. Your responses should:
- Provide comprehensive explanations with multiple examples
- Break down complex concepts into digestible parts
- Use analogies and metaphors to clarify difficult ideas
- Include relevant background information and context
- Define technical terms when first introduced
- Explain the "why" behind concepts, not just the "what"
- Anticipate and address potential follow-up questions
- Structure explanations progressively from basic to advanced
- Use clear headings and bullet points for organization
- Summarize key takeaways at the end`,
    icon: ''
  },
  {
    id: 'concise',
    name: 'Concise',
    description: 'Brief and to-the-point',
    systemPrompt: `You are a concise AI assistant. Your responses should be:
- Brief and directly addressing the query
- Using minimal words while maintaining clarity
- Avoiding unnecessary elaboration or examples
- Getting straight to the point
- Using bullet points for multiple items
- Eliminating redundancy
- Focusing only on essential information
- Providing short, actionable answers`,
    icon: ''
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Imaginative and innovative',
    systemPrompt: `You are a creative AI assistant with an innovative mindset. Your responses should:
- Think outside the box and offer unique perspectives
- Use vivid, descriptive language and metaphors
- Propose unconventional solutions and ideas
- Draw connections between seemingly unrelated concepts
- Include creative examples and scenarios
- Encourage imaginative thinking
- Use storytelling when appropriate
- Explore "what if" scenarios
- Challenge conventional wisdom respectfully
- Present multiple creative alternatives`,
    icon: ''
  },
  {
    id: 'socratic',
    name: 'Socratic',
    description: 'Guide through questions',
    systemPrompt: `You are a Socratic AI assistant who guides through questioning. Your approach should:
- Lead users to discover answers through thoughtful questions
- Ask clarifying questions to understand the user's perspective
- Challenge assumptions constructively
- Encourage critical thinking and self-reflection
- Guide exploration of topics rather than giving direct answers
- Use questions to reveal contradictions or gaps in reasoning
- Help users build their own understanding
- Provide gentle guidance when users are stuck
- Celebrate insights the user discovers
- Balance questioning with necessary information`,
    icon: ''
  }
]

interface StyleSelectorProps {
  onStyleChange?: (style: Style) => void
  defaultStyle?: string
}

export default function StyleSelector({ onStyleChange, defaultStyle = 'normal' }: StyleSelectorProps) {
  const [selectedStyle, setSelectedStyle] = useState<Style>(
    styles.find(s => s.id === defaultStyle) || styles[0]
  )
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Load saved style preference
    const savedStyleId = localStorage.getItem('nova-conversation-style')
    if (savedStyleId) {
      const savedStyle = styles.find(s => s.id === savedStyleId)
      if (savedStyle) {
        setSelectedStyle(savedStyle)
        onStyleChange?.(savedStyle)
      }
    }
  }, [])

  const handleStyleSelect = (style: Style) => {
    setSelectedStyle(style)
    localStorage.setItem('nova-conversation-style', style.id)
    onStyleChange?.(style)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--nova-bg-tertiary)] hover:bg-[var(--nova-bg-hover)] transition-all text-sm"
      >
        <img 
          src="/style-icon.png" 
          alt="Style" 
          className="h-4 w-4 object-contain brightness-0 dark:brightness-100"
          style={{ filter: 'invert(var(--icon-invert, 0))' }}
        />
        <span className="font-medium text-[var(--nova-text-primary)]">
          Styles
        </span>
        <ChevronDown className={`h-4 w-4 text-[var(--nova-text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full right-0 mb-2 w-80 rounded-xl border border-[var(--nova-border-primary)] bg-[var(--nova-bg-tertiary)] shadow-2xl z-50">
            <div className="p-3 border-b border-[var(--nova-border-primary)]">
              <h3 className="font-medium text-sm text-[var(--nova-text-primary)]">Conversation Style</h3>
              <p className="text-xs text-[var(--nova-text-tertiary)] mt-1">Choose how Chat responds to you</p>
            </div>
            
            <div className="p-2 max-h-96 overflow-y-auto">
              {styles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleStyleSelect(style)}
                  className={`w-full text-left p-3 rounded-lg hover:bg-[var(--nova-bg-hover)] transition-colors ${
                    selectedStyle.id === style.id ? 'bg-[var(--nova-primary)]/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-[var(--nova-text-primary)]">
                        {style.name}
                      </div>
                      <div className="text-xs text-[var(--nova-text-tertiary)] mt-1">
                        {style.description}
                      </div>
                    </div>
                    {selectedStyle.id === style.id && (
                      <div className="mt-1">
                        <div className="h-2 w-2 rounded-full bg-[var(--nova-primary)]" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="p-3 border-t border-[var(--nova-border-primary)]">
              <p className="text-xs text-[var(--nova-text-tertiary)] text-center">
                Style preference is saved across conversations
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
