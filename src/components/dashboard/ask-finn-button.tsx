"use client"

import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Botão "Perguntar ao Finn" — abre WhatsApp já com a pergunta pré-populada.
 * Implementa a "oportunidade branca #1" identificada pela auditoria competitiva:
 * a ponte dashboard ↔ chat com contexto, que nenhum PFM faz.
 *
 * Usado em qualquer card do dashboard que tenha contexto pra perguntar
 * ao agente (ex: insight da semana, fatura subindo, meta atrasada).
 */

const FINN_WHATSAPP_NUMBER = '5585987942255'

interface AskFinnButtonProps {
  question: string
  variant?: 'whatsapp' | 'ghost'
  size?: 'sm' | 'default'
  className?: string
}

export function AskFinnButton({
  question,
  variant = 'whatsapp',
  size = 'sm',
  className,
}: AskFinnButtonProps) {
  const url = `https://wa.me/${FINN_WHATSAPP_NUMBER}?text=${encodeURIComponent(question)}`

  if (variant === 'whatsapp') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Button
          size={size}
          className={cn(
            'bg-[#25D366] hover:bg-[#1faa53] text-white shadow-sm gap-1.5 h-8',
            className,
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Perguntar ao Finn
        </Button>
      </a>
    )
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Button
        size={size}
        variant="ghost"
        className={cn('gap-1.5 h-8 text-xs', className)}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Perguntar ao Finn
      </Button>
    </a>
  )
}
