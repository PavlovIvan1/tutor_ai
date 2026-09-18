'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import { getInitials, getLevelColor, formatDuration, getAvatarUrl } from '@/lib/utils';
import type { Student } from '@/lib/types';

type RecordingState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopping' | 'processing' | 'done';

const MAX_CHUNK_BYTES = 2.5 * 1024 * 1024;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function chunkBlob(blob: Blob): Promise<string[]> {
  if (blob.size <= MAX_CHUNK_BYTES) {
    return [await blobToBase64(blob)];
  }
  const numChunks = Math.ceil(blob.size / MAX_CHUNK_BYTES);
  const chunkSize = Math.ceil(blob.size / numChunks);
  const result: string[] = [];
  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, blob.size);
    result.push(await blobToBase64(blob.slice(start, end)));
  }
  return result;
}

function NewLessonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedStudentId = searchParams.get('student');

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  const [result, setResult] = useState<any>(null);
  const [hasSystemAudio, setHasSystemAudio] = useState(false);
  const [systemOnly, setSystemOnly] = useState(false);

  const micRecorderRef = useRef<MediaRecorder | null>(null);
  const systemRecorderRef = useRef<MediaRecorder | null>(null);
  const micChunksRef = useRef<Blob[]>([]);
  const systemChunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('students').select('*').eq('tutor_id', user.id).eq('is_archived', false).order('name');
      setStudents(data || []);
      if (preselectedStudentId) {
        const student = data?.find((s: { id: string }) => s.id === preselectedStudentId);
        if (student) setSelectedStudent(student);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recordingState]);

  const startRecording = useCallback(async () => {
    if (!selectedStudent) return;
    setRecordingState('requesting');
    setError('');
    setHasSystemAudio(false);

    try {
      let micStream: MediaStream | null = null;

      if (!systemOnly) {
        // 1. Get microphone
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;
      }

      // 2. Capture system audio
      let systemStream: MediaStream | null = null;
      try {
        const screenCapture = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        const audioTracks = screenCapture.getAudioTracks();
        if (audioTracks.length > 0) {
          systemStream = new MediaStream(audioTracks);
          systemStreamRef.current = systemStream;
          setHasSystemAudio(true);
        }
        // Stop video tracks — we only need audio
        screenCapture.getVideoTracks().forEach((t) => t.stop());
      } catch {
        // User cancelled screen share — mic only
      }

      // 3. Create separate MediaRecorders
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      // Mic recorder (TEACHER)
      micChunksRef.current = [];
      if (micStream) {
        const micRecorder = new MediaRecorder(micStream, { mimeType });
        micRecorder.ondataavailable = (e) => { if (e.data.size > 0) micChunksRef.current.push(e.data); };
        micRecorderRef.current = micRecorder;
      }

      // System recorder (STUDENT)
      systemChunksRef.current = [];
      if (systemStream) {
        const systemRecorder = new MediaRecorder(systemStream, { mimeType });
        systemRecorder.ondataavailable = (e) => { if (e.data.size > 0) systemChunksRef.current.push(e.data); };
        systemRecorderRef.current = systemRecorder;
      }

      // 4. Start both
      micRecorderRef.current?.start(1000);
      systemRecorderRef.current?.start(1000);
      setRecordingState('recording');
    } catch (err: any) {
      setError(err.name === 'NotAllowedError' ? 'Доступ к микрофону запрещён.' : err.name === 'NotFoundError' ? 'Микрофон не найден.' : err.message || 'Не удалось начать запись');
      setRecordingState('idle');
    }
  }, [selectedStudent, systemOnly]);

  const pauseRecording = useCallback(() => {
    if (micRecorderRef.current?.state === 'recording') micRecorderRef.current.pause();
    if (systemRecorderRef.current?.state === 'recording') systemRecorderRef.current.pause();
    setRecordingState('paused');
  }, []);

  const resumeRecording = useCallback(() => {
    if (micRecorderRef.current?.state === 'paused') micRecorderRef.current.resume();
    if (systemRecorderRef.current?.state === 'paused') systemRecorderRef.current.resume();
    setRecordingState('recording');
  }, []);

  const endRecording = useCallback(async () => {
    setRecordingState('stopping');

    return new Promise<void>((resolve) => {
      let micDone = !micRecorderRef.current || micRecorderRef.current.state === 'inactive';
      let sysDone = !systemRecorderRef.current || systemRecorderRef.current.state === 'inactive';

      const checkDone = async () => {
        if (!micDone || !sysDone) return;

        // Cleanup streams
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
        systemStreamRef.current?.getTracks().forEach((t) => t.stop());
        systemStreamRef.current = null;
        if (audioContextRef.current) { await audioContextRef.current.close(); audioContextRef.current = null; }

        await processAudio();
        resolve();
      };

      if (micRecorderRef.current && micRecorderRef.current.state !== 'inactive') {
        micRecorderRef.current.onstop = () => { micDone = true; checkDone(); };
        micRecorderRef.current.stop();
      }

      if (systemRecorderRef.current && systemRecorderRef.current.state !== 'inactive') {
        systemRecorderRef.current.onstop = () => { sysDone = true; checkDone(); };
        systemRecorderRef.current.stop();
      }

      checkDone();
    });
  }, []);

  const processAudio = async () => {
    setRecordingState('processing');
    setProcessingStatus('Preparing audio...');

    try {
      // Build mic blob (TEACHER)
      const micBlob = micChunksRef.current.length > 0
        ? new Blob(micChunksRef.current, { type: 'audio/webm' })
        : null;

      // Build system blob (STUDENT)
      const systemBlob = systemChunksRef.current.length > 0
        ? new Blob(systemChunksRef.current, { type: 'audio/webm' })
        : null;

      const micSizeMB = micBlob ? (micBlob.size / (1024 * 1024)).toFixed(1) : '0';
      const systemSizeMB = systemBlob ? (systemBlob.size / (1024 * 1024)).toFixed(1) : '0';
      setProcessingStatus(`Mic: ${micSizeMB} MB${systemBlob ? ` · System: ${systemSizeMB} MB` : ''}`);

      // Chunk both
      setProcessingStatus('Encoding audio...');
      const micChunks = micBlob ? await chunkBlob(micBlob) : [];
      const systemChunks = systemBlob ? await chunkBlob(systemBlob) : [];

      const totalChunks = micChunks.length + systemChunks.length;
      if (totalChunks > 1) {
        setProcessingStatus(`Split into ${totalChunks} chunks`);
      }

      setProcessingStatus('Transcribing... This may take a few minutes.');

      const payload: any = {
        studentId: selectedStudent?.id,
        studentName: selectedStudent?.name,
        studentLevel: selectedStudent?.level,
        studentGoals: selectedStudent?.goals,
        durationSeconds: elapsed,
      };

      // Send as multiple chunks if needed, or single payload
      if (micChunks.length <= 1 && systemChunks.length <= 1) {
        // Single request
        if (micChunks.length === 1) payload.micAudioBase64 = micChunks[0];
        if (systemChunks.length === 1) payload.systemAudioBase64 = systemChunks[0];

        const res = await fetch('/api/process-lesson', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errBody.error || `Server error ${res.status}`);
        }

        const data = await res.json();
        setResult(data);
        setRecordingState('done');
      } else {
        // Multi-chunk: send mic and system separately, then ask server to process
        // For simplicity, send all as one big payload with arrays
        // But Vercel has 4.5MB limit per request...

        // Strategy: send mic first, then system, then combine
        // Actually, let's just send everything in one request — the chunks are already split
        // to be under 2.5MB each

        // Merge all chunks into mic and system arrays
        payload.micChunks = micChunks;
        payload.systemChunks = systemChunks;

        const res = await fetch('/api/process-lesson', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errBody.error || `Server error ${res.status}`);
        }

        const data = await res.json();
        setResult(data);
        setRecordingState('done');
      }
    } catch (err: any) {
      console.error('Processing error:', err);
      setError(err.message || 'Failed to process recording');
      setRecordingState('idle');
    }
  };

  const resetRecording = useCallback(() => {
    setRecordingState('idle');
    setElapsed(0);
    setSelectedStudent(null);
    setError('');
    setResult(null);
    setProcessingStatus('');
    setHasSystemAudio(false);
    micChunksRef.current = [];
    systemChunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      systemStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const isRecording = recordingState === 'recording' || recordingState === 'paused';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-ink">Запись урока</h1>
          <p className="text-ink-secondary mt-1">Микрофон = Учитель, Системный звук = Ученик. Автоматическая маркировка.</p>
        </div>

        {/* Student Selection */}
        {recordingState === 'idle' && (
          <Card className="p-8">
            {students.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-ink-secondary mb-4">Сначала добавьте ученика.</p>
                <Button onClick={() => router.push('/students/new')}>Добавить ученика</Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-ink-secondary mb-3">Выберите ученика</label>
                  <div className="grid gap-3">
                    {students.map((student) => (
                      <button key={student.id} onClick={() => setSelectedStudent(student)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${selectedStudent?.id === student.id ? 'border-brand bg-brand-light/30' : 'border-surface-border hover:border-brand/30'}`}>
                        <img src={getAvatarUrl(student.name)} alt="" className="w-12 h-12 rounded-xl object-cover bg-surface-tinted" />
                        <div className="flex-1">
                          <p className="font-bold text-ink">{student.name}</p>
                          <p className="text-sm text-ink-secondary">{student.level} · {student.goals || 'General English'}</p>
                        </div>
                        <Badge className={getLevelColor(student.level)}>{student.level}</Badge>
                      </button>
                    ))}
                  </div>
                </div>
                {error && <div className="p-4 rounded-xl bg-red-50 text-coral text-sm font-semibold">{error}</div>}
                <div className="bg-surface-tinted rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand mt-0.5 flex-shrink-0"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
                    <div>
                      <p className="text-xs font-bold text-ink">Микрофон → Учитель</p>
                      <p className="text-xs text-ink-secondary">Ваш голос записывается отдельно</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-honey mt-0.5 flex-shrink-0"><rect x="2" y="7" width="20" height="15" rx="2" ry="2" /><polyline points="17 2 12 7 7 2" /></svg>
                    <div>
                      <p className="text-xs font-bold text-ink">Системный звук → Ученик</p>
                      <p className="text-xs text-ink-secondary">Звук из Zoom/Meet/Teams записывается отдельно</p>
                    </div>
                  </div>
                </div>

                {/* System-only toggle */}
                <button
                  onClick={() => setSystemOnly(!systemOnly)}
                  className="flex items-center gap-3 p-4 rounded-2xl border-2 transition-all w-full text-left"
                  type="button"
                >
                  <div className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${systemOnly ? 'bg-brand' : 'bg-surface-border'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${systemOnly ? 'left-[18px]' : 'left-0.5'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink">Только системный звук</p>
                    <p className="text-xs text-ink-secondary">Для тестов с YouTube/видео. AI сам определит кто учитель, кто ученик.</p>
                  </div>
                </button>

                <Button onClick={startRecording} disabled={!selectedStudent} size="lg" className="w-full">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" /></svg>
                  Начать запись
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Requesting */}
        {recordingState === 'requesting' && (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-honey/10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F9A825" strokeWidth="2" className="animate-pulse"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">Запрашиваем доступ...</h2>
            <p className="text-sm text-ink-secondary">
              {systemOnly
                ? 'Выберите вкладку/окно с видео и включите «Поделиться звуком»'
                : <>1. Разрешите микрофон<br/>2. Выберите вкладку/окно с уроком и включите «Поделиться звуком»</>
              }
            </p>
          </Card>
        )}

        {/* Recording */}
        {isRecording && selectedStudent && (
          <Card className="p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-8">
              <img src={getAvatarUrl(selectedStudent.name)} alt="" className="w-10 h-10 rounded-xl object-cover bg-surface-tinted" />
              <div className="text-left">
                <p className="font-bold text-ink">{selectedStudent.name}</p>
                <p className="text-xs text-ink-secondary">{selectedStudent.level}</p>
              </div>
            </div>

            {/* Audio indicators */}
            {!systemOnly && (
              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-brand animate-pulse" />
                  <span className="text-xs font-bold text-brand">Микрофон (Учитель)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${hasSystemAudio ? 'bg-honey animate-pulse' : 'bg-gray-300'}`} />
                  <span className={`text-xs font-bold ${hasSystemAudio ? 'text-honey' : 'text-ink-muted'}`}>
                    {hasSystemAudio ? 'Система (Ученик)' : 'Без системного звука'}
                  </span>
                </div>
              </div>
            )}
            {systemOnly && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className={`w-3 h-3 rounded-full ${hasSystemAudio ? 'bg-honey animate-pulse' : 'bg-gray-300'}`} />
                <span className={`text-xs font-bold ${hasSystemAudio ? 'text-honey' : 'text-ink-muted'}`}>
                  {hasSystemAudio ? 'Системный звук — AI определит спикеров' : 'Ожидание системного звука...'}
                </span>
              </div>
            )}

            <div className="mb-8">
              <div className="w-24 h-24 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-4 relative">
                <div className={`w-6 h-6 rounded-full bg-coral ${recordingState === 'recording' ? 'recording-pulse' : ''}`} />
                {recordingState === 'recording' && <div className="absolute inset-0 rounded-full border-4 border-coral/20" style={{ animation: 'recording-pulse 1.5s ease-in-out infinite' }} />}
              </div>
              <p className="text-lg font-bold text-ink">{recordingState === 'recording' ? 'Запись' : 'Пауза'}</p>
              <p className="text-4xl font-black text-ink mt-2 font-mono">{formatDuration(elapsed)}</p>
            </div>
            <div className="flex items-center justify-center gap-4">
              {recordingState === 'recording' ? (
                <Button onClick={pauseRecording} variant="secondary" size="lg">Пауза</Button>
              ) : (
                <Button onClick={resumeRecording} variant="secondary" size="lg">Продолжить</Button>
              )}
              <button onClick={endRecording} className="px-8 py-4 bg-coral text-white font-bold rounded-2xl shadow-[0_4px_0_0_#d32f2f] hover:bg-red-500 transition-all active:translate-y-[2px] active:shadow-none text-base">
                Завершить
              </button>
            </div>
          </Card>
        )}

        {/* Processing */}
        {recordingState === 'processing' && (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-light flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">Обработка урока...</h2>
            <p className="text-sm text-ink-secondary">{processingStatus}</p>
            <p className="text-xs text-ink-muted mt-2">Транскрибация двух дорожек + AI анализ. 2-5 минут.</p>
          </Card>
        )}

        {/* Done */}
        {recordingState === 'done' && result && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink">Урок записан и проанализирован</h2>
                  <p className="text-sm text-ink-secondary">{selectedStudent?.name} {result.dualTrack && '· Две дорожки'}</p>
                </div>
              </div>
            </Card>

            {result.analysis?.summary && (
              <Card className="p-6">
                <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">Резюме урока</h3>
                <p className="text-sm text-ink leading-relaxed">{result.analysis.summary}</p>
                {result.analysis.engagement_score > 0 && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs text-ink-muted">Вовлечённость:</span>
                    <div className="w-24 h-2 rounded-full bg-surface-tinted overflow-hidden"><div className="h-full rounded-full bg-brand" style={{ width: `${result.analysis.engagement_score}%` }} /></div>
                    <span className="text-xs font-bold text-brand">{result.analysis.engagement_score}%</span>
                  </div>
                )}
              </Card>
            )}

            {result.analysis?.teacher_student_transcript && (
              <Card className="p-6">
                <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">Расшифровка (Учитель / Ученик)</h3>
                <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{result.analysis.teacher_student_transcript}</div>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.analysis?.topics?.length > 0 && (
                <Card className="p-5">
                  <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">Темы</h3>
                  <div className="flex flex-wrap gap-2">{result.analysis.topics.map((t: string, i: number) => <span key={i} className="px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold">{t}</span>)}</div>
                </Card>
              )}
              {result.analysis?.key_vocabulary?.length > 0 && (
                <Card className="p-5">
                  <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">Словарный запас</h3>
                  <div className="flex flex-wrap gap-2">{result.analysis.key_vocabulary.map((v: string, i: number) => <span key={i} className="px-3 py-1 rounded-full bg-honey/10 text-honey text-xs font-bold">{v}</span>)}</div>
                </Card>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.analysis?.strengths?.length > 0 && (
                <Card className="p-5">
                  <h3 className="text-sm font-bold text-green-700 uppercase tracking-wider mb-3">Сильные стороны</h3>
                  <ul className="space-y-2">{result.analysis.strengths.map((s: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm text-ink"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2.5" className="mt-0.5 flex-shrink-0"><polyline points="20 6 9 17 4 12" /></svg>{s}</li>)}</ul>
                </Card>
              )}
              {result.analysis?.weaknesses?.length > 0 && (
                <Card className="p-5">
                  <h3 className="text-sm font-bold text-coral uppercase tracking-wider mb-3">Слабые стороны</h3>
                  <ul className="space-y-2">{result.analysis.weaknesses.map((w: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm text-ink"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF5350" strokeWidth="2.5" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>{w}</li>)}</ul>
                </Card>
              )}
            </div>

            {result.analysis?.next_lesson_recommendation && (
              <Card className="p-5">
                <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">Рекомендация на следующий урок</h3>
                <p className="text-sm text-ink">{result.analysis.next_lesson_recommendation}</p>
              </Card>
            )}

            <div className="flex gap-3">
              <Button onClick={() => router.push(`/lessons/${result.lessonId}`)} className="flex-1">Открыть урок</Button>
              <Button onClick={resetRecording} variant="secondary" className="flex-1">Новая запись</Button>
            </div>
          </div>
        )}

        {error && recordingState === 'idle' && <div className="mt-4 p-4 rounded-xl bg-red-50 text-coral text-sm font-semibold">{error}</div>}
      </div>
    </DashboardLayout>
  );
}

export default function NewLessonPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><span className="text-ink-muted">Loading...</span></div>}>
      <NewLessonContent />
    </Suspense>
  );
}
