"use client"

import { AuthProvider } from '@/contexts/auth-context'
import { Shield, Sparkles, MessageCircle, BarChart3, Lock } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex">
        {/* Left panel — showcase */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.05),transparent_50%)]" />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/icons/icon-192.png" alt="Finn" className="h-10 w-10 rounded-xl shadow-lg" />
              <span className="text-xl font-extrabold text-white tracking-tight">Finn</span>
            </Link>

            {/* Main message */}
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4">
                  Suas finanças no<br />
                  controle com{' '}
                  <span className="text-indigo-200">inteligência artificial.</span>
                </h1>
                <p className="text-lg text-white/70 max-w-md">
                  O Finn organiza, alerta e sugere — para que você nunca mais perca dinheiro por descuido.
                </p>
              </div>

              {/* Feature pills */}
              <div className="space-y-3">
                {[
                  { icon: Sparkles, text: 'IA que analisa seus gastos e sugere economia' },
                  { icon: MessageCircle, text: 'Registre despesas por texto, áudio ou foto' },
                  { icon: BarChart3, text: 'Dashboards e relatórios em tempo real' },
                  { icon: Shield, text: 'Dados criptografados — só você tem acesso' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 shrink-0">
                      <item.icon className="h-4 w-4 text-white/80" />
                    </div>
                    <p className="text-sm text-white/70">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom trust */}
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Lock className="h-3.5 w-3.5" />
              <span>Criptografia de ponta a ponta · LGPD · Seus dados são só seus</span>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-[#0f0f12] p-6">
          <div className="w-full max-w-[420px]">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
              <Link href="/" className="flex items-center gap-2.5">
                <img src="/icons/icon-192.png" alt="Finn" className="h-10 w-10 rounded-xl shadow-md" />
                <span className="text-xl font-extrabold tracking-tight">Finn</span>
              </Link>
            </div>
            {children}
          </div>
        </div>
      </div>
    </AuthProvider>
  )
}
