const ANSWER_SECTION = /^(model answer|sample answer|answer key|key|answers?)\s*[:\-]/i;
const LEADING_BLOCK_NUM = /^\s*\d{1,2}\s*[.)]\s+/;

/**
 * Правит вопрос, пришедший от ИИ, перед сохранением в БД:
 * - убирает блок с ответом ("Model answer: ...") из текста — студент не должен его видеть,
 *   содержимое переносится в correct_answer, если там заглушка;
 * - убирает нумерацию блока (номер добавляется при экспорте и рендере).
 */
export function scrubHomeworkQuestion(text: unknown, correctAnswer: unknown): {
  text: string;
  correctAnswer: string;
} {
  let out = typeof text === 'string' ? text.trim() : '';
  let answer = typeof correctAnswer === 'string' ? correctAnswer.trim() : '';

  const lines = out.split('\n');
  const idx = lines.findIndex((l) => ANSWER_SECTION.test(l.trim()));
  if (idx > 0) {
    const cut = lines
      .slice(idx)
      .join('\n')
      .trim()
      .replace(ANSWER_SECTION, '')
      .trim();
    out = lines.slice(0, idx).join('\n').replace(/\s+$/, '');
    if (cut && (!answer || /provided above|see above|in the (question|task)|model answer provided/i.test(answer))) {
      answer = cut;
    }
  }

  out = out.replace(LEADING_BLOCK_NUM, '');
  return { text: out, correctAnswer: answer };
}

/**
 * Чинит массив вариантов multiple_choice:
 * если ИИ уже расписал A. ... D. ... внутри текста вопроса и в options положил лишь буквы,
 * вернём [] — иначе в docx продублируются строки вида "A) A".
 */
export function normalizeHomeworkOptions(raw: unknown, text: unknown): string[] {
  const arr = Array.isArray(raw) ? raw.filter((o): o is string => typeof o === 'string') : [];
  if (!arr.length) return [];

  const lettersOnly = arr.every((o) => /^[A-Ha-h][.)]?$/.test(o.trim()));
  const spelledInText = /(^|\n)\s*[A-Ha-h][.)]\s+\S/.test(typeof text === 'string' ? text : '');

  if (lettersOnly && spelledInText) return [];
  return arr;
}
