"use client"

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PeriodSelectorProps {
  month: number
  year: number
  onChange: (month: number, year: number) => void
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function PeriodSelector({ month, year, onChange }: PeriodSelectorProps) {
  function handlePrev() {
    if (month === 0) {
      onChange(11, year - 1)
    } else {
      onChange(month - 1, year)
    }
  }

  function handleNext() {
    if (month === 11) {
      onChange(0, year + 1)
    } else {
      onChange(month + 1, year)
    }
  }

  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
      <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 rounded-lg hover:bg-background">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[140px] text-center">
        {MONTH_NAMES[month]} {year}
      </span>
      <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 rounded-lg hover:bg-background">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
