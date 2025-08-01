'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/external-auth/url");

      if (!response.ok) {
        throw new Error("Failed to get auth URL");
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
              Nova
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Please log in with your Novita account to continue
            </p>
          </div>

          {/* Login Button */}
          <div className="space-y-4">
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className={cn(
                "w-full h-11 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:opacity-50 disabled:pointer-events-none",
                "shadow-sm hover:shadow-md"
              )}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connecting...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <svg width="24" height="15" viewBox="0 0 24 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                    <path d="M24 14.8323V14.8326H14.3246L9.16716 9.67507V14.8326H0V14.8314L9.16716 5.66422V0H9.16774L24 14.8323Z" fill="white"/>
                  </svg>
                  <span>Continue with Novita</span>
                </div>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Secure Authentication
              </span>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link 
            href="/" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
