import OpenAI, { toFile } from 'openai'

export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string | null> {
  const client = new OpenAI()

  try {
    const file = await toFile(audioBuffer, filename, { type: 'audio/ogg' })

    const transcription = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'pt',
    })

    return transcription.text?.trim() || null
  } catch (err) {
    console.error('Transcription error:', err)
    return null
  }
}
