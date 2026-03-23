"use client"

import { AuthProvider } from '@/contexts/auth-context'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex">
        {/* Left panel - desktop only */}
        <div className="hidden lg:flex lg:flex-1 gradient-primary animate-gradient relative overflow-hidden items-center justify-center">
          {/* Decorative circles */}
          <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/5" />
          <div className="absolute top-1/3 right-1/3 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute bottom-1/4 left-1/4 h-24 w-24 rounded-full bg-white/10" />

          <div className="relative z-10 text-center text-white px-12 max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm text-white font-bold text-3xl">
              F
            </div>
            <h1 className="text-4xl font-bold mb-3">Finn</h1>
            <p className="text-lg text-white/80">
              Gerencie suas finanças de forma inteligente e visual
            </p>
          </div>
        </div>

        {/* Right panel - form */}
        <div className="flex-1 flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </AuthProvider>
  )
}
