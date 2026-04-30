"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircle, X } from 'lucide-react'
import { toast } from 'sonner'

interface WhatsAppNudgeBannerProps {
  /** True se o user JÁ conectou. Não renderiza nesse caso. */
  connected: boolean
  /** Quantas vezes o user já dispensou. Após 2, paramos de mostrar. */
  dismissedCount: number
  /** Callback pra parent re-fetchar /api/user e atualizar o estado. */
  onDismissed?: () => void
}

const DISMISS_LIMIT = 2

export function WhatsAppNudgeBanner({
  connected,
  dismissedCount,
  onDismissed,
}: WhatsAppNudgeBannerProps) {
  const [hiding, setHiding] = useState(false)

  // Hide rules: já conectou OU dispensou ≥2 vezes (pra parar de encher o saco)
  if (connected || dismissedCount >= DISMISS_LIMIT || hiding) return null

  async function handleDismiss() {
    setHiding(true) // remove imediatamente da UI; servidor confirma em background
    try {
      const res = await fetch('/api/user/whatsapp-nudge-dismiss', { method: 'POST' })
      if (!res.ok) throw new Error('failed')
      onDismissed?.()
    } catch {
      // Falha silenciosa — banner some na sessão atual mesmo assim.
      toast.error('Não rolou registrar. Tenta de novo depois.')
    }
  }

  return (
    <Card className="border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-500/5 overflow-hidden">
      <CardContent className="px-4 py-3 sm:py-4">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-500/15 shrink-0">
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-snug">
              Registre gastos pelo WhatsApp — é só mandar mensagem.
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Mande um áudio, foto do cupom ou escreva. O Finn anota tudo.
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link href="/bot">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-1.5"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Conectar WhatsApp</span>
                <span className="sm:hidden">Conectar</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Agora não"
              title="Agora não"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
