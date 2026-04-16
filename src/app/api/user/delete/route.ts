import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function DELETE() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.$transaction(async (tx) => {
    // Delete bot-related data
    await tx.botMessage.deleteMany({ where: { userId: user.id } })
    await tx.botConnection.deleteMany({ where: { userId: user.id } })

    // Delete insights
    await tx.insight.deleteMany({ where: { userId: user.id } })

    // Delete installments (via transactions owned by user)
    await tx.installment.deleteMany({
      where: { transaction: { userId: user.id } },
    })

    // Delete transactions
    await tx.transaction.deleteMany({ where: { userId: user.id } })

    // Delete recurring transactions
    await tx.recurringTransaction.deleteMany({ where: { userId: user.id } })

    // Delete budgets
    await tx.budget.deleteMany({ where: { userId: user.id } })

    // Delete goals
    await tx.goal.deleteMany({ where: { userId: user.id } })

    // Delete category keywords (via categories owned by user)
    await tx.categoryKeyword.deleteMany({
      where: { category: { userId: user.id } },
    })

    // Delete categories
    await tx.category.deleteMany({ where: { userId: user.id } })

    // Delete accounts
    await tx.account.deleteMany({ where: { userId: user.id } })

    // Delete notification settings
    await tx.notificationSetting.deleteMany({ where: { userId: user.id } })

    // Finally delete the user
    await tx.user.delete({ where: { id: user.id } })
  })

  return Response.json({ data: { deleted: true } })
}
