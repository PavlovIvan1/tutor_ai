'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { getDb, isDbConfigured } from '@/lib/db';

interface LessonDetail {
  lesson: any;
  transcript: string;
  segments: any[];
  analysis: any;
  student: any;
  homework: any;
}

export default function LessonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;
  const [data, setData] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingHomework, setGeneratingHomework] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/lessons/${lessonId}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (e) {
        console.error('Failed to load lesson:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lessonId]);

  const generateHomework = async () => {
    setGeneratingHomework(true);
    try {
      const res = await fetch('/api/homework/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      });
      if (res.ok) {
        const result = await res.json();
        setData(prev => prev ? { ...prev, homework: result.homework } : prev);
      }
    } catch (e) {
      console.error('Failed to generate homework:', e);
    } finally {
      setGeneratingHomework(false);
    }
  };

  const downloadHomework = async () => {
    if (!data?.homework?.id) return;
    window.open(`/api/homework/${data.homework.id}/export`, '_blank');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-ink-secondary">Урок не найден</p>
          <Button onClick={() => router.push('/lessons')} className="mt-4">Назад к урокам</Button>
        </div>
      </DashboardLayout>
    );
  }

  const analysis = data.analysis?.raw_ai_response || data.analysis || {};
  const rawAnalysis = typeof analysis.raw_ai_response === 'string'
    ? JSON.parse(analysis.raw_ai_response || '{}')
    : analysis.raw_ai_response || analysis;

  const summary = rawAnalysis.summary || analysis.summary || '';
  const topics = rawAnalysis.topics || analysis.topics || [];
  const strengths = rawAnalysis.strengths || analysis.strengths || [];
  const weaknesses = rawAnalysis.weaknesses || analysis.weaknesses || [];
  const transcript = data.transcript || '';
  const teacherStudentText = rawAnalysis.teacher_student_transcript || '';
  const vocab = rawAnalysis.key_vocabulary || [];
  const grammar = rawAnalysis.grammar_focus || [];
  const nextRec = rawAnalysis.next_lesson_recommendation || analysis.next_lesson_recommendation || '';
  const engagementScore = rawAnalysis.engagement_score || 0;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button onClick={() => router.push('/lessons')} className="text-sm text-brand hover:underline mb-2 inline-block">← Назад к урокам</button>
            <h1 className="text-3xl font-black text-ink">Детали урока</h1>
            <p className="text-ink-secondary mt-1">{data.student?.name || 'Student'} · {data.lesson?.duration_seconds ? `${Math.floor(data.lesson.duration_seconds / 60)} мин` : ''}</p>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <Card className="p-6 mb-6">
            <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">Резюме</h3>
            <p className="text-sm text-ink leading-relaxed">{summary}</p>
            {engagementScore > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-ink-muted">Вовлечённость:</span>
                <div className="w-24 h-2 rounded-full bg-surface-tinted overflow-hidden">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${engagementScore}%` }} />
                </div>
                <span className="text-xs font-bold text-brand">{engagementScore}%</span>
              </div>
            )}
          </Card>
        )}

        {/* Transcript */}
        {teacherStudentText && (
          <Card className="p-6 mb-6">
            <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">Расшифровка (учитель / ученик)</h3>
            <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {teacherStudentText}
            </div>
          </Card>
        )}

        {transcript && !teacherStudentText && (
          <Card className="p-6 mb-6">
            <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">Расшифровка</h3>
            <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {transcript}
            </div>
          </Card>
        )}

        {/* Topics + Vocab */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {topics.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">Темы</h3>
              <div className="flex flex-wrap gap-2">
                {topics.map((t: string, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold">{t}</span>
                ))}
              </div>
            </Card>
          )}
          {vocab.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">Словарный запас</h3>
              <div className="flex flex-wrap gap-2">
                {vocab.map((v: string, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-honey/10 text-honey text-xs font-bold">{v}</span>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Grammar */}
        {grammar.length > 0 && (
          <Card className="p-5 mb-6">
            <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">Грамматика</h3>
            <div className="flex flex-wrap gap-2">
              {grammar.map((g: string, i: number) => (
                <span key={i} className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">{g}</span>
              ))}
            </div>
          </Card>
        )}

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {strengths.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-green-700 uppercase tracking-wider mb-3">Сильные стороны</h3>
              <ul className="space-y-2">
                {strengths.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2.5" className="mt-0.5 flex-shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {weaknesses.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-coral uppercase tracking-wider mb-3">Слабые стороны</h3>
              <ul className="space-y-2">
                {weaknesses.map((w: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF5350" strokeWidth="2.5" className="mt-0.5 flex-shrink-0">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {w}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Next Lesson Recommendation */}
        {nextRec && (
          <Card className="p-5 mb-6">
            <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">Рекомендация на следующий урок</h3>
            <p className="text-sm text-ink">{nextRec}</p>
          </Card>
        )}

        {/* Homework Section */}
        <Card className="p-6 mb-6">
          <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">Домашнее задание</h3>
          {data.homework ? (
            <div>
              <p className="text-sm text-ink-secondary mb-3">{data.homework.title}</p>
              <Button onClick={downloadHomework} size="sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Скачать Word
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-ink-secondary mb-3">Домашнее задание ещё не сгенерировано.</p>
              <Button onClick={generateHomework} disabled={generatingHomework} size="sm">
                {generatingHomework ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Сгенерировать домашку
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
