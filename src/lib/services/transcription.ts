export interface TranscriptionResult {
  text: string;
  segments: {
    start: number;
    end: number;
    text: string;
  }[];
}

export interface TranscriptionService {
  transcribe(audioUrl: string): Promise<TranscriptionResult>;
}

// Real Whisper implementation
class WhisperTranscription implements TranscriptionService {
  async transcribe(audioUrl: string): Promise<TranscriptionResult> {
    const response = await fetch(audioUrl);
    const blob = await response.blob();
    const file = new File([blob], 'audio.webm', { type: 'audio/webm' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');

    const result = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!result.ok) {
      throw new Error('Transcription failed');
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
}

// Mock implementation for development
class MockTranscription implements TranscriptionService {
  async transcribe(_audioUrl: string): Promise<TranscriptionResult> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return {
      text: `Tutor: Good morning, Emma! How are you today?
Student: I'm fine, thanks. But I have a question about the homework.
Tutor: Of course, what was confusing?
Student: The exercise about Present Perfect. I don't understand when to use "have been" and when to use "went".
Tutor: That's a great question. So, "went" is Past Simple. We use it for finished actions at a specific time. "Have been" is Present Perfect. We use it when the exact time doesn't matter, or when the action started in the past and continues now.
Student: So, "I went to London" is Past Simple?
Tutor: Exactly! And "I have been to London" means you went there at some point in your life, but the exact time isn't important.
Student: Oh, I think I understand now. What about "already" and "yet"?
Tutor: Great follow-up! "Already" is used in positive sentences with Present Perfect. "Yet" is used in negative sentences and questions.
Student: Can you give me an example?
Tutor: Sure! "I have already finished my homework" — positive. "I haven't finished yet" — negative. "Have you finished yet?" — question.
Student: That makes sense! I think I need more practice with this.
Tutor: No problem! I'll prepare some exercises for you. Let's also review irregular verbs, because I noticed you said "goed" instead of "went" earlier.
Student: Oh yes, I always forget those!
Tutor: That's normal! We'll work on it. Let me make a note of the areas we need to focus on.`,
      segments: [
        { start: 0, end: 3, text: 'Tutor: Good morning, Emma! How are you today?' },
        { start: 3, end: 6, text: "Student: I'm fine, thanks. But I have a question about the homework." },
        { start: 6, end: 8, text: 'Tutor: Of course, what was confusing?' },
        { start: 8, end: 12, text: "Student: The exercise about Present Perfect. I don't understand when to use have been and when to use went." },
        { start: 12, end: 18, text: "Tutor: That's a great question. So went is Past Simple. We use it for finished actions at a specific time. Have been is Present Perfect." },
        { start: 18, end: 20, text: 'Student: So, I went to London is Past Simple?' },
        { start: 20, end: 25, text: 'Tutor: Exactly! And I have been to London means you went there at some point in your life, but the exact time isn\'t important.' },
        { start: 25, end: 28, text: 'Student: Oh, I think I understand now. What about already and yet?' },
        { start: 28, end: 33, text: "Tutor: Great follow-up! Already is used in positive sentences with Present Perfect. Yet is used in negative sentences and questions." },
        { start: 33, end: 35, text: 'Student: Can you give me an example?' },
        { start: 35, end: 42, text: "Tutor: Sure! I have already finished my homework — positive. I haven't finished yet — negative. Have you finished yet? — question." },
        { start: 42, end: 45, text: 'Student: That makes sense! I think I need more practice with this.' },
        { start: 45, end: 50, text: "Tutor: No problem! I'll prepare some exercises for you. Let's also review irregular verbs." },
        { start: 50, end: 53, text: "Student: Oh yes, I always forget those!" },
        { start: 53, end: 56, text: "Tutor: That's normal! We'll work on it." },
      ],
    };
  }
}

// Factory function
export function createTranscriptionService(): TranscriptionService {
  if (process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY) {
    return new WhisperTranscription();
  }
  console.log('⚠️ No API key found. Using mock transcription.');
  return new MockTranscription();
}

// Convenience function
export async function transcribeAudio(audioUrl: string): Promise<TranscriptionResult> {
  const service = createTranscriptionService();
  return service.transcribe(audioUrl);
}
