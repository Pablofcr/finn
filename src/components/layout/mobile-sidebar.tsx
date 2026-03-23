"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Tags, PieChart,
  Target, BarChart3, Bot, Lightbulb, Settings, Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'layout-dashboard': LayoutDashboard,
  'arrow-left-right': ArrowLeftRight,
  'wallet': Wallet,
  'tags': Tags,
  'pie-chart': PieChart,
  'target': Target,
  'bar-chart-3': BarChart3,
  'bot': Bot,
  'lightbulb': Lightbulb,
  'settings': Settings,
}

export function MobileSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <div className="gradient-primary px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-white font-bold text-sm">
            F
          </div>
          <div>
            <span className="text-lg font-semibold text-white">Finn</span>
            <p className="text-xs text-white/70">Suas finanças</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <Link href="/transactions/new">
          <Button className="w-full gap-2 gradient-primary shadow-md shadow-primary/25 border-0">
            <Plus className="h-4 w-4" />
            Nova Transação
          </Button>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon]
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold border-l-3 border-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5'
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}
