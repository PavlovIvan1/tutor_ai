import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { getDb, isDbConfigured, q } from '@/lib/db';

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

    for (let i = 0; i < questionRows.length; i++) {
      const qQ = questionRows[i];
      let questionText = '';

      if (qQ.type === 'multiple_choice') {
        const options = typeof qQ.options === 'string' ? JSON.parse(qQ.options) : qQ.options || [];
        questionText = `${i + 1}. ${qQ.question_text}\n`;
        options.forEach((opt: string, idx: number) => {
          questionText += `    ${String.fromCharCode(65 + idx)}) ${opt}\n`;
        });
      } else {
        questionText = `${i + 1}. ${qQ.question_text}`;
      }

      docSections.push(new Paragraph({
        children: [new TextRun({ text: questionText, size: 22, font: 'Arial' })],
        spacing: { after: 300 },
      }));
    }

    docSections.push(new Paragraph({
      children: [new TextRun({ text: '', size: 22, font: 'Arial' })],
      spacing: { after: 200 },
    }));

    docSections.push(new Paragraph({
      children: [new TextRun({ text: 'Answer Key', bold: true, size: 28, font: 'Arial' })],
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 },
    }));

    docSections.push(new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
      spacing: { after: 200 },
    }));

    for (let i = 0; i < questionRows.length; i++) {
      const qQ = questionRows[i];
      docSections.push(new Paragraph({
        children: [new TextRun({ text: `${i + 1}. ${qQ.correct_answer}`, size: 22, font: 'Arial', bold: true })],
        spacing: { after: 100 },
      }));
      if (qQ.explanation) {
        docSections.push(new Paragraph({
          children: [new TextRun({ text: `    ${qQ.explanation}`, size: 20, font: 'Arial', italics: true, color: '666666' })],
          spacing: { after: 200 },
        }));
      }
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
