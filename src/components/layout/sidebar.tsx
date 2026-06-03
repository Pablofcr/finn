"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { cn, getInitials } from '@/lib/utils'
import { NAV_SECTIONS } from '@/lib/constants'
import { isAdmin } from '@/lib/admin'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Tags, PieChart,
  Target, BarChart3, Bot, Lightbulb, Settings, Plus, Shield, Crown, CreditCard
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

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
  'shield-alert': LayoutDashboard, // reuse for admin
}

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'
  const [unreadInsights, setUnreadInsights] = useState(0)
  // avatar custom vem do User.avatarUrl no banco (settings page salva lá).
  // Fallback pro avatar_url do Supabase (OAuth Google) — antes só usava
  // initials, ignorando ambos.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.user_metadata?.avatar_url ?? null,
  )

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/insights/unread')
      if (res.ok) {
        const data = await res.json()
        setUnreadInsights(data.data?.unreadCount || 0)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(d => {
        if (d?.data?.avatarUrl) setAvatarUrl(d.data.avatarUrl)
      })
      .catch(() => { /* ignore */ })
  }, [])

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [fetchUnread])

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[280px] lg:h-screen lg:overflow-hidden sidebar-gradient text-white shadow-2xl">
      {/* Logo */}
      <div className="px-6 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.svg" alt="Finn" className="h-[52px] w-[52px] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.1)]" />
          <div>
            <span className="text-[1.5rem] font-extrabold tracking-tight leading-tight">Finn</span>
            <p className="text-[0.813rem] text-white/70 font-normal">Suas finanças</p>
          </div>
        </div>
      </div>

      {/* New Transaction Button */}
      <div className="px-6 pb-3 shrink-0">
        <Link href="/transactions/new">
          <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/95 hover:bg-white text-[#5568d3] rounded-xl font-semibold text-[0.938rem] shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 active:translate-y-0 transition-all">
            <Plus className="h-5 w-5" />
            Nova Transação
          </button>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0 px-4">
        <nav className="py-2 space-y-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-4 mb-1 text-[0.688rem] font-semibold uppercase tracking-wider text-white/40">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = iconMap[item.icon]
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-4 py-2 text-[0.875rem] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                        isActive
                          ? 'bg-white/20 text-white font-semibold'
                          : 'text-white/75 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {Icon && <Icon className={cn('h-5 w-5', isActive ? 'opacity-100' : 'opacity-75')} />}
                      <span className="flex-1">{item.label}</span>
                      {item.href === '/insights' && unreadInsights > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                          {unreadInsights > 9 ? '9+' : unreadInsights}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Admin link — only visible to admins */}
      {isAdmin(user?.email) && (
        <div className="px-4 pt-2 shrink-0">
          <Link
            href="/admin"
            aria-current={pathname === '/admin' ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-4 py-2 text-[0.875rem] font-medium transition-all',
              pathname === '/admin'
                ? 'bg-white/20 text-white font-semibold'
                : 'text-white/75 hover:bg-white/10 hover:text-white'
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            Admin
          </Link>
        </div>
      )}

      {/* User Profile */}
      <div className="px-4 pb-4 pt-2 mt-auto shrink-0">
        <div className="border-t border-white/15 pt-4">
          <Link href="/settings" className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/15 rounded-xl transition-all cursor-pointer">
            <Avatar className="h-10 w-10 border-2 border-white/30 shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-[0.938rem] font-semibold truncate">{displayName}</span>
              <span className="text-xs text-white/60">Visualizar perfil</span>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  )
}
