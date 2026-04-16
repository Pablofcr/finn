import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { sendPaymentAlert } from '@/lib/telegram'

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const threeDaysFromNow = new Date(now)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  // Find all active recurring transactions due in the next 3 days
  const upcomingPayments = await prisma.recurringTransaction.findMany({
    where: {
      status: 'ACTIVE',
      nextDueDate: {
        gte: now,
        lte: threeDaysFromNow,
      },
    },
    include: {
      user: {
        include: {
          botConnections: {
            where: {
              platform: 'TELEGRAM',
              isVerified: true,
            },
          },
        },
      },
    },
  })

  let alertsSent = 0

  for (const payment of upcomingPayments) {
    const connection = payment.user.botConnections[0]
    if (!connection) continue

    const daysUntilDue = Math.ceil(
      (payment.nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Send alert for payments due today, tomorrow, or in 3 days
    if (daysUntilDue === 0 || daysUntilDue === 1 || daysUntilDue === 3) {
      try {
        await sendPaymentAlert({
          chatId: connection.platformUserId,
          description: payment.description,
          amount: Number(payment.amount),
          dueDate: payment.nextDueDate.toISOString(),
          recurringId: payment.id,
        })

        // Log the outbound message
        await prisma.botMessage.create({
          data: {
            userId: payment.userId,
            connectionId: connection.id,
            direction: 'OUTBOUND',
            rawContent: `Lembrete: ${payment.description} - R$ ${Number(payment.amount).toFixed(2)}`,
            status: 'CONFIRMED',
          },
        })

        alertsSent++
      } catch (err) {
        console.error(`Failed to send alert for recurring ${payment.id}:`, err)
      }
    }
  }

  return Response.json({
    data: {
      checked: upcomingPayments.length,
      alertsSent,
      timestamp: now.toISOString(),
    },
  })
}
