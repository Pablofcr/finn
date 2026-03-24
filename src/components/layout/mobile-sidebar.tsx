"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { cn, getInitials } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Tags, PieChart,
  Target, BarChart3, Bot, Lightbulb, Settings, Plus
} from 'lucide-react'
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
  const { user } = useAuth()
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'

  return (
    <div className="flex h-full flex-col sidebar-gradient text-white">
      {/* Logo */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border-2 border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
            <span className="text-[1.75rem] font-extrabold font-heading">F</span>
          </div>
          <div>
            <span className="text-[1.5rem] font-extrabold tracking-tight leading-tight">Finn</span>
            <p className="text-[0.813rem] text-white/70 font-normal">Suas finanças</p>
          </div>
        </div>
      </div>

      {/* New Transaction Button */}
      <div className="px-6 pb-4">
        <Link href="/transactions/new">
          <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/95 hover:bg-white text-[#5568d3] rounded-xl font-semibold text-[0.938rem] shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-all">
            <Plus className="h-5 w-5" />
            Nova Transação
          </button>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-1 py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon]
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-2.5 text-[0.938rem] font-medium transition-all',
                  isActive
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                )}
              >
                {Icon && <Icon className={cn('h-5 w-5', isActive ? 'opacity-100' : 'opacity-75')} />}
                {item.label}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* User Profile */}
      <div className="px-4 pb-4 pt-2 mt-auto">
        <div className="border-t border-white/15 pt-4">
          <Link href="/settings" className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/15 rounded-xl transition-all cursor-pointer">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border-2 border-white/30 text-sm font-semibold shrink-0">
              {getInitials(displayName)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[0.938rem] font-semibold truncate">{displayName}</span>
              <span className="text-xs text-white/60">Visualizar perfil</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
