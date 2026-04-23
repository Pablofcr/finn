import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { applyTransactionBalance } from '@/lib/transaction-balance'

/**
 * Pays an invoice: creates a DEBIT transaction on the bank account that the
 * card is linked to, and decrements the card's own balance by the invoice
 * total. The invoice moves to PAID.
 *
 * Body (optional): { fromAccountId?: string } — overrides the linkedAccountId
 * when the user wants to pay from a different bank account this time.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const fromAccountId = typeof body.fromAccountId === 'string' ? body.fromAccountId : null

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: { card: true },
  })
  if (!invoice) return Response.json({ error: 'Fatura não encontrada' }, { status: 404 })
  if (invoice.status === 'PAID') return Response.json({ error: 'Fatura já foi paga.' }, { status: 400 })

  const total = Number(invoice.total)
  if (total <= 0) return Response.json({ error: 'Essa fatura não tem valor a pagar.' }, { status: 400 })

  const payAccountId = fromAccountId ?? invoice.card.linkedAccountId
  if (!payAccountId) {
    return Response.json({
      error: 'Cartão sem conta vinculada. Edite o cartão em Contas e escolha a conta que paga a fatura.',
    }, { status: 400 })
  }

  const payAccount = await prisma.account.findFirst({
    where: { id: payAccountId, userId: user.id },
  })
  if (!payAccount) return Response.json({ error: 'Conta de pagamento não encontrada.' }, { status: 404 })
  if (payAccount.type === 'CREDIT_CARD') {
    return Response.json({ error: 'Não é possível pagar fatura com outro cartão de crédito.' }, { status: 400 })
  }

  const today = new Date()
  const payDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const result = await prisma.$transaction(async (db) => {
    // Debit the bank account for the invoice total
    const payTx = await db.transaction.create({
      data: {
        userId: user.id,
        type: 'EXPENSE',
        amount: total,
        description: `Pagamento fatura ${invoice.card.name}`,
        date: payDate,
        accountId: payAccountId,
        paymentMethod: 'DEBIT',
        tags: ['pagamento-fatura'],
      },
    })
    await applyTransactionBalance(db, {
      type: 'EXPENSE',
      amount: total,
      accountId: payAccountId,
      paymentMethod: 'DEBIT',
      date: payDate,
    })

    // Clear the card's outstanding balance by the same amount
    await db.account.update({
      where: { id: invoice.cardId },
      data: { balance: { decrement: total } },
    })

    // Mark the invoice as paid and link the paying transaction
    const closedInvoice = await db.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidTransactionId: payTx.id,
      },
    })

    return { invoice: closedInvoice, transaction: payTx }
  })

  return Response.json({ data: result })
}
