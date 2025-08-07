'use client'

import { useState, useEffect } from 'react'
import { X, Key, ExternalLink, AlertCircle, Check, Loader2 } from 'lucide-react'
import axios from '@/lib/axios-config'

interface ApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (apiKey: string) => void
  currentKey?: string
  reason?: 'limit_exceeded' | 'no_credits' | 'setup'
  limitType?: 'total' | 'webSearch' | 'deepResearch'
}

export default function ApiKeyModal({ 
  isOpen, 
  onClose, 
  onSave, 
  currentKey = '',
  reason = 'setup',
  limitType = 'total'
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState(currentKey)
  const [isValidating, setIsValidating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setApiKey(currentKey)
      setError('')
      setSuccess(false)
    }
  }, [isOpen, currentKey])

  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key')
      return false
    }

    if (!apiKey.startsWith('sk_')) {
      setError('Invalid API key format. Novita API keys should start with "sk_"')
      return false
    }

    setIsValidating(true)
    setError('')

    try {
      // Validate the API key with the backend
      const response = await axios.post('/api/auth/validate-api-key', { apiKey })
      
      if (response.data.valid) {
        return true
      } else {
        setError(response.data.message || 'Invalid API key')
        return false
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to validate API key')
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    const isValid = await validateApiKey()
    if (!isValid) return

    setIsSaving(true)
    setError('')

    try {
      // Save the API key to the user's account
      await axios.post('/api/auth/save-api-key', { apiKey })
      
      setSuccess(true)
      onSave(apiKey)
      
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save API key')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const getReasonMessage = () => {
    switch (reason) {
      case 'limit_exceeded':
        const limitNames = {
          total: 'daily query',
          webSearch: 'web search',
          deepResearch: 'deep research'
        }
        return `You've reached your ${limitNames[limitType]} limit. Add your own Novita API key to continue without restrictions.`
      case 'no_credits':
        return 'Your API key has insufficient credits. Please add funds to your Novita account or wait for the daily limit to reset.'
      default:
        return 'Add your Novita API key to unlock unlimited usage and bypass daily limits.'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-white/20 rounded-2xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white/80 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#00FF7F]/10 mb-4">
            <Key className="h-8 w-8 text-[#00FF7F]" />
          </div>
          
          <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">
            {reason === 'no_credits' ? 'API Key Out of Credits' : 'Add Your API Key'}
          </h2>
          
          <p className="text-gray-600 dark:text-white/60 text-sm">
            {getReasonMessage()}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm mb-4 flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>API key saved successfully!</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
              Novita API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_..."
              className="w-full px-3 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:border-[#00FF7F]/50 focus:ring-1 focus:ring-[#00FF7F]/50 font-mono text-sm"
              disabled={isValidating || isSaving}
            />
          </div>

          <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-white/80">How to get your API key:</h3>
            <ol className="space-y-2 text-sm text-gray-600 dark:text-white/60">
              <li className="flex items-start gap-2">
                <span className="text-[#00FF7F] font-medium">1.</span>
                <span>Visit the Novita AI dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00FF7F] font-medium">2.</span>
                <span>Navigate to API Keys section</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00FF7F] font-medium">3.</span>
                <span>Create a new API key or copy an existing one</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00FF7F] font-medium">4.</span>
                <span>Ensure your account has sufficient credits</span>
              </li>
            </ol>
            
            <a
              href="https://novita.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#00FF7F] hover:text-[#00FF7F]/80 transition-colors text-sm font-medium mt-2"
            >
              <span>Get your API key</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-white font-medium rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              disabled={isValidating || isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!apiKey.trim() || isValidating || isSaving}
              className="flex-1 py-3 bg-gradient-to-r from-[#00FF7F] to-[#00D96A] text-black font-medium rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Save API Key</span>
                </>
              )}
            </button>
          </div>
        </div>

        {reason === 'limit_exceeded' && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-white/40 text-center">
              Your personal API key will be used automatically when daily limits are reached
            </p>
          </div>
        )}
      </div>
    </div>
  )
}