import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

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
  }

  return user
}
