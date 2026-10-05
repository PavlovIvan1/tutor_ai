export interface TranscriptionResult {
  text: string;
  segments: {
    start: number;
    end: number;
    text: string;
  }[];
}

const POLZA_BASE = 'https://polza.ai/api/v1';
const POLZA_KEY = process.env.OPENAI_API_KEY || '';

export async function transcribeBase64(base64: string, language: string | null = 'en'): Promise<TranscriptionResult> {
  if (!POLZA_KEY) throw new Error('OPENAI_API_KEY not set');

  const dataUri = base64.startsWith('data:') ? base64 : `data:audio/webm;base64,${base64}`;

  const result = await fetch(`${POLZA_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${POLZA_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/whisper-1',
      file: dataUri,
      // language = null → Whisper сам определяет язык
      ...(language ? { language } : {}),
      response_format: 'verbose_json',
    }),
  });

  if (!result.ok) {
    const err = await result.text().catch(() => 'unknown');
    throw new Error(`Whisper failed: ${result.status} ${err}`);
  }

  const data = await result.json();

  return {
    text: data.text,
    segments: data.segments?.map((s: any) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    })) || [],
  };
}
