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

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')
  const incomeCategories = categories.filter((c) => c.type === 'INCOME')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          {categories.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {expenseCategories.length} {expenseCategories.length === 1 ? 'categoria de despesa' : 'categorias de despesa'} · {incomeCategories.length} {incomeCategories.length === 1 ? 'categoria de receita' : 'categorias de receita'}
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
          {expenseCategories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Despesas ({expenseCategories.length})
                </h2>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {expenseCategories.map((c) => (
                  <Card key={c.id} className="group relative hover:shadow-md transition-all duration-200 hover:border-foreground/10">
                    <CardContent className="pt-4 pb-4 px-4">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
                          style={{ backgroundColor: c.color || '#64748b' }}
                        >
                          {c.name?.charAt(0)?.toUpperCase()}
                        </div>
                        {!c.isSystem && (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditDialog(c)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" />}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir &ldquo;{c.name}&rdquo;?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Suas transações anteriores serão mantidas, mas ficarão sem categoria.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(c.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-sm truncate">{c.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-200 text-red-600 dark:border-red-800 dark:text-red-400 bg-red-50 dark:bg-red-950/30">
                          Despesa
                        </Badge>
                        {c.isSystem && (
                          <span className="text-[10px] text-muted-foreground">(sistema)</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Receitas */}
          {incomeCategories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Receitas ({incomeCategories.length})
                </h2>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {incomeCategories.map((c) => (
                  <Card key={c.id} className="group relative hover:shadow-md transition-all duration-200 hover:border-foreground/10">
                    <CardContent className="pt-4 pb-4 px-4">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
                          style={{ backgroundColor: c.color || '#64748b' }}
                        >
                          {c.name?.charAt(0)?.toUpperCase()}
                        </div>
                        {!c.isSystem && (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditDialog(c)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" />}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir &ldquo;{c.name}&rdquo;?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Suas transações anteriores serão mantidas, mas ficarão sem categoria.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(c.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-sm truncate">{c.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
                          Receita
                        </Badge>
                        {c.isSystem && (
                          <span className="text-[10px] text-muted-foreground">(sistema)</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
