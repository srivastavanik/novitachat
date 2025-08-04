import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Cookie utility functions
export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

export function setCookie(name: string, value: string, options: {
  expires?: Date | number
  path?: string
  domain?: string
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
} = {}): void {
  if (typeof window === 'undefined') return

  let cookieString = `${name}=${value}`
  
  if (options.expires) {
    if (typeof options.expires === 'number') {
      const date = new Date()
      date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000))
      cookieString += `; expires=${date.toUTCString()}`
    } else {
      cookieString += `; expires=${options.expires.toUTCString()}`
    }
  }
  
  if (options.path) {
    cookieString += `; path=${options.path}`
  } else {
    cookieString += `; path=/`
  }
  
  if (options.domain) {
    cookieString += `; domain=${options.domain}`
  }
  
  if (options.secure) {
    cookieString += `; secure`
  }
  
  if (options.sameSite) {
    cookieString += `; samesite=${options.sameSite}`
  }
  
  document.cookie = cookieString
}

export function removeCookie(name: string, options: {
  path?: string
  domain?: string
} = {}): void {
  setCookie(name, '', {
    ...options,
    expires: new Date(0)
  })
}
