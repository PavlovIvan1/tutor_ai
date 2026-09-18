'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import type { Homework, HomeworkQuestion } from '@/lib/types';

export default function PublicHomeworkPage() {
  const params = useParams();
  const [homework, setHomework] = useState<Homework | null>(null);
  const [questions, setQuestions] = useState<HomeworkQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: hw } = await supabase
        .from('homeworks')
        .select('*, student:students(name, level)')
        .eq('id', params.id)
        .single();

      if (hw) {
        setHomework(hw);

        const { data: qs } = await supabase
          .from('homework_questions')
          .select('*')
          .eq('homework_id', params.id)
          .order('sort_order');

        setQuestions(qs || []);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  const handleSubmit = async () => {
    if (!homework) return;
    setSubmitting(true);

    let correctCount = 0;
    const answerData = questions.map((q) => {
      const userAnswer = answers[q.id] || '';
      const isCorrect = userAnswer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
      if (isCorrect) correctCount++;
      return {
        question_id: q.id,
        answer: userAnswer,
        is_correct: isCorrect,
      };
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);

    // Save attempt
    await supabase.from('homework_attempts').insert({
      homework_id: homework.id,
      student_id: homework.student_id,
      answers: answerData,
      score: finalScore,
    });

    // Update homework status
    await supabase
      .from('homeworks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        score: finalScore,
      })
      .eq('id', homework.id);

    setScore(finalScore);
    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!homework) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black text-ink mb-2">Homework not found</h1>
          <p className="text-ink-secondary">This homework link may have expired.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-lg text-center">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-brand-light flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-ink mb-2">Homework Complete!</h1>
          <p className="text-ink-secondary mb-6">Great job completing your homework.</p>
          <div className="bg-white rounded-3xl border border-surface-border shadow-card p-8">
            <p className="text-sm text-ink-muted mb-1">Your Score</p>
            <p className="text-5xl font-black text-brand">{score}%</p>
            <p className="text-sm text-ink-secondary mt-2">
              {score! >= 80 ? 'Excellent work!' : score! >= 60 ? 'Good job! Keep practicing.' : 'Keep practicing, you\'ll get there!'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-ink">{homework.title || 'Homework'}</h1>
          <p className="text-ink-secondary mt-1">
            {homework.student?.name} · {questions.length} questions
          </p>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.id} className="bg-white rounded-3xl border border-surface-border shadow-card p-6">
              <p className="text-xs font-bold text-ink-muted uppercase mb-2">Question {i + 1}</p>
              <p className="text-ink font-semibold mb-4">{q.question_text}</p>

              {q.type === 'multiple_choice' && q.options && (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                      className={`w-full p-3 rounded-xl border-2 text-left text-sm font-semibold transition-all ${
                        answers[q.id] === opt
                          ? 'border-brand bg-brand-light text-brand-dark'
                          : 'border-surface-border hover:border-brand/30 text-ink'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {(q.type === 'fill_blank' || q.type === 'short_answer') && (
                <input
                  type="text"
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder={q.type === 'fill_blank' ? 'Type your answer...' : 'Write your answer...'}
                  className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface text-ink font-semibold placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all text-sm"
                />
              )}
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="mt-8 text-center">
          <Button
            onClick={handleSubmit}
            loading={submitting}
            size="lg"
            disabled={Object.keys(answers).length < questions.length}
          >
            Submit Homework
          </Button>
        </div>
      </div>
    </div>
  );
}
