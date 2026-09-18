'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import { getInitials, getLevelColor, formatDuration } from '@/lib/utils';
import type { Student } from '@/lib/types';

type RecordingState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopping' | 'done';

function NewLessonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedStudentId = searchParams.get('student');

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  // Load students
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('tutor_id', user.id)
        .eq('is_archived', false)
        .order('name');

      setStudents(data || []);

      if (preselectedStudentId) {
        const student = data?.find((s) => s.id === preselectedStudentId);
        if (student) setSelectedStudent(student);
      }
    }
    load();
  }, []);

  // Timer
  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recordingState]);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const startRecording = useCallback(async () => {
    if (!selectedStudent) return;

    setRecordingState('requesting');
    setError('');

    try {
      // 1. Get microphone
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Try to capture system audio (Chrome tab/window audio)
      let systemStream: MediaStream | null = null;
      try {
        const screenCapture = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 44100,
          },
        });
        const audioTracks = screenCapture.getAudioTracks();
        if (audioTracks.length === 0) {
          screenCapture.getTracks().forEach((t) => t.stop());
        } else {
          systemStream = new MediaStream(audioTracks);
          screenCapture.getVideoTracks().forEach((t) => t.stop());
          screenStreamRef.current = systemStream;
        }
      } catch {
        // User cancelled screen share — continue with mic only
      }

      // 3. Mix streams
      let finalStream: MediaStream;
      if (systemStream) {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const micSource = audioContext.createMediaStreamSource(micStream);
        const systemSource = audioContext.createMediaStreamSource(systemStream);
        const destination = audioContext.createMediaStreamDestination();
        micSource.connect(destination);
        systemSource.connect(destination);
        finalStream = new MediaStream([...destination.stream.getAudioTracks()]);
      } else {
        finalStream = micStream;
      }

      streamRef.current = finalStream;

      // 4. Start MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(finalStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000);
      setRecordingState('recording');
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Доступ к микрофону запрещён. Разрешите доступ и попробуйте снова.');
      } else if (err.name === 'NotFoundError') {
        setError('Микрофон не найден. Подключите микрофон и попробуйте снова.');
      } else {
        setError(err.message || 'Не удалось начать запись');
      }
      setRecordingState('idle');
    }
  }, [selectedStudent]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
    }
  }, []);

  const endRecording = useCallback(async () => {
    setRecordingState('stopping');

    return new Promise<void>((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve();
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
          screenStreamRef.current = null;
        }
        if (audioContextRef.current) {
          await audioContextRef.current.close();
          audioContextRef.current = null;
        }

        // Build blob and download to device
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const studentName = selectedStudent?.name.replace(/\s+/g, '_') || 'lesson';
        const date = new Date().toISOString().slice(0, 10);
        downloadBlob(blob, `lesson_${studentName}_${date}.webm`);

        setRecordingState('done');
        resolve();
      };

      mediaRecorderRef.current.stop();
    });
  }, [selectedStudent, downloadBlob]);

  const resetRecording = useCallback(() => {
    setRecordingState('idle');
    setElapsed(0);
    setSelectedStudent(null);
    setError('');
    chunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const isRecording = recordingState === 'recording' || recordingState === 'paused';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-ink">Запись урока</h1>
          <p className="text-ink-secondary mt-1">Выберите ученика и начните запись.</p>
        </div>

        {/* Student Selection + Start */}
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
                      <button
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                          selectedStudent?.id === student.id
                            ? 'border-brand bg-brand-light/30'
                            : 'border-surface-border hover:border-brand/30'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center text-brand-dark font-bold">
                          {getInitials(student.name)}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-ink">{student.name}</p>
                          <p className="text-sm text-ink-secondary">{student.level} · {student.goals || 'General English'}</p>
                        </div>
                        <Badge className={getLevelColor(student.level)}>{student.level}</Badge>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-50 text-coral text-sm font-semibold">
                    {error}
                  </div>
                )}

                <div className="bg-surface-tinted rounded-2xl p-4 flex items-start gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand mt-0.5 flex-shrink-0">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <p className="text-xs text-ink-secondary">
                    Запись шифруется и обрабатывается локально. Аудио не загружается на сервер — файл сохраняется на ваше устройство.
                  </p>
                </div>

                <Button
                  onClick={startRecording}
                  disabled={!selectedStudent}
                  size="lg"
                  className="w-full"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                  </svg>
                  Начать запись
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Requesting Permission */}
        {recordingState === 'requesting' && (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-honey/10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F9A825" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">Запрашиваем доступ...</h2>
            <p className="text-sm text-ink-secondary">Разрешите доступ к микрофону. Если хотите записать звук собеседника — выберите вкладку и поставьте галочку «Поделиться звуком».</p>
          </Card>
        )}

        {/* Recording Interface */}
        {isRecording && selectedStudent && (
          <Card className="p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand-dark font-bold text-sm">
                {getInitials(selectedStudent.name)}
              </div>
              <div className="text-left">
                <p className="font-bold text-ink">{selectedStudent.name}</p>
                <p className="text-xs text-ink-secondary">{selectedStudent.level}</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="w-24 h-24 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-4 relative">
                <div className={`w-6 h-6 rounded-full bg-coral ${recordingState === 'recording' ? 'recording-pulse' : ''}`} />
                {recordingState === 'recording' && (
                  <div className="absolute inset-0 rounded-full border-4 border-coral/20" style={{ animation: 'recording-pulse 1.5s ease-in-out infinite' }} />
                )}
              </div>
              <p className="text-lg font-bold text-ink">
                {recordingState === 'recording' ? 'Запись' : 'Пауза'}
              </p>
              <p className="text-4xl font-black text-ink mt-2 font-mono">{formatDuration(elapsed)}</p>
            </div>

            <div className="flex items-center justify-center gap-4">
              {recordingState === 'recording' ? (
                <Button onClick={pauseRecording} variant="secondary" size="lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                  Пауза
                </Button>
              ) : (
                <Button onClick={resumeRecording} variant="secondary" size="lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                  </svg>
                  Продолжить
                </Button>
              )}
              <button
                onClick={endRecording}
                className="px-8 py-4 bg-coral text-white font-bold rounded-2xl shadow-[0_4px_0_0_#d32f2f] hover:bg-red-500 transition-all active:translate-y-[2px] active:shadow-none text-base"
              >
                Завершить
              </button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Запись шифруется. Файл останется на вашем устройстве.
            </div>
          </Card>
        )}

        {/* Done */}
        {recordingState === 'done' && (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-light flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">Запись скачана!</h2>
            <p className="text-sm text-ink-secondary mb-6">
              Файл <span className="font-bold">lesson_{selectedStudent?.name.replace(/\s+/g, '_')}_{new Date().toISOString().slice(0, 10)}.webm</span> сохранён в загрузки.
            </p>
            <Button onClick={resetRecording} size="lg">
              Новая запись
            </Button>
          </Card>
        )}

        {/* Error when idle */}
        {error && recordingState === 'idle' && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 text-coral text-sm font-semibold">
            {error}
          </div>
        )}
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
