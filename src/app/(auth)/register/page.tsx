"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function RegisterPage() {
  const { signUp, signInWithGoogle, resendConfirmation } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendFeedback, setResendFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  async function handleResend() {
    setResendFeedback(null)
    const result = await resendConfirmation(email)
    if (result.error) {
      setResendFeedback('Não conseguimos reenviar agora. Tente em alguns segundos.')
    } else {
      setResendFeedback('E-mail reenviado! Confira sua caixa de entrada e o spam.')
      setResendCooldown(60)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('As senhas estão diferentes. Confira e tente de novo.')
      return
    }

    if (password.length < 6) {
      setError('Sua senha precisa ter no mínimo 6 caracteres para manter sua conta segura.')
      return
    }

    setLoading(true)
    const result = await signUp(email, password, name)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="animate-fade-in w-full max-w-md mx-auto">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-lg shadow-indigo-500/5 p-6 sm:p-8">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-white" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </div>

          <div className="text-center mb-7">
            <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 dark:text-white tracking-tight mb-2">
              Cadastro feito! Falta só ativar.
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
              Enviamos um link de confirmação para
              <span className="block mt-1 font-semibold text-slate-700 dark:text-slate-200 break-all">
                {email}
              </span>
            </p>
          </div>

          <ol className="space-y-3 mb-6">
            <li className="flex gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] p-3.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-[13px] font-bold text-indigo-600 dark:text-indigo-300">
                1
              </span>
              <p className="text-sm leading-6 text-slate-700 dark:text-slate-300 pt-0.5">
                Abra seu e-mail no celular ou computador.
              </p>
            </li>

            <li className="flex gap-3 rounded-xl border border-amber-300/70 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-500/10 p-3.5 ring-1 ring-amber-200/60 dark:ring-amber-400/10">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[13px] font-bold text-white shadow-sm">
                2
              </span>
              <div className="pt-0.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true">
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  </svg>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Atenção
                  </span>
                </div>
                <p className="text-sm leading-6 text-amber-900 dark:text-amber-100 font-medium">
                  Confira a pasta de spam ou lixo eletrônico — às vezes ele se esconde por lá. Se encontrar, marque como "não é spam".
                </p>
              </div>
            </li>

            <li className="flex gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] p-3.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-[13px] font-bold text-indigo-600 dark:text-indigo-300">
                3
              </span>
              <p className="text-sm leading-6 text-slate-700 dark:text-slate-300 pt-0.5">
                Clique em <strong>Ativar minha conta</strong> no e-mail do Finn.
              </p>
            </li>
          </ol>

          <div className="space-y-2.5">
            <a
              href={`mailto:${email}`}
              className="flex items-center justify-center w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-[15px] shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              Abrir e-mail
            </a>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="flex items-center justify-center w-full h-12 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 font-semibold text-[15px] hover:bg-slate-50 dark:hover:bg-white/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar e-mail'}
            </button>
            {resendFeedback && (
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
                {resendFeedback}
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Já confirmou seu e-mail?{' '}
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
            Fazer login
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Crie sua conta grátis</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Comece a controlar suas finanças em menos de 2 minutos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">Nome</Label>
          <Input
            id="name"
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 focus-visible:ring-indigo-500/30"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 focus-visible:ring-indigo-500/30"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 focus-visible:ring-indigo-500/30"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">Confirmar</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 rounded-xl bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 focus-visible:ring-indigo-500/30"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] transition-all border-0 text-base"
          disabled={loading}
        >
          {loading ? 'Criando sua conta...' : 'Começar agora — é grátis'}
        </Button>
      </form>

      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-50 dark:bg-[#0f0f12] px-3 text-slate-400">ou continue com</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full h-12 rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
        onClick={signInWithGoogle}
        type="button"
      >
        <svg className="mr-2.5 h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continuar com Google
      </Button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8">
        Já tem conta?{' '}
        <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
          Entrar
        </Link>
      </p>
    </div>
  )
}
