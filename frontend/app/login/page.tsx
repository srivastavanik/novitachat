'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      router.push('/chat')
    }
  }, [user, router])

  const handleLogin = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/external-auth/url");

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
    <div className="flex min-h-screen items-center justify-center bg-black text-white px-4 relative overflow-hidden">
      {/* Liquid Glass Background Layers */}
      <div className="grain-overlay"></div>
      <div className="gradient-grid"></div>
      <div className="radial-glow"></div>
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-8">
            <span className="text-2xl font-medium">Nova</span>
          </Link>
          <h2 className="text-4xl font-light">Welcome back</h2>
          <p className="mt-2 text-sm text-white/60">
            Sign in to your Nova account
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="feature-card p-8">
            <div className="space-y-6">
              <p className="text-center text-sm text-white/60 mb-6">
                Please log in with your Novita account to continue
              </p>

              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-[#00FF7F] to-[#00D96A] text-black font-medium rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Connecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg width="24" height="15" viewBox="0 0 24 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                      <path d="M24 14.8323V14.8326H14.3246L9.16716 9.67507V14.8326H0V14.8314L9.16716 5.66422V0H9.16774L24 14.8323Z" fill="black"/>
                    </svg>
                    <span>Continue with Novita</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </button>

              {/* Divider */}
              <div className="relative mt-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-white/40">
                    Secure Authentication
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-white/60">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-[#00FF7F] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
