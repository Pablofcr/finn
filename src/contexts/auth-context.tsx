"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  resendConfirmation: (email: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    // Honor ?next= from the login URL — guarded against open-redirect (must be a relative path).
    let target = '/dashboard'
    if (typeof window !== 'undefined') {
      const next = new URLSearchParams(window.location.search).get('next')
      if (next && next.startsWith('/') && !next.startsWith('//')) target = next
    }
    router.push(target)
    return { error: null }
  }, [supabase.auth, router])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    })
    if (error) return { error: error.message }
    return { error: null }
  }, [supabase.auth])

  const signInWithGoogle = useCallback(async () => {
    let next = ''
    const fromUrl = new URLSearchParams(window.location.search).get('next')
    if (fromUrl && fromUrl.startsWith('/') && !fromUrl.startsWith('//')) {
      next = `?next=${encodeURIComponent(fromUrl)}`
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback${next}`,
      },
    })
  }, [supabase.auth])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [supabase.auth, router])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) return { error: error.message }
    return { error: null }
  }, [supabase.auth])

  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) return { error: error.message }
    return { error: null }
  }, [supabase.auth])

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signOut, resetPassword, resendConfirmation }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
