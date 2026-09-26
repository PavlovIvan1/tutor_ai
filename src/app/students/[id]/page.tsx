'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import SkillBars from '@/components/ui/SkillBars';
import { getAvatarUrl, getLevelColor, formatDurationLong } from '@/lib/utils';

export default function StudentProfilePage() {
  const params = useParams();
  const [student, setStudent] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/students/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setStudent(data.student);
          setLessons(data.lessons || []);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [params.id]);

  const lastLesson = lessons[0] || null;
  const totalMinutes = lessons.reduce((sum: number, l: any) => sum + (l.duration_seconds || 0), 0) / 60;

  if (loading) return <DashboardLayout><div className="text-center py-12 text-ink-secondary">Loading...</div></DashboardLayout>;
  if (!student) return <DashboardLayout><div className="text-center py-12 text-ink-secondary">Student not found</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <img src={getAvatarUrl(student.name)} alt="" className="w-16 h-16 rounded-2xl bg-surface-tinted" />
            <div>
              <h1 className="text-2xl font-bold text-ink">{student.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-sm px-3 py-1 rounded-full font-bold ${getLevelColor(student.level)}`}>{student.level}</span>
                <span className="text-sm text-ink-secondary">{student.goals || 'General English'}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-2xl bg-surface-secondary">
              <p className="text-2xl font-bold text-ink">{lessons.length}</p>
              <p className="text-xs text-ink-secondary">Lessons</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-surface-secondary">
              <p className="text-2xl font-bold text-ink">{Math.round(totalMinutes)}</p>
              <p className="text-xs text-ink-secondary">Minutes</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-surface-secondary">
              <p className="text-2xl font-bold text-ink">{lessons.filter((l: any) => l.homework_id).length}</p>
              <p className="text-xs text-ink-secondary">Homework</p>
            </div>
          </div>

          {/* Skill Bars */}
          <h3 className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">Skills Assessment</h3>
          <SkillBars level={student.level} analysis={lastLesson} />
        </Card>

        {/* Recent Lessons */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-ink mb-4">Lessons</h2>
          {lessons.length === 0 ? (
            <p className="text-sm text-ink-secondary">No lessons yet</p>
          ) : (
            <div className="space-y-2">
              {lessons.map((l: any) => (
                <Link key={l.id} href={`/lessons/${l.id}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-secondary transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-surface-tinted flex items-center justify-center text-sm">
                    {l.status === 'completed' ? '✅' : '⏳'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">{new Date(l.created_at).toLocaleDateString()}</p>
                    <p className="text-xs text-ink-secondary truncate">{l.summary || l.status}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-ink-secondary">{l.duration_seconds ? formatDurationLong(l.duration_seconds) : '—'}</span>
                    {l.engagement_score && <p className="text-xs text-brand font-bold">{l.engagement_score}%</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
