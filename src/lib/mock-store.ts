import type { Student, Lesson, Homework } from '@/lib/types';

const STORAGE_KEY = 'tutorai_mock';

export const FREE_LESSON_LIMIT = 1;

export interface Subscription {
  plan: 'starter' | 'pro' | 'power' | null;
  lessons_used: number;
  lessons_total: number;
  expires_at: string | null;
  yookassa_payment_id: string | null;
  free_lesson_spent?: boolean;
  /** Период оплаты подписки: месяц или год */
  period?: 'month' | 'year' | null;
  /** Когда обновится лимит уроков (у годовой подписки — каждый месяц) */
  lessons_reset_at?: string | null;
}

export interface Plan {
  id: 'starter' | 'pro' | 'power';
  name: string;
  price: number;
  priceFormatted: string;
  yearlyPrice: number;
  yearlyPriceFormatted: string;
  lessons: number;
  features: string[];
  popular?: boolean;
}

export const SUBSCRIPTION_PERIOD_DAYS = 30;
export const YEARLY_PERIOD_DAYS = 365;
export const YEARLY_DISCOUNT = 0.35;
/** Маркетинговая метка вкладки (фактическая скидка 35%) */
export const YEARLY_BADGE = '-30%';

export function formatRub(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

export function yearlyPriceOf(plan: Plan): number {
  return Math.round(plan.price * 12 * (1 - YEARLY_DISCOUNT));
}

function makePlan(p: Omit<Plan, 'yearlyPrice' | 'yearlyPriceFormatted'>): Plan {
  const yearlyPrice = yearlyPriceOf(p as Plan);
  return { ...p, yearlyPrice, yearlyPriceFormatted: formatRub(yearlyPrice) };
}

export const plans: Plan[] = [
  makePlan({ id: 'starter', name: 'Starter', price: 890, priceFormatted: '890 ₽', lessons: 4, features: ['4 урока в месяц', 'Все функции сервиса', 'Ученики и прогресс', 'AI-анализ урока', 'Домашние задания'] }),
  makePlan({ id: 'pro', name: 'Pro', price: 1490, priceFormatted: '1 490 ₽', lessons: 12, features: ['12 уроков в месяц', 'Все функции сервиса', 'AI-память учеников', 'Персональные ДЗ', 'Приоритетная поддержка'], popular: true }),
  makePlan({ id: 'power', name: 'Power', price: 2490, priceFormatted: '2 490 ₽', lessons: 30, features: ['30 уроков в месяц', 'Все функции сервиса', 'AI-память учеников', 'Персональные ДЗ', 'Приоритетная поддержка', 'API доступ'] }),
];

export function planById(id: Subscription['plan']): Plan | null {
  return plans.find((p) => p.id === id) || null;
}

export function isSubscriptionExpired(sub: Subscription | null): boolean {
  if (!sub?.plan || !sub.expires_at) return false;
  return new Date(sub.expires_at).getTime() <= Date.now();
}

export function subscriptionDaysLeft(sub: Subscription | null): number {
  if (!sub?.plan || !sub.expires_at) return 0;
  const ms = new Date(sub.expires_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export function subscriptionPeriodLabel(sub: Subscription | null): string {
  return sub?.period === 'year' ? 'Год' : 'Месяц';
}

export function lessonLimit(sub: Subscription | null): number {
  if (!sub?.plan) return FREE_LESSON_LIMIT;
  return planById(sub.plan)?.lessons ?? FREE_LESSON_LIMIT;
}

export function lessonsLeft(sub: Subscription | null): number {
  if (!sub) return FREE_LESSON_LIMIT;
  if (!sub.plan) {
    // Бесплатный лимит выдаётся один раз и не возвращается
    return sub.free_lesson_spent ? 0 : FREE_LESSON_LIMIT;
  }
  if (isSubscriptionExpired(sub)) return 0;
  return Math.max(0, lessonLimit(sub) - (sub.lessons_used || 0));
}

export function lessonsUsageLabel(sub: Subscription | null): string {
  return `${sub?.lessons_used || 0} / ${lessonLimit(sub)}`;
}

interface MockDB {
  user: { id: string; email: string; name: string } | null;
  subscription: Subscription;
  students: Student[];
  lessons: Lesson[];
  homeworks: Homework[];
}

const defaultSubscription: Subscription = {
  plan: null,
  lessons_used: 0,
  lessons_total: FREE_LESSON_LIMIT,
  expires_at: null,
  yookassa_payment_id: null,
  free_lesson_spent: false,
  period: null,
  lessons_reset_at: null,
};

function migrateSubscription(sub: any): Subscription {
  if (!sub) return { ...defaultSubscription };
  // Старый формат (AI-минуты) → уроки
  if (sub.lessons_used === undefined || sub.lessons_total === undefined) {
    const plan = plans.find((p) => p.id === sub.plan) || null;
    sub = {
      plan: sub.plan ?? null,
      lessons_used: sub.lessons_used || 0,
      lessons_total: plan ? plan.lessons : FREE_LESSON_LIMIT,
      expires_at: sub.expires_at ?? null,
      yookassa_payment_id: sub.yookassa_payment_id ?? null,
      free_lesson_spent: false,
    };
  }

  if (sub.free_lesson_spent === undefined) {
    sub.free_lesson_spent = !sub.plan && (sub.lessons_used || 0) >= FREE_LESSON_LIMIT;
  }

  if (!sub.plan && (!sub.lessons_total || sub.lessons_total < FREE_LESSON_LIMIT)) {
    sub.lessons_total = FREE_LESSON_LIMIT;
  }

  // Подписка действует месяц: после expires_at возвращаемся на бесплатный тариф
  if (sub.plan && sub.expires_at && new Date(sub.expires_at).getTime() <= Date.now()) {
    sub.plan = null;
    sub.lessons_used = 0;
    sub.lessons_total = FREE_LESSON_LIMIT;
    sub.expires_at = null;
    sub.lessons_reset_at = null;
    sub.period = null;
  }

  const activePlan = plans.find((p) => p.id === sub.plan);
  if (activePlan && sub.lessons_total !== activePlan.lessons) {
    sub.lessons_total = activePlan.lessons;
  }

  if (sub.plan) {
    if (sub.period !== 'year' && sub.period !== 'month') sub.period = 'month';
    if (!sub.lessons_reset_at) sub.lessons_reset_at = sub.expires_at;
    // Годовая подписка: лимит уроков обновляется каждый месяц
    if (sub.lessons_reset_at && new Date(sub.lessons_reset_at).getTime() <= Date.now()) {
      sub.lessons_used = 0;
      let reset = new Date(sub.lessons_reset_at).getTime();
      while (reset <= Date.now()) reset += SUBSCRIPTION_PERIOD_DAYS * 86400000;
      sub.lessons_reset_at = new Date(reset).toISOString();
    }
  } else {
    sub.period = null;
    sub.lessons_reset_at = null;
  }

  return sub;
}

function getDB(): MockDB {
  if (typeof window === 'undefined') return { user: null, subscription: defaultSubscription, students: [], lessons: [], homeworks: [] };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const db = JSON.parse(raw);
    const before = JSON.stringify(db.subscription);
    db.subscription = migrateSubscription(db.subscription);
    if (JSON.stringify(db.subscription) !== before) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    }
    return db;
  }
  const db: MockDB = {
    user: null,
    subscription: { ...defaultSubscription },
    students: [],
    lessons: [],
    homeworks: [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return db;
}

function saveDB(db: MockDB) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export const mockStore = {
  auth: {
    getUser: () => {
      // Check for Yandex OAuth user in cookie
      if (typeof window !== 'undefined') {
        const yandexCookie = document.cookie.split('; ').find(c => c.startsWith('yandex_user='));
        if (yandexCookie) {
          try {
            const yandexUser = JSON.parse(decodeURIComponent(yandexCookie.split('=')[1]));
            const db = getDB();
            if (!db.user || db.user.id !== yandexUser.id) {
              db.user = { id: yandexUser.id, email: yandexUser.email || '', name: yandexUser.name || 'Yandex User' };
              saveDB(db);
            }
          } catch {}
        }
      }
      const db = getDB();
      return { data: { user: db.user }, error: null };
    },
    signUp: async (email: string, _password: string, name: string) => {
      const db = getDB();
      db.user = { id: 'mock-user-1', email, name: name || 'Demo Tutor' };
      saveDB(db);
      return { data: { user: db.user, session: { access_token: 'mock' } }, error: null };
    },
    signIn: async (email: string, _password: string) => {
      const db = getDB();
      db.user = { id: 'mock-user-1', email, name: db.user?.name || 'Tutor' };
      saveDB(db);
      return { data: { user: db.user, session: { access_token: 'mock' } }, error: null };
    },
    signOut: async () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      return { error: null };
    },
  },

  subscription: {
    get: () => {
      const db = getDB();
      return { data: db.subscription, error: null };
    },
    activate: (planId: 'starter' | 'pro' | 'power', paymentId: string, period: 'month' | 'year' = 'month') => {
      const db = getDB();
      const plan = plans.find((p) => p.id === planId)!;
      const current = db.subscription;
      const now = Date.now();
      const durationDays = period === 'year' ? YEARLY_PERIOD_DAYS : SUBSCRIPTION_PERIOD_DAYS;

      // Продление того же активного тарифа с тем же периодом — сдвигаем дату окончания, лимит обнуляется
      const sameActivePlan =
        current.plan === planId &&
        (current.period || 'month') === period &&
        !!current.expires_at &&
        new Date(current.expires_at).getTime() > now;
      const base = sameActivePlan ? Math.max(now, new Date(current.expires_at!).getTime()) : now;

      db.subscription = {
        plan: planId,
        lessons_used: 0,
        lessons_total: plan.lessons,
        expires_at: new Date(base + durationDays * 86400000).toISOString(),
        // Лимит уроков обновляется ежемесячно (у годовой подписки — каждый месяц действия)
        lessons_reset_at: new Date(now + SUBSCRIPTION_PERIOD_DAYS * 86400000).toISOString(),
        yookassa_payment_id: paymentId,
        free_lesson_spent: current.free_lesson_spent ?? false,
        period,
      };
      saveDB(db);
      return { data: db.subscription, error: null };
    },
    useLesson: () => {
      const db = getDB();
      db.subscription.lessons_used = (db.subscription.lessons_used || 0) + 1;
      // Бесплатный урок выдаётся только один раз за всё время
      if (!db.subscription.plan) db.subscription.free_lesson_spent = true;
      saveDB(db);
      return { data: db.subscription, error: null };
    },
    cancel: () => {
      const db = getDB();
      db.subscription = {
        ...defaultSubscription,
        free_lesson_spent: db.subscription.free_lesson_spent ?? false,
      };
      saveDB(db);
      return { data: db.subscription, error: null };
    },
  },

  students: {
    getAll: () => {
      const db = getDB();
      return { data: db.students, error: null };
    },
    getById: (id: string) => {
      const db = getDB();
      return { data: db.students.find((s) => s.id === id) || null, error: null };
    },
    insert: (student: Omit<Student, 'id' | 'created_at'>) => {
      const db = getDB();
      const newStudent: Student = {
        ...student,
        is_archived: (student as any).is_archived ?? false,
        id: `s${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      db.students.push(newStudent);
      saveDB(db);
      return { data: newStudent, error: null };
    },
    update: (id: string, updates: Partial<Student>) => {
      const db = getDB();
      const idx = db.students.findIndex((s) => s.id === id);
      if (idx === -1) return { data: null, error: { message: 'Not found' } };
      db.students[idx] = { ...db.students[idx], ...updates };
      saveDB(db);
      return { data: db.students[idx], error: null };
    },
    delete: (id: string) => {
      const db = getDB();
      db.students = db.students.filter((s) => s.id !== id);
      saveDB(db);
      return { error: null };
    },
  },

  lessons: {
    getAll: () => {
      const db = getDB();
      return { data: db.lessons.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), error: null };
    },
    getById: (id: string) => {
      const db = getDB();
      return { data: db.lessons.find((l) => l.id === id) || null, error: null };
    },
    insert: (lesson: Omit<Lesson, 'id' | 'created_at'>) => {
      const db = getDB();
      const newLesson: Lesson = {
        ...lesson,
        id: `l${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      db.lessons.push(newLesson);
      saveDB(db);
      return { data: newLesson, error: null };
    },
    update: (id: string, updates: Partial<Lesson>) => {
      const db = getDB();
      const idx = db.lessons.findIndex((l) => l.id === id);
      if (idx === -1) return { data: null, error: { message: 'Not found' } };
      db.lessons[idx] = { ...db.lessons[idx], ...updates };
      saveDB(db);
      return { data: db.lessons[idx], error: null };
    },
  },

  homeworks: {
    getAll: () => {
      const db = getDB();
      return { data: db.homeworks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), error: null };
    },
    getById: (id: string) => {
      const db = getDB();
      return { data: db.homeworks.find((h) => h.id === id) || null, error: null };
    },
    insert: (homework: Omit<Homework, 'id' | 'created_at'>) => {
      const db = getDB();
      const newHW: Homework = {
        ...homework,
        id: `hw${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      db.homeworks.push(newHW);
      saveDB(db);
      return { data: newHW, error: null };
    },
    update: (id: string, updates: Partial<Homework>) => {
      const db = getDB();
      const idx = db.homeworks.findIndex((h) => h.id === id);
      if (idx === -1) return { data: null, error: { message: 'Not found' } };
      db.homeworks[idx] = { ...db.homeworks[idx], ...updates };
      saveDB(db);
      return { data: db.homeworks[idx], error: null };
    },
  },
};
