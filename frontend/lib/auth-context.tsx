'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Configure axios defaults
axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
axios.defaults.withCredentials = true

// Add auth token to requests
axios.interceptors.request.use(
  (config) => {
    const token = getCookie('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle token refresh on 401
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const response = await axios.post('/api/auth/refresh')
        setCookie('access_token', response.data.access_token, { 
          expires: 7, // 7 days
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        })
        originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`
        return axios(originalRequest)
      } catch (refreshError) {
        removeCookie('access_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

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
      const response = await axios.get('/api/auth/profile')
      setUser(response.data.user)
    } catch (error) {
      removeCookie('access_token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await axios.post('/api/auth/login', { email, password })
    setCookie('access_token', response.data.access_token, {
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })
    setUser(response.data.user)
  }

  const register = async (email: string, password: string, username: string) => {
    const response = await axios.post('/api/auth/register', { email, password, username })
    setCookie('access_token', response.data.access_token, {
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })
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
    setCookie('access_token', response.data.access_token, {
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })
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
