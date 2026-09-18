import type { Student, Lesson, Homework } from '@/lib/types';

const STORAGE_KEY = 'tutorai_mock';

export interface Subscription {
  plan: 'starter' | 'pro' | 'power' | null;
  ai_minutes_used: number;
  ai_minutes_total: number;
  expires_at: string | null;
  yookassa_payment_id: string | null;
}

export interface Plan {
  id: 'starter' | 'pro' | 'power';
  name: string;
  price: number;
  priceFormatted: string;
  aiMinutes: number;
  features: string[];
  popular?: boolean;
}

export const plans: Plan[] = [
  { id: 'starter', name: 'Starter', price: 490, priceFormatted: '490 ₽', aiMinutes: 500, features: ['500 AI минут/мес', 'Безлимит учеников', 'Базовый AI-анализ', 'Домашние задания'] },
  { id: 'pro', name: 'Pro', price: 990, priceFormatted: '990 ₽', aiMinutes: 1500, features: ['1 500 AI минут/мес', 'Безлимит учеников', 'AI-память учеников', 'Персональные ДЗ', 'Приоритетная поддержка'], popular: true },
  { id: 'power', name: 'Power', price: 1990, priceFormatted: '1 990 ₽', aiMinutes: 4000, features: ['4 000 AI минут/мес', 'Безлимит учеников', 'AI-память учеников', 'Персональные ДЗ', 'Приоритетная поддержка', 'API доступ'] },
];

interface MockDB {
  user: { id: string; email: string; name: string } | null;
  subscription: Subscription;
  students: Student[];
  lessons: Lesson[];
  homeworks: Homework[];
}

const defaultSubscription: Subscription = {
  plan: null,
  ai_minutes_used: 0,
  ai_minutes_total: 0,
  expires_at: null,
  yookassa_payment_id: null,
};

function getDB(): MockDB {
  if (typeof window === 'undefined') return { user: null, subscription: defaultSubscription, students: [], lessons: [], homeworks: [] };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const db = JSON.parse(raw);
    if (!db.subscription) db.subscription = { ...defaultSubscription };
    return db;
  }
  const db: MockDB = {
    user: { id: 'mock-user-1', email: 'demo@tutorai.com', name: 'Demo Tutor' },
    subscription: { ...defaultSubscription, plan: 'pro', ai_minutes_used: 1240, ai_minutes_total: 1500, expires_at: new Date(Date.now() + 30 * 86400000).toISOString() },
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
      db.user = { ...db.user!, email };
      saveDB(db);
      return { data: { user: db.user, session: { access_token: 'mock' } }, error: null };
    },
    signOut: async () => {
      return { error: null };
    },
  },

  subscription: {
    get: () => {
      const db = getDB();
      return { data: db.subscription, error: null };
    },
    activate: (planId: 'starter' | 'pro' | 'power', paymentId: string) => {
      const db = getDB();
      const plan = plans.find((p) => p.id === planId)!;
      db.subscription = {
        plan: planId,
        ai_minutes_used: 0,
        ai_minutes_total: plan.aiMinutes,
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        yookassa_payment_id: paymentId,
      };
      saveDB(db);
      return { data: db.subscription, error: null };
    },
    useMinutes: (minutes: number) => {
      const db = getDB();
      db.subscription.ai_minutes_used += minutes;
      saveDB(db);
      return { data: db.subscription, error: null };
    },
    cancel: () => {
      const db = getDB();
      db.subscription = { ...defaultSubscription };
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
