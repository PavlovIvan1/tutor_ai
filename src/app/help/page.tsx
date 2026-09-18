'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import { useState } from 'react';

const faqs = [
  { q: 'How does AI lesson analysis work?', a: 'After recording a lesson, our AI transcribes the audio and generates a detailed analysis: student mistakes, areas for improvement, and personalized homework. The entire process takes about 2 minutes.' },
  { q: 'Is my audio data secure?', a: 'Yes. Audio recordings are processed locally or encrypted in transit. We never share your data with third parties. You can delete recordings at any time.' },
  { q: 'Can I use TutorAI without an OpenAI API key?', a: 'Yes! The app works in mock mode with sample data. To use real AI analysis, configure your OpenAI API key in Settings.' },
  { q: 'What languages are supported?', a: 'Currently English, Russian, and Ukrainian. More languages coming soon.' },
  { q: 'How do AI minutes work?', a: 'AI minutes are the total audio processing time included in your plan. For example, a 60-minute lesson uses 60 AI minutes. You can buy additional minutes if needed.' },
  { q: 'Can I export student data?', a: 'Yes. Go to a student\'s profile and click Export to download their progress and lesson history as PDF.' },
];

export default function HelpPage() {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-ink">Help</h1>
          <p className="text-ink-secondary mt-1">Frequently asked questions and support.</p>
        </div>

        <div className="space-y-3 mb-10">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-surface-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenId(openId === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-tinted transition-colors"
              >
                <span className="text-sm font-bold text-ink">{faq.q}</span>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-ink-muted flex-shrink-0 ml-3 transition-transform ${openId === i ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {openId === i && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-ink-secondary leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-ink mb-2">Still need help?</h2>
          <p className="text-sm text-ink-secondary mb-4">Contact us and we&apos;ll get back to you within 24 hours.</p>
          <a
            href="mailto:support@tutorai.app"
            className="inline-flex items-center gap-2 px-5 py-3 bg-brand text-white font-bold rounded-2xl shadow-[0_4px_0_0_var(--brand-shadow)] hover:bg-brand-dark transition-all active:translate-y-[2px] active:shadow-none text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            support@tutorai.app
          </a>
        </Card>
      </div>
    </DashboardLayout>
  );
}
