"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { cn, getInitials } from '@/lib/utils'
import { MOBILE_NAV_ITEMS, NAV_SECTIONS } from '@/lib/constants'
import { isAdmin } from '@/lib/admin'
import {
  LayoutDashboard, ArrowLeftRight, PlusCircle, BarChart3, Menu,
  Wallet, Tags, PieChart, Target, Bot, Lightbulb, Settings, Shield,
  Crown, CreditCard,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'layout-dashboard': LayoutDashboard,
  'arrow-left-right': ArrowLeftRight,
  'plus-circle': PlusCircle,
  'bar-chart-3': BarChart3,
  'menu': Menu,
  'wallet': Wallet,
  'tags': Tags,
  'pie-chart': PieChart,
  'target': Target,
  'bot': Bot,
  'lightbulb': Lightbulb,
  'settings': Settings,
  'shield': Shield,
  'crown': Crown,
  'credit-card': CreditCard,
}

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass shadow-[0_-2px_12px_oklch(0_0_0/5%)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around py-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon]
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const isAdd = item.icon === 'plus-circle'
          const isMore = item.icon === 'menu'

          // "Mais" abre drawer com todas as seções da sidebar
          if (isMore) {
            return (
              <Sheet key={item.href} open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetTrigger
                  render={
                    <button
                      type="button"
                      aria-label={item.label}
                      className="flex flex-col items-center gap-1 px-3 py-1 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg text-muted-foreground"
                    />
                  }
                >
                  <div className="flex flex-col items-center gap-1">
                    {Icon && <Icon className="h-5 w-5" />}
                  </div>
                  <span>{item.label}</span>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85%] max-w-sm sm:max-w-sm overflow-y-auto p-0">
                  <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
                  <div className="sidebar-gradient text-white px-5 pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <img src="/icons/icon-192.svg" alt="Finn" className="h-12 w-12 rounded-xl shadow-lg" />
                      <div>
                        <p className="text-xl font-extrabold tracking-tight">Finn</p>
                        <p className="text-xs text-white/70">Suas finanças</p>
                      </div>
                    </div>
                  </div>

                  <nav className="px-3 py-4 space-y-4">
                    {NAV_SECTIONS.map((section) => (
                      <div key={section.label}>
                        <p className="px-3 mb-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                          {section.label}
                        </p>
                        <div className="space-y-0.5">
                          {section.items.map((sItem) => {
                            const SIcon = iconMap[sItem.icon]
                            const sActive = pathname === sItem.href || pathname.startsWith(sItem.href + '/')
                            return (
                              <Link
                                key={sItem.href}
                                href={sItem.href}
                                onClick={() => setMoreOpen(false)}
                                aria-current={sActive ? 'page' : undefined}
                                className={cn(
                                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                                  sActive
                                    ? 'bg-primary/10 text-primary font-semibold'
                                    : 'text-foreground hover:bg-muted/50'
                                )}
                              >
                                {SIcon && <SIcon className="h-5 w-5 shrink-0" />}
                                <span className="flex-1">{sItem.label}</span>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    {isAdmin(user?.email) && (
                      <div>
                        <p className="px-3 mb-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                          Admin
                        </p>
                        <Link
                          href="/admin"
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                            pathname === '/admin'
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-foreground hover:bg-muted/50'
                          )}
                        >
                          <LayoutDashboard className="h-5 w-5 shrink-0" />
                          <span className="flex-1">Painel admin</span>
                        </Link>
                      </div>
                    )}
                  </nav>

                  <div className="border-t mt-2 px-3 py-3">
                    <Link
                      href="/settings"
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 rounded-xl bg-muted/30 hover:bg-muted/50 px-3 py-2.5 transition-all"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                        {getInitials(displayName)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold truncate">{displayName}</span>
                        <span className="text-xs text-muted-foreground">Visualizar perfil</span>
                      </div>
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
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
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
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
  )
}
