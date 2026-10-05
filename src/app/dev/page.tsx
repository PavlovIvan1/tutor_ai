'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

const CHUNK_RAW = Math.floor(2.5 * 1024 * 1024);

type Phase = 'idle' | 'init' | 'upload' | 'transcribe' | 'analyze' | 'done' | 'error';

export default function DevUploadPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);

  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ lessonId: string; durationSeconds: number; parts: number; segments: number } | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    fetch('/api/students')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStudents(d.students || []))
      .catch(() => {});
  }, []);

  const onPickFile = (f: File | null) => {
    setFile(f);
    setDuration(0);
    setError('');
    setResult(null);
    if (!f) return;
    const url = URL.createObjectURL(f);
    const a = document.createElement('audio');
    a.preload = 'metadata';
    a.onloadedmetadata = () => {
      setDuration(Number.isFinite(a.duration) ? a.duration : 0);
      URL.revokeObjectURL(url);
    };
    a.onerror = () => URL.revokeObjectURL(url);
    a.src = url;
  };

  const post = async (url: string, payload: any): Promise<any> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Ошибка ${res.status}`);
    return body;
  };

  const start = async () => {
    if (busyRef.current) return;
    if (!file) {
      setError('Выберите файл');
      return;
    }
    busyRef.current = true;
    setError('');
    setResult(null);

    try {
      // 1. Создаём урок
      setPhase('init');
      setStep('Создание урока...');
      const init = await post('/api/lesson-audio', {
        init: true,
        ...(studentId ? { studentId } : {}),
        durationSeconds: Math.round(duration),
      });
      const lessonId: string = init.lessonId;
      if (!lessonId) throw new Error('Не удалось создать урок');

      // 2. Загружаем файл чанками (каждый запрос < лимита Vercel)
      const total = Math.max(1, Math.ceil(file.size / CHUNK_RAW));
      setPhase('upload');
      setProgress({ done: 0, total });

      for (let i = 0; i < total; i++) {
        const slice = file.slice(i * CHUNK_RAW, Math.min((i + 1) * CHUNK_RAW, file.size));
        const b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
          reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
          reader.readAsDataURL(slice);
        });
        await post('/api/dev/upload', { action: 'chunk', lessonId, index: i, data: b64 });
        setProgress({ done: i + 1, total });
      }

      // 3. ffmpeg режет, Whisper транскрибирует
      setPhase('transcribe');
      setStep('Обработка аудио: ffmpeg + Whisper. Это может занять пару минут...');
      const fin = await post('/api/dev/upload', {
        action: 'finalize',
        lessonId,
        filename: file.name,
      });

      // 4. AI-анализ
      setPhase('analyze');
      setStep('AI-анализ урока...');
      await post('/api/process-lesson', {
        staged: true,
        lessonId,
        ...(studentId ? { studentId } : {}),
        durationSeconds: fin.durationSeconds,
      });

      setPhase('done');
      setResult({
        lessonId,
        durationSeconds: fin.durationSeconds,
        parts: fin.parts,
        segments: fin.segments,
      });
    } catch (e: any) {
      setError(e.message || 'Ошибка обработки');
      setPhase('error');
    }
    busyRef.current = false;
  };

  const busy = phase !== 'idle' && phase !== 'done' && phase !== 'error';

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-ink">Dev · Загрузка урока из файла</h1>
          <p className="text-ink-secondary mt-1">
            Заготовка урока из готового аудио/видеофайла: транскрибация, AI-анализ, домашка — полный пайплайн без
            записи в браузере.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-5">
            <Select
              label="Ученик"
              options={[{ value: '', label: 'Без ученика' }, ...students.map((s) => ({ value: s.id, label: `${s.name} · ${s.level}` }))]}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />

            <div>
              <label className="block text-sm font-bold text-ink mb-2">Файл урока</label>
              <input
                type="file"
                accept="audio/*,video/mp4,video/webm,.mp3,.m4a,.wav,.webm,.mp4,.ogg,.aac,.flac"
                onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-ink-secondary file:mr-4 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-brand-light file:text-brand-dark file:text-sm file:font-bold hover:file:bg-brand/20 file:cursor-pointer"
              />
              {file && (
                <p className="text-xs text-ink-muted mt-2">
                  {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} МБ
                  {duration ? ` · ${Math.round(duration / 60)} мин` : ''}
                </p>
              )}
            </div>

            {error && <div className="p-3 rounded-xl bg-red-50 text-coral text-sm font-semibold">{error}</div>}

            <div className="flex items-center gap-3">
              <Button onClick={start} loading={busy} disabled={busy || !file}>
                {busy ? 'Обработка...' : 'Загрузить и обработать'}
              </Button>
              {result && (
                <Link href={`/lessons/${result.lessonId}`} className="text-sm font-bold text-brand hover:underline">
                  Открыть урок →
                </Link>
              )}
            </div>

            {busy && (
              <div className="rounded-2xl bg-surface-tinted p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-block w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-bold text-ink">
                    {phase === 'upload'
                      ? `Загрузка файла: ${progress.done}/${progress.total}`
                      : step}
                  </p>
                </div>
                {phase === 'upload' && (
                  <div className="mt-3 h-2 rounded-full bg-white overflow-hidden">
                    <div
                      className="h-full bg-brand transition-all duration-200"
                      style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {result && (
              <div className="rounded-2xl bg-brand/10 p-4 text-sm text-brand-dark font-semibold">
                Готово: {Math.round(result.durationSeconds / 60)} мин · частей {result.parts} · сегментов речи{' '}
                {result.segments}
              </div>
            )}
          </Card>

          <Card className="p-5 text-xs text-ink-muted space-y-1">
            <p>Как это работает: файл режется на части (ffmpeg), каждая часть транскрибируется Whisper, затем идёт стандартный AI-анализ.</p>
            <p>Поддерживаемые форматы: mp3, m4a, wav, webm, mp4, ogg, flac — любые, которые берёт ffmpeg. Большие файлы режутся на части и обрабатываются по частям.</p>
            <p>Урок появится в списке уроков и обработается как обычный урок, записанный в браузере.</p>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
