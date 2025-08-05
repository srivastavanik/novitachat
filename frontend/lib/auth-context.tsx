'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from './axios-config'

interface User {
  id: string
  email: string
  username: string
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Skip auth check if in trial mode
    const urlParams = new URLSearchParams(window.location.search)
    const isTrialMode = urlParams.get('trial') === 'true'
    
    if (!isTrialMode) {
      checkAuth()
    } else {
      // Set trial user immediately for trial mode
      setUser({
        id: 'trial-user',
        email: 'trial@nova.ai',
        username: 'Trial User'
      })
      setLoading(false)
    }
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token')
      
      // Check if we're in trial mode
      const urlParams = new URLSearchParams(window.location.search)
      const isTrial = urlParams.get('trial') === 'true'
      
      if (!token && !isTrial) {
        setLoading(false)
        return
      }

      if (isTrial) {
        // Set a trial user for trial mode
        setUser({
          id: 'trial-user',
          email: 'trial@nova.ai',
          username: 'Trial User'
        })
        setLoading(false)
        return
      }
      
      const response = await axios.get('/api/auth/me')
      setUser(response.data.user)
    } catch (error) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await axios.post('/api/auth/login', { email, password })
    if (response.data.tokens) {
      localStorage.setItem('access_token', response.data.tokens.accessToken)
      localStorage.setItem('refresh_token', response.data.tokens.refreshToken)
    }
    setUser(response.data.user)
    // Set auth header immediately after login
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.tokens.accessToken}`
  }

  const register = async (email: string, password: string, username: string) => {
    const response = await axios.post('/api/auth/register', { email, password, username })
    if (response.data.tokens) {
      localStorage.setItem('access_token', response.data.tokens.accessToken)
      localStorage.setItem('refresh_token', response.data.tokens.refreshToken)
    }
    setUser(response.data.user)
    // Set auth header immediately after register
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.tokens.accessToken}`
  }

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout')
    } catch (error) {
      // Continue with logout even if API call fails
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  const refreshToken = async () => {
    const refreshTokenValue = localStorage.getItem('refresh_token')
    if (!refreshTokenValue) {
      throw new Error('No refresh token')
    }
    const response = await axios.post('/api/auth/refresh', { refreshToken: refreshTokenValue })
    localStorage.setItem('access_token', response.data.accessToken)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
