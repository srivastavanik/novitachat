'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from './axios-config'
import { getCookie, setCookie, removeCookie } from './utils'

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
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = getCookie('access_token')
      
      if (!token) {
        setLoading(false)
        return
      }
      
      const response = await axios.get('/api/auth/me')
      setUser(response.data.user)
    } catch (error) {
      removeCookie('access_token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await axios.post('/api/auth/login', { email, password })
    
    // Handle both response formats
    if (response.data.access_token) {
      setCookie('access_token', response.data.access_token, {
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
      // Set auth header immediately after login
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`
    } else if (response.data.tokens) {
      setCookie('access_token', response.data.tokens.accessToken, {
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
      // Set auth header immediately after login
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.tokens.accessToken}`
    }
    
    setUser(response.data.user)
  }

  const register = async (email: string, password: string, username: string) => {
    const response = await axios.post('/api/auth/register', { email, password, username })
    
    // Handle both response formats
    if (response.data.access_token) {
      setCookie('access_token', response.data.access_token, {
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
      // Set auth header immediately after register
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`
    } else if (response.data.tokens) {
      setCookie('access_token', response.data.tokens.accessToken, {
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
      // Set auth header immediately after register
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.tokens.accessToken}`
    }
    
    setUser(response.data.user)
  }

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout')
    } catch (error) {
      // Continue with logout even if API call fails
    }
    removeCookie('access_token')
    setUser(null)
  }

  const refreshToken = async () => {
    const response = await axios.post('/api/auth/refresh')
    if (response.data.access_token) {
      setCookie('access_token', response.data.access_token, {
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    } else if (response.data.accessToken) {
      setCookie('access_token', response.data.accessToken, {
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshToken, checkAuth }}>
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
