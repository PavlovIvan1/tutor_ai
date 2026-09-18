import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TutorAI - AI Assistant for English Tutors',
  description: 'Teach the lesson. We handle the follow-up.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
