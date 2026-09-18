import DashboardLayout from '@/components/layout/DashboardLayout';
import EmptyState from '@/components/ui/EmptyState';

export default function LessonsPage() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink">Lessons</h1>
        <p className="text-ink-secondary mt-1">View all your lesson recordings and analyses.</p>
      </div>

      <div className="bg-white rounded-3xl border border-surface-border shadow-soft">
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
          }
          title="No lessons yet"
          description="Start your first lesson recording to begin building student profiles and generating homework."
        />
      </div>
    </DashboardLayout>
  );
}
