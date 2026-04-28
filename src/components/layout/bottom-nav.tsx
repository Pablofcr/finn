"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { MOBILE_NAV_ITEMS } from '@/lib/constants'
import {
  LayoutDashboard, ArrowLeftRight, PlusCircle, BarChart3, Menu,
} from 'lucide-react'
import { MobileMenuDrawer } from './mobile-menu-drawer'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'layout-dashboard': LayoutDashboard,
  'arrow-left-right': ArrowLeftRight,
  'plus-circle': PlusCircle,
  'bar-chart-3': BarChart3,
  'menu': Menu,
}

export function BottomNav() {
  const pathname = usePathname()
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

      <MobileMenuDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
