"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, X, Mic, Camera, Bell, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export function TelegramPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Check if user already connected Telegram
    async function checkConnection() {
      try {
        const res = await fetch('/api/bot/telegram/connect')
        if (!res.ok) return
        const data = await res.json()

        // If already connected, never show
        if (data.data?.connected) return

        // Show the prompt
        setShow(true)
      } catch { /* ignore */ }
    }

    // Small delay to not overlap with tutorial
    const timer = setTimeout(checkConnection, 2000)
    return () => clearTimeout(timer)
  }, [])

  function handleDismissSession() {
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 left-3 right-3 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[420px] z-50 animate-fade-in">
      <div className="bg-white dark:bg-[#1a1a22] rounded-2xl shadow-2xl shadow-black/20 border border-slate-200 dark:border-white/10 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div className="text-white">
              <p className="font-bold text-sm">Conecte o Telegram</p>
              <p className="text-[11px] text-white/80">Desbloqueie o melhor do Finn!</p>
            </div>
          </div>
          <button onClick={handleDismissSession} className="text-white/60 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Com o Telegram integrado, você pode controlar suas finanças sem nem abrir o app:
          </p>

          <div className="space-y-2.5 mb-4">
            {[
              { icon: MessageCircle, text: 'Registre gastos por mensagem de texto', color: 'text-blue-500' },
              { icon: Mic, text: 'Mande um áudio e a IA entende tudo', color: 'text-purple-500' },
              { icon: Camera, text: 'Tire foto do cupom fiscal e pronto', color: 'text-cyan-500' },
              { icon: Bell, text: 'Receba alertas antes do vencimento', color: 'text-amber-500' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2.5">
                <item.icon className={`h-4 w-4 ${item.color} shrink-0`} />
                <p className="text-xs text-slate-600 dark:text-slate-400">{item.text}</p>
              </div>
            ))}
          </div>

          <Link href="/bot">
            <Button className="w-full gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-md shadow-blue-500/25 hover:shadow-blue-500/40">
              Conectar agora — leva 30 segundos
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>

          <p className="text-[10px] text-slate-400 text-center mt-2">
            Você pode conectar depois em Assistente no menu lateral.
          </p>
        </div>
      </div>
    </div>
  )
}
