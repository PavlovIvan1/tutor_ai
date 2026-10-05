import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { getDb, isDbConfigured, q } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sql = getDb();
  const homeworkId = params.id;

  try {
    const homeworkRows = await q(sql, sql`SELECT h.*, s.name as student_name, s.level as student_level FROM homeworks h LEFT JOIN students s ON h.student_id = s.id WHERE h.id = ${homeworkId}`);
    if (!homeworkRows.length) return NextResponse.json({ error: 'Homework not found' }, { status: 404 });

    const homework = homeworkRows[0];
    const questionRows = await q(sql, sql`SELECT * FROM homework_questions WHERE homework_id = ${homeworkId} ORDER BY sort_order ASC`);

    const docSections = [];

    docSections.push(new Paragraph({
      children: [new TextRun({ text: homework.title || 'Homework', bold: true, size: 32, font: 'Arial' })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }));

    docSections.push(new Paragraph({
      children: [new TextRun({ text: `Student: ${homework.student_name || 'Unknown'}`, size: 22, font: 'Arial' })],
      spacing: { after: 100 },
    }));

    docSections.push(new Paragraph({
      children: [new TextRun({ text: `Level: ${homework.student_level || 'N/A'}`, size: 22, font: 'Arial' })],
      spacing: { after: 100 },
    }));

    docSections.push(new Paragraph({
      children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 22, font: 'Arial' })],
      spacing: { after: 400 },
    }));

    docSections.push(new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
      spacing: { after: 300 },
    }));

    const theory = typeof homework.theory === 'string' ? JSON.parse(homework.theory || 'null') : homework.theory;
    if (theory && (theory.explanation || theory.topic)) {
      docSections.push(new Paragraph({
        children: [new TextRun({ text: 'Theory', bold: true, size: 28, font: 'Arial' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 150 },
      }));
      if (theory.topic) {
        docSections.push(new Paragraph({
          children: [new TextRun({ text: theory.topic, bold: true, size: 24, font: 'Arial' })],
          spacing: { after: 100 },
        }));
      }
      if (theory.explanation) {
        docSections.push(new Paragraph({
          children: [new TextRun({ text: theory.explanation, size: 22, font: 'Arial' })],
          spacing: { after: 150 },
        }));
      }
      (theory.examples || []).forEach((ex: string) => {
        docSections.push(new Paragraph({
          children: [new TextRun({ text: `- ${ex}`, size: 22, font: 'Arial' })],
          spacing: { after: 60 },
        }));
      });
      docSections.push(new Paragraph({
        children: [new TextRun({ text: '', size: 22, font: 'Arial' })],
        spacing: { after: 200 },
      }));
    }

    for (let i = 0; i < questionRows.length; i++) {
      const qQ = questionRows[i];
      const firstLine = String(qQ.question_text || '').split('\n')[0];
      const alreadyNumbered = /^\s*\d{1,2}\s*[.)]/.test(firstLine);
      const body = alreadyNumbered ? String(qQ.question_text || '') : `${i + 1}. ${qQ.question_text}`;
      let questionLines: string[];

      if (qQ.type === 'multiple_choice') {
        const options = typeof qQ.options === 'string' ? JSON.parse(qQ.options) : qQ.options || [];
        questionLines = [body];
        options.forEach((opt: string, idx: number) => {
          questionLines.push(`    ${String.fromCharCode(65 + idx)}) ${opt}`);
        });
      } else {
        questionLines = [body];
      }

      const runs: TextRun[] = [];
      questionLines.forEach((line) => {
        const parts = line.split('\n');
        parts.forEach((part, pi) => {
          runs.push(new TextRun({ text: part, size: 22, font: 'Arial', ...(pi > 0 || runs.length ? { break: 1 } : {}) }));
        });
      });

      docSections.push(new Paragraph({
        children: runs,
        spacing: { after: 300 },
      }));
    }

    const doc = new Document({ sections: [{ children: docSections }] });
    const buffer = await Packer.toBuffer(doc);
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="homework_${homework.student_name?.replace(/\s+/g, '_') || 'assignment'}.docx"`,
      },
    });
  } catch (error: any) {
    console.error('Export homework error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
