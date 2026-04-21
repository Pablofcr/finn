import { getAuthUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { runPaymentAlerts } from '@/app/api/cron/payment-alerts/route'

export async function POST() {
  const user = await getAuthUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!isAdmin(user.email)) return Response.json({ error: 'Acesso restrito' }, { status: 403 })

  // Runs the same payment-alerts job the scheduled cron invokes. Used for
  // manual recovery when the scheduled run failed or couldn't be verified.
  return runPaymentAlerts()
}
