"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface CategorySummary {
  categoryId: string
  categoryName: string
  categoryColor: string
  total: number
  percentage: number
}

interface CategoryDonutProps {
  data: CategorySummary[]
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const data = payload[0].payload
  return (
    <div className="bg-popover text-popover-foreground rounded-xl shadow-xl border p-3 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: data.categoryColor }} />
        <span className="font-semibold">{data.categoryName}</span>
      </div>
      <p className="text-muted-foreground">{formatCurrency(data.total)} · {data.percentage}%</p>
    </div>
  )
}

export function CategoryDonut({ data }: CategoryDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)

  const total = data.reduce((sum, d) => sum + d.total, 0)

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
            Sem despesas neste período
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Despesas por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="relative">
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  dataKey="total"
                  nameKey="categoryName"
                  paddingAngle={2}
                  strokeWidth={0}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.categoryColor}
                      className="cursor-pointer transition-opacity duration-200"
                      opacity={activeIndex !== undefined && activeIndex !== index ? 0.4 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text when nothing is hovered */}
            {activeIndex === undefined && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{formatCurrency(total)}</p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="w-full mt-2 space-y-1.5 max-h-[140px] overflow-y-auto">
            {data.map((cat, i) => (
              <div
                key={cat.categoryId}
                className={`flex items-center justify-between text-sm px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  activeIndex === i ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.categoryColor }}
                  />
                  <span className="truncate">{cat.categoryName}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">{formatCurrency(cat.total)}</span>
                  <span className="text-xs font-semibold w-8 text-right">{cat.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
