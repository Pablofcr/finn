import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { defaultCategories } from '@/lib/seed/default-categories'

export async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()

  if (!supabaseUser) return null

  let user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        supabaseId: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.name || supabaseUser.email!.split('@')[0],
        phone: supabaseUser.phone || null,
        avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
      },
    })

    // Seed default categories (parents) for new users, then subcategories
    try {
      for (const cat of defaultCategories) {
        const parent = await prisma.category.create({
          data: {
            userId: user!.id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            type: cat.type,
          },
        })
        if (cat.subcategories && cat.subcategories.length > 0) {
          await prisma.category.createMany({
            data: cat.subcategories.map((sub) => ({
              userId: user!.id,
              name: sub.name,
              icon: sub.icon,
              color: cat.color, // inherit parent color by default
              type: cat.type,
              parentId: parent.id,
            })),
          })
        }
      }
    } catch { /* ignore if categories already exist */ }
  }

  return user
}
