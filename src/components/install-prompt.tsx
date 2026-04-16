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
    localStorage.setItem('finn-install-dismissed', String(Date.now()))
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
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Rápido e fácil — só 3 toques:</p>
            <div className="flex items-center justify-between gap-2">
              {/* Step 1 - Three dots */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-slate-600 dark:text-slate-300">
                    <circle cx="10" cy="4" r="1.5" fill="currentColor"/>
                    <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
                    <circle cx="10" cy="16" r="1.5" fill="currentColor"/>
                  </svg>
                </div>
                <span className="text-[10px] text-center text-slate-500 leading-tight">Três<br/>pontinhos</span>
              </div>

              <span className="text-slate-300 dark:text-slate-600 text-xs mt-[-12px]">›</span>

              {/* Step 2 - Share */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 dark:text-slate-300">
                    <rect x="4" y="8" width="16" height="14" rx="2"/>
                    <path d="M12 2v12"/>
                    <path d="M8 6l4-4 4 4"/>
                  </svg>
                </div>
                <span className="text-[10px] text-center text-slate-500 leading-tight">Compar-<br/>tilhar</span>
              </div>

              <span className="text-slate-300 dark:text-slate-600 text-xs mt-[-12px]">›</span>

              {/* Step 3 - Add to home */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 dark:text-slate-300">
                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                    <path d="M12 8v8"/>
                    <path d="M8 12h8"/>
                  </svg>
                </div>
                <span className="text-[10px] text-center text-slate-500 leading-tight">Tela de<br/>início</span>
              </div>
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
                    Acesse rápido direto da sua tela inicial. Funciona como um app!
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
                  Agora não
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
