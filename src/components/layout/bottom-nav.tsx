"use client"

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { cn, getInitials } from '@/lib/utils'
import { MOBILE_NAV_ITEMS, NAV_SECTIONS } from '@/lib/constants'
import { isAdmin } from '@/lib/admin'
import {
  LayoutDashboard, ArrowLeftRight, PlusCircle, BarChart3, Menu,
  Wallet, Tags, PieChart, Target, Bot, Lightbulb, Settings, Shield,
  Crown, CreditCard, Plus, X,
} from 'lucide-react'

// Diagnostic build stamp — bump on each commit so Pablo can confirm visually
// whether his iPhone is running the latest bundle or a stale cached one.
const DRAWER_BUILD = '2026-04-28-PORTAL'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'layout-dashboard': LayoutDashboard,
  'arrow-left-right': ArrowLeftRight,
  'plus-circle': PlusCircle,
  'bar-chart-3': BarChart3,
  'menu': Menu,
  'wallet': Wallet,
  'tags': Tags,
  'credit-card': CreditCard,
  'pie-chart': PieChart,
  'target': Target,
  'bot': Bot,
  'lightbulb': Lightbulb,
  'settings': Settings,
  'shield': Shield,
  'crown': Crown,
}

/**
 * Custom drawer — não usa base-ui Sheet pra evitar conflito de scroll-lock
 * no iOS Safari. Estrutura mínima:
 *   - Backdrop fixed (escurece + click pra fechar)
 *   - Painel slide-in da esquerda
 *   - Body lock via position:fixed enquanto aberto
 */
function MobileMenuDrawer({
  open,
  onClose,
  pathname,
  displayName,
  isUserAdmin,
}: {
  open: boolean
  onClose: () => void
  pathname: string
  displayName: string
  isUserAdmin: boolean
}) {
  // Body scroll lock — overflow:hidden em html + body é mais confiável no
  // iOS PWA standalone que position:fixed (que conflita com a address bar
  // dinâmica do Safari mobile).
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

  // ESC pra fechar
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
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
      />

      {/* Drawer panel */}
      <div
        className="absolute top-0 left-0 bottom-0 w-[85%] max-w-[300px] sidebar-gradient text-white shadow-2xl"
        style={{
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Row 1 — Header */}
        <div
          className="px-4 pb-2 flex items-start justify-between"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon-192.svg" alt="Finn" className="h-9 w-9 rounded-lg shadow-md" />
            <div className="leading-tight">
              <p className="text-base font-extrabold tracking-tight">Finn</p>
              <p className="text-[10px] text-white/70">Suas finanças</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Row 2 — Nova Transação */}
        <div className="px-4 pb-2">
          <Link href="/transactions/new" onClick={onClose}>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/95 hover:bg-white text-[#5568d3] rounded-lg font-semibold text-[13px] shadow-sm transition-all">
              <Plus className="h-3.5 w-3.5" />
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
            <div key={section.label} className="mb-2">
              <p className="px-3 mb-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-white/40">
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
                      'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all',
                      sActive
                        ? 'bg-white/20 text-white font-semibold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {SIcon && <SIcon className="h-4 w-4 shrink-0" />}
                    <span className="flex-1">{sItem.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}

          {isUserAdmin && (
            <div className="mb-2">
              <p className="px-3 mb-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-white/40">
                Admin
              </p>
              <Link
                href="/admin"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all',
                  pathname === '/admin'
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
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
            className="flex items-center gap-2.5 p-2.5 bg-white/10 hover:bg-white/15 rounded-lg transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 border border-white/30 text-xs font-semibold shrink-0">
              {getInitials(displayName)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-semibold truncate leading-tight">{displayName}</span>
              <span className="text-[10px] text-white/60">Visualizar perfil</span>
            </div>
          </Link>
          <p className="text-center text-[9px] text-white/30 mt-1.5 font-mono">
            v {DRAWER_BUILD}
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass shadow-[0_-2px_12px_oklch(0_0_0/5%)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around py-2">
          {MOBILE_NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon]
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const isAdd = item.icon === 'plus-circle'
            const isMore = item.icon === 'menu'

            if (isMore) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  aria-label={item.label}
                  className="flex flex-col items-center gap-1 px-3 py-1 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-1">
                    {Icon && <Icon className="h-5 w-5" />}
                  </div>
                  <span>{item.label}</span>
                </button>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                aria-label={isAdd ? 'Nova transação' : item.label}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg',
                  isAdd && 'relative -top-3',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {isAdd ? (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-white shadow-lg shadow-primary/30">
                    {Icon && <Icon className="h-6 w-6" />}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    {Icon && <Icon className="h-5 w-5" />}
                    {isActive && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                )}
                <span className={cn(isAdd && 'mt-1')}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <MobileMenuDrawer
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        pathname={pathname}
        displayName={displayName}
        isUserAdmin={isAdmin(user?.email)}
      />
    </>
  )
}
