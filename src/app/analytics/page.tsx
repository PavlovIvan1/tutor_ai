'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import { getAvatarUrl } from '@/lib/utils';

const weeklyData = [
  { day: 'Mon', lessons: 3, minutes: 180 },
  { day: 'Tue', lessons: 2, minutes: 120 },
  { day: 'Wed', lessons: 4, minutes: 240 },
  { day: 'Thu', lessons: 1, minutes: 60 },
  { day: 'Fri', lessons: 3, minutes: 180 },
  { day: 'Sat', lessons: 5, minutes: 300 },
  { day: 'Sun', lessons: 0, minutes: 0 },
];

const studentProgress = [
  { name: 'Мария К.', level: 'B2', progress: 87, trend: '+5%' },
  { name: 'Даниил П.', level: 'B1', progress: 64, trend: '+12%' },
  { name: 'Эмма С.', level: 'A2', progress: 72, trend: '+8%' },
  { name: 'Тимур Ш.', level: 'A1', progress: 45, trend: '+3%' },
];

const maxLessons = Math.max(...weeklyData.map((d) => d.lessons));

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink">Analytics</h1>
        <p className="text-ink-secondary mt-1">Insights about your teaching.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Lessons This Month</p>
          <p className="text-3xl font-black text-ink mt-2">18</p>
          <p className="text-xs text-brand font-bold mt-1">+23% vs last month</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Total Teaching Hours</p>
          <p className="text-3xl font-black text-ink mt-2">18h</p>
          <p className="text-xs text-brand font-bold mt-1">+15% vs last month</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Avg Lesson Duration</p>
          <p className="text-3xl font-black text-ink mt-2">60m</p>
          <p className="text-xs text-ink-muted mt-1">Stable</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Student Retention</p>
          <p className="text-3xl font-black text-ink mt-2">100%</p>
          <p className="text-xs text-brand font-bold mt-1">All students active</p>
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
          <h2 className="text-lg font-bold text-ink mb-6">Student Progress</h2>
          <div className="space-y-4">
            {studentProgress.map((s) => (
              <div key={s.name} className="flex items-center gap-4">
                <img src={getAvatarUrl(s.name)} alt="" className="w-10 h-10 rounded-full bg-surface-tinted" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-ink">{s.name}</p>
                    <span className="text-xs font-bold text-brand">{s.trend}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-surface-tinted overflow-hidden">
                      <div className="h-full rounded-full bg-brand animate-progress" style={{ width: `${s.progress}%` }} />
                    </div>
                    <span className="text-xs font-bold text-ink-muted">{s.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI Usage chart */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-ink mb-2">AI Minutes Usage</h2>
        <p className="text-sm text-ink-muted mb-6">Last 6 months</p>
        <div className="flex items-end gap-4 h-32">
          {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'].map((m, i) => {
            const vals = [420, 680, 890, 1100, 980, 1240];
            const maxVal = Math.max(...vals);
            return (
              <div key={m} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-ink-secondary">{vals[i]}</span>
                <div className="w-full rounded-xl bg-surface-tinted overflow-hidden" style={{ height: '100%' }}>
                  <div
                    className="w-full rounded-xl bg-honey transition-all duration-500"
                    style={{ height: `${(vals[i] / maxVal) * 100}%`, marginTop: 'auto' }}
                  />
                </div>
                <span className="text-xs font-bold text-ink-muted">{m}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </DashboardLayout>
  );
}
