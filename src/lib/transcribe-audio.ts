import OpenAI, { toFile } from 'openai'

// Vocabulary prompt: Whisper uses this as context to bias the output toward
// these tokens. Critical for the bot name "Finn" (otherwise transcribed as
// "Fim", "fim", etc) and for common Brazilian-Portuguese finance terms that
// Whisper sometimes mangles.
const WHISPER_VOCAB_PROMPT =
  'Finn é um assistente financeiro pessoal via WhatsApp e Telegram. Vocabulário comum: ' +
  'Finn, gastei, paguei, recebi, comprei, ganhei, PIX, débito, crédito, boleto, dinheiro, ' +
  'R$ reais, mil reais, condomínio, aluguel, fatura, cartão, Nubank, Bradesco, Itaú, Inter, ' +
  'Caixa, Santander, salário, mercado, farmácia, uber, ifood, delivery, parcelado, vezes, ' +
  'mensal, todo mês, recorrente, orçamento, meta, saldo.'

export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string | null> {
  const client = new OpenAI()

  try {
    const file = await toFile(audioBuffer, filename, { type: 'audio/ogg' })

    const transcription = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'pt',
      prompt: WHISPER_VOCAB_PROMPT,
    })

    const raw = transcription.text?.trim() || null
    if (!raw) return null

    // Belt-and-suspenders: even with the prompt, Whisper occasionally falls back
    // to "Fim" for "Finn" when it appears as the first word (addressed to the bot).
    // Normalize that specific pattern — safe because "fim" at sentence-start
    // addressed to the bot makes no semantic sense in PT-BR.
    return raw.replace(/^(Fim|fim)([\s,.!?]|$)/, 'Finn$2')
  } catch (err) {
    console.error('Transcription error:', err)
    return null
  }
}
