import { NextRequest } from 'next/server'
import { sendMessage } from '@/lib/telegram'

export const maxDuration = 30

const EOL_MESSAGE =
  '<b>📢 Aviso importante: o Finn no Telegram foi descontinuado.</b>\n\n' +
  'Migramos toda a experiência pro <b>WhatsApp</b>, com um assistente conversacional muito mais inteligente, que:\n\n' +
  '💬 entende perguntas em linguagem natural ("quanto gastei com mercado em abril?")\n' +
  '🎙 transcreve áudios direto pra transação\n' +
  '📸 lê cupom fiscal por foto\n' +
  '✅ dá baixa em recorrências quando você diz "paguei o condomínio"\n\n' +
  '👉 Reconecte pelo WhatsApp em <b>Assistente</b> no app Finn:\n' +
  'https://finn-steel.vercel.app/bot'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Bot descontinuado — responde com aviso e ignora qualquer comando.
  // Telegram exige 200 pra parar de re-enviar o update.
  try {
    const update = await request.json()
    const chatId =
      update?.message?.chat?.id ??
      update?.callback_query?.message?.chat?.id ??
      null
    if (chatId) {
      await sendMessage({ chatId: String(chatId), text: EOL_MESSAGE })
    }
  } catch (err) {
    console.error('[telegram-eol] Webhook EOL handler error:', err)
  }

  return Response.json({ ok: true })
}
