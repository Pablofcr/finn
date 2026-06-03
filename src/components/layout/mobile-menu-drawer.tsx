"use client"

import { useEffect, useState } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { cn, getInitials } from '@/lib/utils'
import { NAV_SECTIONS } from '@/lib/constants'
import { isAdmin } from '@/lib/admin'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Tags, PieChart,
  Target, BarChart3, Bot, Lightbulb, Settings, Shield, Crown,
  CreditCard, Plus, X,
} from 'lucide-react'

// Diagnostic build stamp — kept in source as a tiny marker we can flip back
// on if cache issues come back. Not rendered in the UI in normal operation.
export const DRAWER_BUILD = 'v6'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'layout-dashboard': LayoutDashboard,
  'arrow-left-right': ArrowLeftRight,
  'wallet': Wallet,
  'tags': Tags,
  'credit-card': CreditCard,
  'pie-chart': PieChart,
  'target': Target,
  'bar-chart-3': BarChart3,
  'bot': Bot,
  'lightbulb': Lightbulb,
  'settings': Settings,
  'shield': Shield,
  'crown': Crown,
}

/**
 * Single source of truth for the mobile menu drawer.
 * Used by both the bottom-nav "Mais" button AND the header hamburger.
 * Custom (no base-ui Sheet) to avoid double scroll-lock conflicts on iOS.
 */
export function MobileMenuDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const { user } = useAuth()
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.user_metadata?.avatar_url ?? null,
  )

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(d => {
        if (d?.data?.avatarUrl) setAvatarUrl(d.data.avatarUrl)
      })
      .catch(() => { /* ignore */ })
  }, [])
  const isUserAdmin = isAdmin(user?.email)

  // Body scroll lock — overflow:hidden on html+body is more reliable on iOS
  // PWA standalone than position:fixed (which conflicts with the dynamic
  // address bar of mobile Safari).
  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const body = document.body
    const orig = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyTouchAction: body.style.touchAction,
    }
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.touchAction = 'none'
    return () => {
      html.style.overflow = orig.htmlOverflow
      body.style.overflow = orig.bodyOverflow
      body.style.touchAction = orig.bodyTouchAction
    }
  }, [open])

  // ESC closes
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navegação"
      className="fixed inset-0 z-[60] lg:hidden"
    >
      {/* Backdrop — click closes */}
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
      />

      {/* Drawer panel — força altura total do viewport via 100dvh
          (mais confiável no iOS Safari que top-0 bottom-0 em absolute) */}
      <div
        className="absolute top-0 left-0 w-[85%] max-w-[300px] sidebar-gradient text-white shadow-2xl"
        style={{
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr auto',
          height: '100dvh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Row 1 — Header com build stamp visível */}
        <div
          className="px-4 pb-2 flex items-start justify-between"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/icons/icon-192.svg" alt="Finn" className="h-9 w-9 rounded-lg shadow-md shrink-0" />
            <div className="leading-tight min-w-0">
              <p className="text-base font-extrabold tracking-tight">Finn</p>
              <p className="text-[10px] text-white/70">Suas finanças</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Row 2 — Nova Transação */}
        <div className="px-4 pb-2">
          <Link href="/transactions/new" onClick={onClose}>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-white/95 hover:bg-white text-[#5568d3] rounded-lg font-semibold text-[14px] shadow-sm transition-all">
              <Plus className="h-4 w-4" />
              Nova Transação
            </button>
          </Link>
        </div>

        {/* Row 3 — Nav scrolls internally */}
        <nav
          className="px-2 pt-1 pb-1"
          style={{
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            minHeight: 0,
          }}
        >
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-2.5">
              <p className="px-3 mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-white/40">
                {section.label}
              </p>
              {section.items.map((sItem) => {
                const SIcon = iconMap[sItem.icon]
                const sActive = pathname === sItem.href || pathname.startsWith(sItem.href + '/')
                return (
                  <Link
                    key={sItem.href}
                    href={sItem.href}
                    onClick={onClose}
                    aria-current={sActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-1.5 min-h-[36px] text-[14px] font-medium transition-all',
                      sActive
                        ? 'bg-white/20 text-white font-semibold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {SIcon && <SIcon className="h-[18px] w-[18px] shrink-0" />}
                    <span className="flex-1">{sItem.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}

          {isUserAdmin && (
            <div className="mb-2.5">
              <p className="px-3 mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-white/40">
                Admin
              </p>
              <Link
                href="/admin"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-1.5 min-h-[36px] text-[14px] font-medium transition-all',
                  pathname === '/admin'
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <LayoutDashboard className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">Painel admin</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Row 4 — User pill, sempre visível */}
        <div
          className="px-2 pt-2 border-t border-white/15"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/15 rounded-lg transition-all"
          >
            <Avatar className="h-9 w-9 border border-white/30 shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-semibold truncate leading-tight">{displayName}</span>
              <span className="text-[11px] text-white/60">Visualizar perfil</span>
            </div>
          </Link>
        </div>
      </div>
    </div>,
    document.body
  )
}
