"use client"

import { useState, useEffect, useCallback } from 'react'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Skeleton } from '@/components/ui/skeleton'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

function AppContent({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth()
  const [checkingAccounts, setCheckingAccounts] = useState(true)
  const [hasAccounts, setHasAccounts] = useState(true)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts')
      const data = await res.json()
      setHasAccounts(data.data?.length > 0)
    } catch {
      setHasAccounts(true)
    } finally {
      setCheckingAccounts(false)
    }
  }, [])

  useEffect(() => {
    if (user && !loading) {
      fetchAccounts()
    }
  }, [user, loading, fetchAccounts])

  if (loading || checkingAccounts) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    )
  }

  if (!hasAccounts) {
    return <OnboardingWizard onComplete={() => setHasAccounts(true)} />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  )
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  )
}
