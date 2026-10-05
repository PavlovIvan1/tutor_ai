'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { getInitials, getLevelColor, formatDuration, getAvatarUrl } from '@/lib/utils';
import { mockStore, lessonsLeft, lessonLimit, planById } from '@/lib/mock-store';
import type { Subscription } from '@/lib/mock-store';
import Paywall from '@/components/ui/Paywall';
import type { Student } from '@/lib/types';

type RecordingState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopping' | 'processing' | 'done';

// Каждые 2 минуты запись разрезается на отдельный самодостаточный WebM-файл:
// такой файл корректно читает Whisper (байтовое разрезание длинной записи — нет).
const SEGMENT_MS = 2 * 60 * 1000;
const MAX_SEGMENT_BYTES = 3 * 1024 * 1024;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function readErrorMessage(res: Response, body: any): Promise<string> {
  if (res.status === 413) return 'Аудиофайл слишком большой для загрузки. Попробуйте записать урок короче.';
  if (res.status === 404) return body?.error || 'Урок не найден — попробуйте записать заново.';
  return body?.error || `Ошибка сервера (${res.status})`;
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
  const [swapTracks, setSwapTracks] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const refreshSubscription = () => {
    const { data } = mockStore.subscription.get();
    setSubscription(data);
  };

  useEffect(() => {
    refreshSubscription();
  }, []);

  const leftLessons = lessonsLeft(subscription);
  const isFreePlan = !subscription?.plan;

  const micRecorderRef = useRef<MediaRecorder | null>(null);
  const systemRecorderRef = useRef<MediaRecorder | null>(null);
  const micChunksRef = useRef<Blob[]>([]);
  const systemChunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const rotateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');
  const recordingActiveRef = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/students');
        if (!res.ok) return;
        const data = await res.json();
        const list: Student[] = data.students || [];
        setStudents(list);
        if (preselectedStudentId) {
          const student = list.find((s: Student) => s.id === preselectedStudentId);
          if (student) setSelectedStudent(student);
        }
      } catch (e) {
        console.error('Failed to load students:', e);
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

  // Каждый сегмент — отдельный самодостаточный WebM (старт/стоп recorder'а)
  const createSegmentRecorder = (stream: MediaStream, sink: Blob[]): MediaRecorder => {
    const rec = new MediaRecorder(stream, { mimeType: mimeTypeRef.current });
    rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) sink.push(e.data); };
    return rec;
  };

  const rotateTrack = (which: 'mic' | 'system') => {
    const rec = which === 'mic' ? micRecorderRef.current : systemRecorderRef.current;
    const stream = which === 'mic' ? micStreamRef.current : systemStreamRef.current;
    const sink = which === 'mic' ? micChunksRef.current : systemChunksRef.current;
    if (!rec || !stream || rec.state !== 'recording') return;

    rec.onstop = () => {
      if (!recordingActiveRef.current) return;
      const next = createSegmentRecorder(stream, sink);
      if (which === 'mic') micRecorderRef.current = next; else systemRecorderRef.current = next;
      try { next.start(); } catch { /* stream уже остановлена */ }
    };
    try { rec.stop(); } catch { /* ignore */ }
  };

  const startRecording = useCallback(async () => {
    if (!selectedStudent) return;
    if (lessonsLeft(mockStore.subscription.get().data) <= 0) {
      setError('Лимит уроков исчерпан. Продлите подписку, чтобы записывать дальше.');
      setRecordingState('idle');
      return;
    }
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

      // 3. Create separate MediaRecorders (по одному сегменту за раз)
      mimeTypeRef.current = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      micChunksRef.current = [];
      systemChunksRef.current = [];
      recordingActiveRef.current = true;

      if (micStream) {
        micRecorderRef.current = createSegmentRecorder(micStream, micChunksRef.current);
      } else {
        micRecorderRef.current = null;
      }

      if (systemStream) {
        systemRecorderRef.current = createSegmentRecorder(systemStream, systemChunksRef.current);
      } else {
        systemRecorderRef.current = null;
      }

      // 4. Start both
      micRecorderRef.current?.start();
      systemRecorderRef.current?.start();

      // Каждые 2 минуты закрываем текущий сегмент и открываем новый
      if (rotateTimerRef.current) clearInterval(rotateTimerRef.current);
      rotateTimerRef.current = setInterval(() => {
        rotateTrack('mic');
        rotateTrack('system');
      }, SEGMENT_MS);

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

    // Остановить ротацию сегментов до остановки recorder'ов
    recordingActiveRef.current = false;
    if (rotateTimerRef.current) { clearInterval(rotateTimerRef.current); rotateTimerRef.current = null; }

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
    setProcessingStatus('Подготовка аудио...');

    try {
      const micSegments = micChunksRef.current;
      const systemSegments = systemChunksRef.current;

      const micMB = micSegments.reduce((s, b) => s + b.size, 0) / (1024 * 1024);
      const sysMB = systemSegments.reduce((s, b) => s + b.size, 0) / (1024 * 1024);
      setProcessingStatus(`Микрофон: ${micMB.toFixed(1)} МБ${systemSegments.length ? ` · Система: ${sysMB.toFixed(1)} МБ` : ''}`);

      if (!micSegments.length && !systemSegments.length) {
        throw new Error('Запись пуста — нет аудиоданных.');
      }

      const oversized = [...micSegments, ...systemSegments].find((b) => b.size > MAX_SEGMENT_BYTES);
      if (oversized) {
        throw new Error('Сегмент записи получился слишком большим — попробуйте записать урок меньшей длительности.');
      }

      // 1. Создаём урок
      setProcessingStatus('Создание урока...');
      const initRes = await fetch('/api/lesson-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          init: true,
          studentId: selectedStudent?.id,
          studentName: selectedStudent?.name,
          studentLevel: selectedStudent?.level,
          studentGoals: selectedStudent?.goals,
          durationSeconds: elapsed,
        }),
      });
      const initBody = await initRes.json().catch(() => ({}));
      if (!initRes.ok) throw new Error(await readErrorMessage(initRes, initBody));
      const lessonId: string = initBody.lessonId;
      if (!lessonId) throw new Error('Не удалось создать урок');

      // 2. Загружаем сегменты: каждый сегмент — отдельный запрос (тело < лимита Vercel)
      const total = micSegments.length + systemSegments.length;
      let uploaded = 0;

      const uploadTrack = async (track: 'mic' | 'system', segments: Blob[]) => {
        for (let i = 0; i < segments.length; i++) {
          setProcessingStatus(`Загрузка аудио ${uploaded + 1}/${total}...`);
          const data = await blobToBase64(segments[i]);
          const res = await fetch('/api/lesson-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lessonId,
              studentId: selectedStudent?.id,
              studentName: selectedStudent?.name,
              studentLevel: selectedStudent?.level,
              studentGoals: selectedStudent?.goals,
              durationSeconds: elapsed,
              track,
              index: i,
              data,
            }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(await readErrorMessage(res, body));
          uploaded++;
          setProcessingStatus(`Загрузка аудио ${uploaded}/${total}...`);
        }
      };

      // Треки загружаются параллельно, сегменты внутри трека — последовательно
      await Promise.all([uploadTrack('mic', micSegments), uploadTrack('system', systemSegments)]);

      // 3. Финализация: склейка дорожек + AI-анализ
      setProcessingStatus('AI-анализ урока... Это может занять минуту.');
      const res = await fetch('/api/process-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staged: true,
          lessonId,
          studentId: selectedStudent?.id,
          studentName: selectedStudent?.name,
          studentLevel: selectedStudent?.level,
          studentGoals: selectedStudent?.goals,
          durationSeconds: elapsed,
          swapTracks,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(await readErrorMessage(res, body));

      // Урок списывается только после успешной обработки урока
      mockStore.subscription.useLesson();
      const updatedSub = mockStore.subscription.get().data;
      setSubscription(updatedSub);
      setResult({ ...body, lessonsLeft: lessonsLeft(updatedSub), lessonsTotal: lessonLimit(updatedSub) });
      setRecordingState('done');
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
      if (rotateTimerRef.current) clearInterval(rotateTimerRef.current);
      recordingActiveRef.current = false;
    };
  }, []);

  const isRecording = recordingState === 'recording' || recordingState === 'paused';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-ink">Запись урока</h1>
            <p className="text-ink-secondary mt-1">
              {swapTracks
                ? 'Reverb: Системный звук = Учитель, Микрофон = Ученик.'
                : 'Микрофон = Учитель, Системный звук = Ученик. Автоматическая маркировка.'}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold">
              {planById(subscription?.plan || null)?.name || 'Бесплатный тариф'}
            </span>
            <p className="text-xs text-ink-muted mt-1.5">
              Осталось уроков: <strong className="text-ink">{leftLessons}</strong> из {lessonLimit(subscription)}
            </p>
          </div>
        </div>

        {/* Лимит исчерпан */}
        {recordingState === 'idle' && leftLessons <= 0 && (
          <Card className="p-4">
            <Paywall
              title="Лимит уроков исчерпан"
              description={
                isFreePlan
                  ? `Бесплатный тариф включает ${lessonLimit(subscription)} урок — он уже использован. Оформите помесячную подписку, чтобы записывать уроки дальше.`
                  : `Лимит уроков тарифа «${planById(subscription?.plan || null)?.name}» на этот месяц исчерпан. Продлите подписку, чтобы лимит обновился.`
              }
              cta="Выбрать тариф"
            />
          </Card>
        )}

        {/* Student Selection */}
        {recordingState === 'idle' && leftLessons > 0 && (
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
                      <p className="text-xs font-bold text-ink">
                        {swapTracks ? 'Микрофон → Ученик' : 'Микрофон → Учитель'}
                      </p>
                      <p className="text-xs text-ink-secondary">Записывается отдельным треком</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-honey mt-0.5 flex-shrink-0"><rect x="2" y="7" width="20" height="15" rx="2" ry="2" /><polyline points="17 2 12 7 7 2" /></svg>
                    <div>
                      <p className="text-xs font-bold text-ink">
                        {swapTracks ? 'Системный звук → Учитель' : 'Системный звук → Ученик'}
                      </p>
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

                {/* Reverb: swap teacher/student tracks */}
                <button
                  onClick={() => setSwapTracks(!swapTracks)}
                  className="flex items-center gap-3 p-4 rounded-2xl border-2 transition-all w-full text-left"
                  type="button"
                >
                  <div className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${swapTracks ? 'bg-brand' : 'bg-surface-border'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${swapTracks ? 'left-[18px]' : 'left-0.5'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink">Reverb</p>
                    <p className="text-xs text-ink-secondary">
                      {swapTracks
                        ? 'Системный звук → Учитель, микрофон → Ученик'
                        : 'Микрофон → Учитель, системный звук → Ученик (по умолчанию)'}
                    </p>
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
                  <span className="text-xs font-bold text-brand">
                    {swapTracks ? 'Микрофон (Ученик)' : 'Микрофон (Учитель)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${hasSystemAudio ? 'bg-honey animate-pulse' : 'bg-gray-300'}`} />
                  <span className={`text-xs font-bold ${hasSystemAudio ? 'text-honey' : 'text-ink-muted'}`}>
                    {hasSystemAudio ? (swapTracks ? 'Система (Учитель)' : 'Система (Ученик)') : 'Без системного звука'}
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
            <p className="text-xs text-ink-muted mt-2">Сегменты загружаются и транскрибируются по очереди, затем AI-анализ. 60-минутный урок — до 10 минут.</p>
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
                  <p className="text-xs text-ink-muted mt-1">
                    Списано 1 урок · Осталось {result.lessonsLeft} из {result.lessonsTotal}
                  </p>
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
