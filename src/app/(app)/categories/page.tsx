"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { COLORS } from '@/lib/constants'
import { Plus, Tags, Trash2, Pencil } from 'lucide-react'
import { getCategoryIcon } from '@/lib/category-icon'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<string>('EXPENSE')
  const [color, setColor] = useState('#6366f1')
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/categories')
      if (res.ok) {
        const result = await res.json()
        setCategories(result.data || [])
      }
    } catch {
      toast.error('Não conseguimos carregar as categorias. Tente novamente em instantes.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  function openCreateDialog() {
    setEditingId(null)
    setName('')
    setType('EXPENSE')
    setColor('#6366f1')
    setDialogOpen(true)
  }

  function openEditDialog(category: any) {
    setEditingId(category.id)
    setName(category.name)
    setType(category.type)
    setColor(category.color || '#6366f1')
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) return
    try {
      if (editingId) {
        const res = await fetch(`/api/categories/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, type, color, icon: 'tag' }),
        })
        if (res.ok) {
          toast.success('Categoria atualizada com sucesso!')
          setDialogOpen(false)
          setEditingId(null)
          setName('')
          fetchCategories()
        } else {
          toast.error('Não foi possível atualizar a categoria. Tente novamente.')
        }
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, type, color, icon: 'tag' }),
        })
        if (res.ok) {
          toast.success('Categoria criada! Use-a para organizar suas transações.')
          setDialogOpen(false)
          setName('')
          fetchCategories()
        }
      }
    } catch {
      toast.error('Não foi possível salvar a categoria. Tente novamente em instantes.')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Categoria excluída. Suas transações anteriores foram mantidas.')
        fetchCategories()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Não foi possível excluir a categoria. Tente novamente.')
      }
    } catch {
      toast.error('Não foi possível excluir a categoria. Tente novamente em instantes.')
    }
  }

  // Show only top-level categories at the root grid; children render nested below each parent.
  const topLevel = categories.filter((c) => !c.parentId)
  const expenseTop = topLevel.filter((c) => c.type === 'EXPENSE')
  const incomeTop = topLevel.filter((c) => c.type === 'INCOME')
  const expenseCount = categories.filter((c) => c.type === 'EXPENSE').length
  const incomeCount = categories.filter((c) => c.type === 'INCOME').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          {categories.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {expenseCount} {expenseCount === 1 ? 'categoria de despesa' : 'categorias de despesa'} · {incomeCount} {incomeCount === 1 ? 'categoria de receita' : 'categorias de receita'}
            </p>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingId(null) }}>
          <DialogTrigger render={<Button className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0" onClick={openCreateDialog} />}>
              <Plus className="h-4 w-4" />
              Nova Categoria
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da categoria</Label>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl shrink-0 shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <Input
                    placeholder="Ex: Alimentação, Transporte, Salário..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Escolha um nome que identifique facilmente o tipo de transação.</p>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => v && setType(v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Despesa - dinheiro que sai</SelectItem>
                    <SelectItem value="INCOME">Receita - dinheiro que entra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <p className="text-xs text-muted-foreground mb-1">Escolha uma cor para identificar visualmente esta categoria.</p>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${color === c ? 'border-foreground scale-110 ring-2 ring-foreground/20' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
              <Button className="w-full gradient-primary shadow-md shadow-primary/25 border-0" onClick={handleSave}>
                {editingId ? 'Salvar Alterações' : 'Criar Categoria'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="space-y-6">
          {/* Explicação didática */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shrink-0">
                  <Tags className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-base mb-2">O que são categorias?</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Categorias organizam suas transações por <strong>tipo de gasto ou receita</strong>.
                    Com elas, você sabe exatamente para onde seu dinheiro vai — e de onde ele vem.
                    O Finn usa categorias para gerar relatórios, controlar orçamentos e oferecer insights inteligentes.
                  </p>
                  <div className="bg-background/80 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exemplos de categorias:</p>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#ef4444' }}>A</div>
                        <div>
                          <span className="text-sm font-medium">Alimentação</span>
                          <span className="text-xs text-red-500 ml-2">Despesa</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#3b82f6' }}>T</div>
                        <div>
                          <span className="text-sm font-medium">Transporte</span>
                          <span className="text-xs text-red-500 ml-2">Despesa</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#22c55e' }}>S</div>
                        <div>
                          <span className="text-sm font-medium">Salário</span>
                          <span className="text-xs text-emerald-500 ml-2">Receita</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Categorias ajudam nos <strong>relatórios</strong>, <strong>orçamentos</strong> e nos <strong>insights da IA</strong> do Finn.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <EmptyState
            icon={<Tags className="h-12 w-12" />}
            title="Crie sua primeira categoria"
            description="Defina categorias como Alimentação, Transporte ou Moradia para organizar suas finanças. Leva menos de 10 segundos."
            action={<Button onClick={openCreateDialog} className="gap-2 gradient-primary shadow-md shadow-primary/25 border-0"><Plus className="h-4 w-4" /> Criar minha primeira categoria</Button>}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Despesas */}
          {expenseTop.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Despesas ({expenseCount})
                </h2>
              </div>
              <div className="space-y-5">
                {expenseTop.map((cat) => (
                  <CategoryGroup
                    key={cat.id}
                    category={cat}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Receitas */}
          {incomeTop.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Receitas ({incomeCount})
                </h2>
              </div>
              <div className="space-y-5">
                {incomeTop.map((cat) => (
                  <CategoryGroup
                    key={cat.id}
                    category={cat}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type CategoryWithChildren = {
  id: string
  name: string
  type: 'EXPENSE' | 'INCOME'
  color: string | null
  icon: string | null
  parentId: string | null
  _count: { transactions: number }
  subcategories?: Array<{
    id: string
    name: string
    type: 'EXPENSE' | 'INCOME'
    color: string | null
    icon: string | null
    _count: { transactions: number }
  }>
}

function CategoryGroup({
  category,
  onEdit,
  onDelete,
}: {
  category: CategoryWithChildren
  onEdit: (c: unknown) => void
  onDelete: (id: string) => void
}) {
  const subs = category.subcategories ?? []
  const hasChildren = subs.length > 0
  const typeLabel = category.type === 'EXPENSE' ? 'Despesa' : 'Receita'
  const typeBadge =
    category.type === 'EXPENSE'
      ? 'border-red-200 text-red-600 dark:border-red-800 dark:text-red-400 bg-red-50 dark:bg-red-950/30'
      : 'border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'

  const ParentIcon = getCategoryIcon(category.icon)
  const parentColor = category.color || '#64748b'

  return (
    <div className="space-y-3">
      {/* Parent card — solid-color icon block, subtle hover lift */}
      <Card className="group relative transition-all duration-200 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/40 hover:-translate-y-0.5 ring-1 ring-inset ring-black/0 hover:ring-black/5 dark:hover:ring-white/5">
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div
                className="h-11 w-11 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ring-1 ring-inset ring-black/5"
                style={{ backgroundColor: parentColor }}
              >
                <ParentIcon className="h-5 w-5 text-white" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold tracking-tight truncate">{category.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeBadge}`}>
                    {typeLabel}
                  </Badge>
                  {hasChildren && (
                    <span className="text-[11px] text-muted-foreground">
                      · {subs.length} {subs.length === 1 ? 'subcategoria' : 'subcategorias'}
                    </span>
                  )}
                  {!hasChildren && category._count.transactions > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      · {category._count.transactions} {category._count.transactions === 1 ? 'transação' : 'transações'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(category)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" />}>
                  <Trash2 className="h-4 w-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir &ldquo;{category.name}&rdquo;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {hasChildren
                        ? `Esta categoria tem ${subs.length} subcategorias. Excluir a pai também apaga as filhas.`
                        : 'Suas transações anteriores serão mantidas, mas ficarão sem categoria.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(category.id)}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subcategories — hairline rail, tinted icon tiles (icon-on-color) */}
      {hasChildren && (
        <div className="ml-5 pl-5 border-l border-border/60 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {subs.map((sub) => {
            const SubIcon = getCategoryIcon(sub.icon)
            const subColor = sub.color || category.color || '#64748b'
            return (
              <Card
                key={sub.id}
                className="group relative bg-card border-border/40 transition-all duration-200 hover:border-border hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/40 hover:-translate-y-0.5"
              >
                <CardContent className="pt-3 pb-3 px-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset ring-black/5 dark:ring-white/10"
                      style={{ backgroundColor: `${subColor}1a` /* ~10% alpha */ }}
                    >
                      <SubIcon className="h-4 w-4" style={{ color: subColor }} strokeWidth={1.75} />
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(sub)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" />}>
                          <Trash2 className="h-3 w-3" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir &ldquo;{sub.name}&rdquo;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Suas transações anteriores serão mantidas, mas ficarão sem categoria.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(sub.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <p className="font-medium text-sm tracking-tight truncate">{sub.name}</p>
                  {sub._count.transactions > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {sub._count.transactions} {sub._count.transactions === 1 ? 'transação' : 'transações'}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
