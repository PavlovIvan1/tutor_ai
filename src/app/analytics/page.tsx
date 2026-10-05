'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import SkillBars from '@/components/ui/SkillBars';
import { getAvatarUrl, formatDuration } from '@/lib/utils';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const d = await res.json();
          setData(d);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <DashboardLayout><div className="text-center py-12 text-ink-secondary">Loading...</div></DashboardLayout>;

  if (!data) return <DashboardLayout><div className="text-center py-12 text-ink-secondary">No data</div></DashboardLayout>;

  const { students, stats, recentLessons } = data;

  // Calculate weekly data from lessons
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyData = dayNames.map((day, i) => {
    const dayLessons = (recentLessons || []).filter((l: any) => {
      const d = new Date(l.created_at);
      return d.getDay() === i;
    });
    return { day, lessons: dayLessons.length, minutes: dayLessons.reduce((s: number, l: any) => s + (l.duration_seconds || 0), 0) / 60 };
  });
  const maxLessons = Math.max(...weeklyData.map(d => d.lessons), 1);

  // Monthly stats
  const thisMonth = (recentLessons || []).filter((l: any) => {
    const d = new Date(l.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalMinutes = thisMonth.reduce((s: number, l: any) => s + (l.duration_seconds || 0), 0);
  const avgDuration = thisMonth.length > 0 ? Math.round(totalMinutes / thisMonth.length) : 0;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink">Analytics</h1>
        <p className="text-ink-secondary mt-1">Insights about your teaching.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Lessons This Month</p>
          <p className="text-3xl font-black text-ink mt-2">{thisMonth.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Total Teaching Hours</p>
          <p className="text-3xl font-black text-ink mt-2">{Math.round(totalMinutes / 60)}h</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Avg Lesson Duration</p>
          <p className="text-3xl font-black text-ink mt-2">{avgDuration}m</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Active Students</p>
          <p className="text-3xl font-black text-ink mt-2">{stats.totalStudents}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly chart */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-ink mb-6">Lessons This Week</h2>
          <div className="flex items-end gap-3 h-48">
            {weeklyData.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-ink-secondary">{d.lessons}</span>
                <div className="w-full rounded-xl bg-surface-tinted overflow-hidden" style={{ height: '100%' }}>
                  <div
                    className="w-full rounded-xl bg-brand transition-all duration-500"
                    style={{ height: `${d.lessons ? (d.lessons / maxLessons) * 100 : 0}%`, marginTop: 'auto' }}
                  />
                </div>
                <span className="text-xs font-bold text-ink-muted">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Student progress */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-ink mb-6">Student Skills</h2>
          <div className="space-y-6">
            {students.map((s: any) => (
              <div key={s.id}>
                <div className="flex items-center gap-3 mb-2">
                  <img src={getAvatarUrl(s.name)} alt="" className="w-8 h-8 rounded-lg bg-surface-tinted" />
                  <div>
                    <p className="text-sm font-bold text-ink">{s.name}</p>
                    <p className="text-xs text-ink-secondary">{s.level} · {s.lessonCount} lessons</p>
                  </div>
                </div>
                <SkillBars lessons={s.analyses || (s.lastLesson ? [s.lastLesson] : [])} compact />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
