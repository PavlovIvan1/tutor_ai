import DashboardLayout from '@/components/layout/DashboardLayout';
import EmptyState from '@/components/ui/EmptyState';

export default function HomeworkPage() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink">Homework</h1>
        <p className="text-ink-secondary mt-1">Manage and track student homework assignments.</p>
      </div>

      <div className="bg-white rounded-3xl border border-surface-border shadow-soft">
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
          title="No homework yet"
          description="Homework is generated automatically after lesson analysis. Complete a lesson to create your first homework assignment."
        />
      </div>
    </DashboardLayout>
  );
}
