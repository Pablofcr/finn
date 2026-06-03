/**
 * Verifica end-to-end o fluxo "Parcelas em aberto" no nível do DB+actions.
 *
 * - Cria recurring marcado __VERIFY__ com 2 occurrences vencidas
 * - Confere que GET /api/recurring retornaria pendingOverdueCount=2
 * - Quita as 2 via markRecurringOccurrenceIdsAsPaid
 * - Confere balance da conta variou em -2*amount e 2 Transactions criadas
 * - Reverte via revertOccurrencePayment
 * - Confere balance restaurado exato e Transactions deletadas
 * - Apaga tudo no final (cascade)
 */
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local', override: true })

import prisma from '../src/lib/prisma'
import {
  markRecurringOccurrenceIdsAsPaid,
  revertOccurrencePayment,
} from '../src/lib/finance-actions'

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'pablofcr@gmail.com' },
    select: { id: true, email: true },
  })
  if (!user) throw new Error('user not found')

  const account = await prisma.account.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, balance: true },
  })
  if (!account) throw new Error('no active account')

  const balanceBefore = Number(account.balance)
  console.log(`[setup] user=${user.email} account=${account.name} balance=${balanceBefore}`)

  // Create test recurring with 2 PENDING occurrences in the past
  const amount = 1
  const today = new Date()
  const utcMidnight = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const d1 = new Date(utcMidnight); d1.setUTCDate(d1.getUTCDate() - 10)
  const d2 = new Date(utcMidnight); d2.setUTCDate(d2.getUTCDate() - 3)

  const rec = await prisma.recurringTransaction.create({
    data: {
      userId: user.id,
      description: `__VERIFY__ ${Date.now()}`,
      amount,
      type: 'EXPENSE',
      frequency: 'WEEKLY',
      startDate: d1,
      nextDueDate: d2,
      status: 'ACTIVE',
      accountId: account.id,
    },
  })
  console.log(`[setup] created recurring id=${rec.id}`)

  const occ1 = await prisma.recurringOccurrence.create({
    data: { recurringTransactionId: rec.id, dueDate: d1, status: 'PENDING' },
  })
  const occ2 = await prisma.recurringOccurrence.create({
    data: { recurringTransactionId: rec.id, dueDate: d2, status: 'PENDING' },
  })
  console.log(`[setup] created 2 PENDING occurrences: ${occ1.id}, ${occ2.id}`)

  try {
    // 1) Verify the enriched-list query the GET /api/recurring uses
    const startOfToday = utcMidnight
    const enriched = await prisma.recurringTransaction.findFirst({
      where: { id: rec.id },
      include: {
        occurrences: {
          where: { status: 'PENDING', dueDate: { lt: startOfToday } },
          orderBy: { dueDate: 'asc' },
          select: { id: true, dueDate: true },
        },
      },
    })
    const pendingOverdueCount = enriched?.occurrences.length ?? 0
    console.log(`[step 1] pendingOverdueCount=${pendingOverdueCount} (expected 2)`)
    if (pendingOverdueCount !== 2) throw new Error('FAIL: badge count wrong')

    // 2) Verify [id]/occurrences GET handler shape (replicate its query)
    const overdue = await prisma.recurringOccurrence.findMany({
      where: { recurringTransactionId: rec.id, status: 'PENDING', dueDate: { lt: startOfToday } },
      orderBy: { dueDate: 'asc' },
      select: { id: true, dueDate: true },
    })
    const upcoming = await prisma.recurringOccurrence.findFirst({
      where: { recurringTransactionId: rec.id, status: 'PENDING', dueDate: { gte: startOfToday } },
      orderBy: { dueDate: 'asc' },
      select: { id: true, dueDate: true },
    })
    console.log(`[step 2] overdue list size=${overdue.length} upcoming=${upcoming ? 'yes' : 'none'} (expect 2/none)`)
    if (overdue.length !== 2 || upcoming) throw new Error('FAIL: list shape wrong')

    // 3) Mark both as paid via the action
    const paid = await markRecurringOccurrenceIdsAsPaid(user.id, [occ1.id, occ2.id])
    console.log(`[step 3] markPaid ok=${paid.ok} paidCount=${paid.paidCount} totalAmount=${paid.totalAmount}`)
    if (!paid.ok || paid.paidCount !== 2) throw new Error('FAIL: markPaid')

    const acc1 = await prisma.account.findUnique({ where: { id: account.id }, select: { balance: true } })
    const balanceAfterPay = Number(acc1?.balance)
    const expectedAfterPay = balanceBefore - 2 * amount
    console.log(`[step 3] balance ${balanceBefore} -> ${balanceAfterPay} (expected ${expectedAfterPay})`)
    if (Math.abs(balanceAfterPay - expectedAfterPay) > 0.0001) throw new Error('FAIL: balance math after pay')

    const txs = await prisma.transaction.findMany({
      where: { recurringTransactionId: rec.id },
      select: { id: true, amount: true },
    })
    console.log(`[step 3] transactions created=${txs.length} (expected 2)`)
    if (txs.length !== 2) throw new Error('FAIL: tx count')

    // 4) Revert both
    for (const r of paid.results ?? []) {
      const rev = await revertOccurrencePayment(user.id, r.occurrenceId)
      if (!rev.ok) throw new Error(`FAIL: revert ${r.occurrenceId} → ${rev.error}`)
    }

    const acc2 = await prisma.account.findUnique({ where: { id: account.id }, select: { balance: true } })
    const balanceAfterRevert = Number(acc2?.balance)
    console.log(`[step 4] balance after revert=${balanceAfterRevert} (expected ${balanceBefore})`)
    if (Math.abs(balanceAfterRevert - balanceBefore) > 0.0001) throw new Error('FAIL: balance not restored')

    const txsAfter = await prisma.transaction.findMany({
      where: { recurringTransactionId: rec.id },
      select: { id: true },
    })
    console.log(`[step 4] transactions remaining=${txsAfter.length} (expected 0)`)
    if (txsAfter.length !== 0) throw new Error('FAIL: tx not deleted on revert')

    const occsAfter = await prisma.recurringOccurrence.findMany({
      where: { recurringTransactionId: rec.id },
      select: { status: true },
    })
    const pendingAgain = occsAfter.filter(o => o.status === 'PENDING').length
    console.log(`[step 4] occurrences back to PENDING=${pendingAgain} (expected 2)`)
    if (pendingAgain !== 2) throw new Error('FAIL: occurrences not back to PENDING')

    // 5) Probe: try to mark already-paid IDs (should fail gracefully)
    const probe = await markRecurringOccurrenceIdsAsPaid(user.id, ['00000000-0000-0000-0000-000000000000'])
    console.log(`[probe] mark non-existent: ok=${probe.ok} error="${probe.error}"`)
    if (probe.ok) throw new Error('FAIL: should reject non-existent IDs')

    // 6) Probe: empty IDs array
    const probe2 = await markRecurringOccurrenceIdsAsPaid(user.id, [])
    console.log(`[probe] mark []: ok=${probe2.ok} error="${probe2.error}"`)
    if (probe2.ok) throw new Error('FAIL: should reject empty')

    console.log('\n✅ ALL CHECKS PASSED')
  } finally {
    // Always clean up the test recurring (cascades to occurrences and txs via FK)
    await prisma.recurringTransaction.delete({ where: { id: rec.id } }).catch(e => {
      console.log(`[cleanup] delete recurring failed: ${e.message}`)
    })
    // Sanity check final balance
    const accFinal = await prisma.account.findUnique({ where: { id: account.id }, select: { balance: true } })
    const balanceFinal = Number(accFinal?.balance)
    console.log(`[cleanup] balance final=${balanceFinal} (was ${balanceBefore})`)
    if (Math.abs(balanceFinal - balanceBefore) > 0.0001) {
      console.log(`⚠️  WARNING: balance drift ${balanceFinal - balanceBefore}`)
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
