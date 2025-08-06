'use client'

import React, { useState, useEffect } from 'react'
import SearchProgress from '@/components/chat/SearchProgress'

export default function SearchDemoPage() {
  const [searchContent, setSearchContent] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchType, setSearchType] = useState<'web' | 'research'>('web')

  const webSearchSteps = [
    "🔍 Starting web search...",
    "🔍 Searching for: AI technology trends 2025",
    "  🌐 https://techcrunch.com/2025/ai-trends",
    "  🌐 https://www.forbes.com/ai-predictions-2025",
    "  🌐 https://mit.edu/research/ai-advancement",
    "📊 Analyzing search results...",
    "  Processing 15 relevant sources",
    "  Extracting key insights",
    "✅ Search complete!"
  ]

  const deepResearchSteps = [
    "🔬 Starting deep research mode...",
    "🔬 Research query: Impact of AI on healthcare",
    "📊 Analyzing academic sources...",
    "  🌐 https://pubmed.ncbi.nlm.nih.gov/12345678",
    "  🌐 https://nature.com/articles/ai-healthcare-2025",
    "  🌐 https://journals.plos.org/ai-medical-diagnosis",
    "🔍 Cross-referencing findings...",
    "  Validating data from 23 peer-reviewed papers",
    "  Synthesizing research insights",
    "📊 Generating comprehensive analysis...",
    "✅ Research analysis complete!"
  ]

  const startSearch = () => {
    if (isSearching) return
    
    setIsSearching(true)
    setSearchContent('')
    
    const steps = searchType === 'web' ? webSearchSteps : deepResearchSteps
    
    // Add steps progressively
    steps.forEach((step, index) => {
      setTimeout(() => {
        setSearchContent(prev => prev + (prev ? '\n' : '') + step)
        
        // Mark complete after last step
        if (index === steps.length - 1) {
          setTimeout(() => setIsSearching(false), 500)
        }
      }, index * 800)
    })
  }

  // Auto-start demo on page load
  useEffect(() => {
    // Auto-start after 1 second
    const timer = setTimeout(() => startSearch(), 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--nova-bg-primary)', padding: '2rem' }}>
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Search Progress Demo
        </h1>
        <p style={{ color: 'var(--nova-text-secondary)', marginBottom: '2rem' }}>
          See how Nova displays real-time search progress with enhanced visual feedback
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="searchType"
                value="web"
                checked={searchType === 'web'}
                onChange={(e) => setSearchType('web')}
                style={{ width: '1rem', height: '1rem' }}
              />
              <span style={{ color: searchType === 'web' ? 'var(--nova-primary)' : 'inherit' }}>
                Web Search Demo
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="searchType"
                value="research"
                checked={searchType === 'research'}
                onChange={(e) => setSearchType('research')}
                style={{ width: '1rem', height: '1rem' }}
              />
              <span style={{ color: searchType === 'research' ? 'var(--nova-accent)' : 'inherit' }}>
                Deep Research Demo
              </span>
            </label>
          </div>

          <button
            onClick={startSearch}
            disabled={isSearching}
            style={{
              padding: '0.75rem 2rem',
              borderRadius: '0.5rem',
              fontWeight: '500',
              backgroundColor: isSearching ? '#6b7280' : 'var(--nova-primary)',
              color: 'white',
              border: 'none',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            {isSearching ? 'Searching...' : `Start ${searchType === 'web' ? 'Web Search' : 'Deep Research'}`}
          </button>
        </div>

        {searchContent ? (
          <div style={{ 
            border: '1px solid var(--nova-border-primary)', 
            borderRadius: '0.5rem', 
            overflow: 'hidden',
            marginBottom: '2rem'
          }}>
            <SearchProgress content={searchContent} isActive={isSearching} />
          </div>
        ) : (
          <div style={{ 
            border: '1px solid var(--nova-border-primary)', 
            borderRadius: '0.5rem', 
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--nova-text-tertiary)',
            marginBottom: '2rem'
          }}>
            The demo will start automatically, or click the button above to restart
          </div>
        )}

        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Features Demonstrated
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, color: 'var(--nova-text-secondary)' }}>
            <li style={{ marginBottom: '0.5rem' }}>• Animated progress indicators with contextual icons (🔍 🔬 📊 ✅)</li>
            <li style={{ marginBottom: '0.5rem' }}>• Real-time status updates as search progresses</li>
            <li style={{ marginBottom: '0.5rem' }}>• Clickable URLs that show clean domain names</li>
            <li style={{ marginBottom: '0.5rem' }}>• Visual distinction between web search and deep research modes</li>
            <li style={{ marginBottom: '0.5rem' }}>• Smooth fade-in animations for each search step</li>
            <li style={{ marginBottom: '0.5rem' }}>• Loading dots animation for active searches</li>
            <li style={{ marginBottom: '0.5rem' }}>• Completion indicator when search finishes</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
