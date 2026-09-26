import { NextRequest, NextResponse } from 'next/server';
import { getDb, q } from '@/lib/db';

const TELEGRAM_TOKEN = '8600660369:AAGxSiJFfTjxhdpp0pLxgL80XeFYOXE5_TM';

let cachedChatId: string | null = null;

async function sendToTelegram(name: string, email: string, telegram: string) {
  const message = [
    '🎓 Новая заявка в waitlist TutorAI!',
    '',
    `Имя: ${name}`,
    `Email: ${email}`,
    `Telegram: ${telegram}`,
    `Дата: ${new Date().toLocaleString('ru-RU')}`,
  ].join('\n');

  // Auto-discover chat id from user's /start if not cached
  if (!cachedChatId) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates`);
      const data = await res.json();
      const chat = data?.result?.find((u: any) => u.message?.chat)?.message?.chat;
      if (chat?.id) cachedChatId = String(chat.id);
    } catch {}
  }

  if (!cachedChatId) return;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: cachedChatId, text: message }),
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, telegram } = await req.json();

    if (!name || !email || !telegram) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
    }

    try {
      const sql = getDb();
      await q(sql, sql`INSERT INTO waitlist (name, email, telegram) VALUES (${name}, ${email}, ${telegram})`);
    } catch {}

    await sendToTelegram(name, email, telegram);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
