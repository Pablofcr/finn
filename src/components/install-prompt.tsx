"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X, Smartphone } from 'lucide-react'

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
    // Check if already dismissed
    const dismissed = localStorage.getItem('finn-install-dismissed')
    if (dismissed) return

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(isIOSDevice)

    if (isIOSDevice) {
      // iOS doesn't support beforeinstallprompt — show manual guide after delay
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => clearTimeout(timer)
    }

    // Android/Desktop — listen for install prompt
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
    localStorage.setItem('finn-install-dismissed', 'true')
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[380px] z-50 animate-fade-in">
      <div className="bg-white dark:bg-[#1a1a22] rounded-2xl shadow-2xl shadow-black/20 border border-slate-200 dark:border-white/10 p-4">
        {showIOSGuide ? (
          /* iOS manual install guide */
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold shrink-0">
                  F
                </div>
                <div>
                  <p className="font-semibold text-sm">Como instalar no iPhone</p>
                </div>
              </div>
              <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Rapido e facil — so 3 toques:</p>
            <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
              <p className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 text-[10px] font-bold shrink-0">1</span>
                Toque nos <strong>tres pontinhos</strong> <span className="text-xs text-slate-400">(menu do navegador)</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 text-[10px] font-bold shrink-0">2</span>
                <strong>&quot;Adicionar a Tela de Inicio&quot;</strong>
              </p>
              <p className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 text-[10px] font-bold shrink-0">3</span>
                Confirme e pronto — o Finn vira um app!
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDismiss} className="w-full">
              Entendi
            </Button>
          </div>
        ) : (
          /* Install prompt */
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg shrink-0 shadow-lg shadow-indigo-500/25">
              F
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">Instale o Finn</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Acesse rapido direto da sua tela inicial. Funciona como um app!
                  </p>
                </div>
                <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-600 p-1 shrink-0">
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
                  Instalar
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-xs text-slate-400">
                  Agora nao
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
