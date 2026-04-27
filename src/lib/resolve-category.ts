import prisma from '@/lib/prisma'
import { categoryForKeyword, CATEGORY_METADATA, type TxType, type CategoryMeta } from '@/lib/keyword-map'

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Ensures a category exists for the user. If a parent is required (via
 * `parentName`) but doesn't exist, the parent is created first so the
 * child can link to it.
 */
async function ensureCategory(
  userId: string,
  categoryName: string,
  meta: CategoryMeta
): Promise<{ id: string; name: string }> {
  // Already exists?
  const existing = await prisma.category.findFirst({
    where: { userId, name: categoryName, type: meta.type },
    select: { id: true, name: true },
  })
  if (existing) return existing

  // Resolve parent (create if needed)
  let parentId: string | undefined
  if (meta.parentName) {
    const parentMeta = CATEGORY_METADATA[meta.parentName]
    if (parentMeta) {
      const parent = await ensureCategory(userId, meta.parentName, parentMeta)
      parentId = parent.id
    }
  }

  const created = await prisma.category.create({
    data: {
      userId,
      name: categoryName,
      type: meta.type,
      icon: meta.icon,
      color: meta.color,
      parentId,
    },
    select: { id: true, name: true },
  })
  return created
}

export type ResolvedCategory = {
  id: string
  name: string
  type: TxType
}

/**
 * Resolves (and auto-creates if missing) a category for a transaction
 * based on the text description. Tries two passes:
 *   1. User's custom keywords (CategoryKeyword table, word-boundary match)
 *   2. System-wide KEYWORD_MAP — auto-creates the category if missing.
 *
 * Returns null if no keyword from any source matches.
 */
export async function resolveCategoryForText(
  userId: string,
  description: string,
  originalText?: string
): Promise<ResolvedCategory | null> {
  const combined = originalText ? `${originalText} ${description}` : description
  const normalized = normalizeText(combined)

  // 1. User's custom keywords
  const userKeywords = await prisma.categoryKeyword.findMany({
    where: { category: { userId } },
    include: { category: { select: { id: true, name: true, type: true } } },
  })
  for (const k of userKeywords) {
    const kw = normalizeText(k.keyword)
    const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (regex.test(normalized)) {
      return { id: k.category.id, name: k.category.name, type: k.category.type as TxType }
    }
  }

  // 2. System KEYWORD_MAP with auto-create
  const match = categoryForKeyword(normalized)
  if (!match) return null

  const ensured = await ensureCategory(userId, match.categoryName, match.meta)
  return { id: ensured.id, name: ensured.name, type: match.meta.type }
}

/**
 * Legacy-shape wrapper used by the WhatsApp webhook.
 * Returns { categoryId, categoryName } | null. Prefer `resolveCategoryForText`
 * for new code.
 */
export async function findCategoryForDescription(
  userId: string,
  description: string,
  originalText?: string
): Promise<{ categoryId: string; categoryName: string } | null> {
  const r = await resolveCategoryForText(userId, description, originalText)
  return r ? { categoryId: r.id, categoryName: r.name } : null
}
