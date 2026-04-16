"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    // Check if dismissed recently (expires after 7 days)
    const dismissed = localStorage.getItem('finn-install-dismissed')
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10)
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - dismissedAt < sevenDays) return
      localStorage.removeItem('finn-install-dismissed')
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(isIOSDevice)

    if (isIOSDevice) {
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => clearTimeout(timer)
    }

    // Android/Desktop
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (isIOS) {
      setShowIOSGuide(true)
      return
    }

    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setShowBanner(false)
    setShowIOSGuide(false)
    localStorage.setItem('finn-install-dismissed', String(Date.now()))
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 left-3 right-3 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[400px] z-50 animate-fade-in">
      <div className="bg-white dark:bg-[#1a1a22] rounded-2xl shadow-2xl shadow-black/20 border border-slate-200 dark:border-white/10 overflow-hidden">
        {showIOSGuide ? (
          /* iOS manual install guide — friendly and visual */
          <div>
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/icons/icon-192.png" alt="Finn" className="h-10 w-10 rounded-xl shadow-md" />
                <div className="text-white">
                  <p className="font-bold text-sm">Instale o Finn no seu celular</p>
                  <p className="text-[11px] text-white/80">É rápido! Siga os 3 passos abaixo:</p>
                </div>
              </div>
              <button onClick={handleDismiss} className="text-white/60 hover:text-white p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Steps */}
            <div className="px-5 py-5 space-y-4">
              {/* Step 1 — Three dots HORIZONTAL */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-indigo-500">
                    <circle cx="5" cy="12" r="2" fill="currentColor"/>
                    <circle cx="12" cy="12" r="2" fill="currentColor"/>
                    <circle cx="19" cy="12" r="2" fill="currentColor"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    <span className="text-indigo-500 mr-1">1.</span>
                    Toque nos três pontinhos
                  </p>
                  <p className="text-[11px] text-slate-400">No canto do navegador (menu de opções)</p>
                </div>
              </div>

              {/* Step 2 — Share icon (iOS style: square with arrow up) */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                    <rect x="4" y="8" width="16" height="14" rx="2"/>
                    <path d="M12 2v12"/>
                    <path d="M8 6l4-4 4 4"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    <span className="text-indigo-500 mr-1">2.</span>
                    Toque em Compartilhar
                  </p>
                  <p className="text-[11px] text-slate-400">O ícone de quadrado com seta para cima</p>
                </div>
              </div>

              {/* Step 3 — Add to home screen (plus in square) */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                    <path d="M12 8v8"/>
                    <path d="M8 12h8"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    <span className="text-indigo-500 mr-1">3.</span>
                    Adicionar à Tela de Início
                  </p>
                  <p className="text-[11px] text-slate-400">Toque e confirme — é só isso!</p>
                </div>
              </div>
            </div>

            {/* Friendly closing message */}
            <div className="px-5 pb-5">
              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 text-center mb-3">
                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                  Prontinho! Agora você já terá o Finn no seu celular, igualzinho a um app.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDismiss} className="w-full">
                Entendi, obrigado!
              </Button>
            </div>
          </div>
        ) : (
          /* Install prompt — friendly */
          <div className="p-5">
            <div className="flex items-start gap-3">
              <img src="/icons/icon-192.png" alt="Finn" className="h-12 w-12 rounded-xl shadow-lg shadow-indigo-500/25 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Leve o Finn com você!</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Instale na sua tela inicial e acesse suas finanças com um toque. Rápido e prático!
                    </p>
                  </div>
                  <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-600 p-1 shrink-0 ml-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleInstall}
                    className="gap-1.5 gradient-primary shadow-md shadow-primary/25 border-0 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Instalar agora
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-xs text-slate-400">
                    Depois
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
