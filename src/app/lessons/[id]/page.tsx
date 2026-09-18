'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatDuration } from '@/lib/utils';
import type { Lesson, LessonAnalysis, LessonTranscript } from '@/lib/types';

export default function LessonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [analysis, setAnalysis] = useState<LessonAnalysis | null>(null);
  const [transcript, setTranscript] = useState<LessonTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingHomework, setGeneratingHomework] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('*, student:students(*)')
        .eq('id', params.id)
        .single();

      if (lessonData) {
        setLesson(lessonData);

        const { data: analysisData } = await supabase
          .from('lesson_analyses')
          .select('*')
          .eq('lesson_id', params.id)
          .single();

        setAnalysis(analysisData);

        const { data: transcriptData } = await supabase
          .from('lesson_transcripts')
          .select('*')
          .eq('lesson_id', params.id)
          .single();

        setTranscript(transcriptData);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  const handleGenerateHomework = async () => {
    if (!analysis || !lesson) return;
    setGeneratingHomework(true);

    try {
      const response = await fetch(`/api/homework/${lesson.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });

      if (!response.ok) throw new Error('Failed to generate homework');

      const data = await response.json();
      router.push(`/homework/${data.homeworkId}`);
    } catch (error) {
      console.error('Failed to generate homework:', error);
    } finally {
      setGeneratingHomework(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!lesson) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-ink-secondary">Lesson not found.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/lessons" className="text-sm text-ink-muted hover:text-ink">Lessons</Link>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="text-sm text-ink-secondary">Lesson Detail</span>
          </div>
          <h1 className="text-3xl font-black text-ink">Lesson Analysis</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-ink-secondary">{lesson.student?.name}</span>
            <span className="text-sm text-ink-muted">·</span>
            <span className="text-sm text-ink-secondary">{formatDate(lesson.created_at)}</span>
            {lesson.duration_seconds && (
              <>
                <span className="text-sm text-ink-muted">·</span>
                <span className="text-sm text-ink-secondary">{formatDuration(lesson.duration_seconds)}</span>
              </>
            )}
          </div>
        </div>
        {analysis && (
          <Button onClick={handleGenerateHomework} loading={generatingHomework}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Generate Homework
          </Button>
        )}
      </div>

      {!analysis ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-tinted flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">Processing lesson...</h2>
          <p className="text-sm text-ink-secondary">AI is analyzing the transcript. This may take a moment.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-ink mb-3">Lesson Summary</h2>
              <p className="text-ink-secondary leading-relaxed">{analysis.summary}</p>
            </Card>

            {/* Topics */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-ink mb-3">Topics Covered</h2>
              <div className="flex flex-wrap gap-2">
                {analysis.topics.map((topic, i) => (
                  <Badge key={i} variant="info">{topic}</Badge>
                ))}
              </div>
            </Card>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6">
                <h2 className="text-lg font-bold text-ink mb-3">Strengths</h2>
                <ul className="space-y-2">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-secondary">
                      <span className="mt-0.5 text-brand">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-6">
                <h2 className="text-lg font-bold text-ink mb-3">Areas to Improve</h2>
                <ul className="space-y-2">
                  {analysis.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-secondary">
                      <span className="mt-0.5 text-coral">!</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Transcript */}
            {transcript && (
              <Card className="p-6">
                <h2 className="text-lg font-bold text-ink mb-3">Transcript</h2>
                <div className="bg-surface-tinted rounded-xl p-4 max-h-80 overflow-y-auto">
                  <pre className="text-sm text-ink-secondary whitespace-pre-wrap font-sans">
                    {transcript.raw_text}
                  </pre>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recurring Weaknesses */}
            {analysis.recurring_weaknesses.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-bold text-ink mb-3">Recurring Issues</h2>
                <div className="space-y-3">
                  {analysis.recurring_weaknesses.map((rw, i) => (
                    <div key={i} className="p-3 rounded-xl bg-coral/5 border border-coral/10">
                      <p className="text-sm font-bold text-ink">{rw.topic}</p>
                      <p className="text-xs text-ink-muted mt-1">
                        Detected in {rw.lesson_count} lesson{rw.lesson_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recommended Practice */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-ink mb-3">Recommended Practice</h2>
              <ul className="space-y-2">
                {analysis.recommended_practice.map((p, i) => (
                  <li key={i} className="text-sm text-ink-secondary flex items-start gap-2">
                    <span className="mt-0.5 text-brand">→</span>
                    {p}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Next Lesson */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-ink mb-3">Next Lesson Plan</h2>
              <p className="text-sm text-ink-secondary leading-relaxed">
                {analysis.next_lesson_recommendation}
              </p>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
