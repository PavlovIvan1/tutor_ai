import { mockStore } from '@/lib/mock-store';

function isSupabaseConfigured() {
  if (typeof window === 'undefined') return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  try { new URL(url); } catch { return false; }
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return !!key && key !== 'your-anon-key';
}

function makeMockClient() {
  const buildChain = (table: string, data: any[]): any => {
    const chain: any = {
      data,
      error: null,
      select: (_cols?: string) => buildChain(table, data),
      eq: (field: string, val: any) => buildChain(table, data.filter((r: any) => r[field] === val)),
      neq: (field: string, val: any) => buildChain(table, data.filter((r: any) => r[field] !== val)),
      order: (col: string, opts?: any) => {
        const sorted = [...data].sort((a: any, b: any) =>
          opts?.ascending ? (a[col] > b[col] ? 1 : -1) : (a[col] < b[col] ? 1 : -1)
        );
        return buildChain(table, sorted);
      },
      limit: (n: number) => buildChain(table, data.slice(0, n)),
      single: () => Promise.resolve({ data: data[0] || null, error: null }),
      maybeSingle: () => Promise.resolve({ data: data[0] || null, error: null }),
      then: (resolve: any, reject?: any) => {
        try { resolve({ data, error: null }); }
        catch (e) { if (reject) reject(e); }
      },
    };
    return chain;
  };

  return {
    auth: {
      getUser: async () => {
        const { data } = mockStore.auth.getUser();
        return { data: { user: data }, error: null };
      },
      signUp: async ({ email, password, options }: any) => {
        const { data, error } = await mockStore.auth.signUp(email, password, options?.data?.name || '');
        return { data: { user: data, session: data ? { access_token: 'mock' } : null }, error };
      },
      signInWithPassword: async ({ email, password }: any) => {
        const { data, error } = await mockStore.auth.signIn(email, password);
        return { data: { user: data, session: data ? { access_token: 'mock' } : null }, error };
      },
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: (table: string) => {
      const store = (mockStore as any)[table];

      return {
        select: (_cols?: string) => {
          if (!store?.getAll) return buildChain(table, []);
          const result = store.getAll();
          return buildChain(table, result.data || []);
        },
        insert: (row: any) => {
          const api: any = {
            select: () => ({
              single: async () => {
                if (store?.insert) {
                  return store.insert(row);
                }
                return { data: null, error: { message: `Table "${table}" not in mock store` } };
              },
            }),
            then: (resolve: any) => {
              if (store?.insert) {
                resolve(store.insert(row));
              } else {
                resolve({ data: null, error: { message: `Table "${table}" not in mock store` } });
              }
            },
          };
          return api;
        },
        update: (updates: any) => ({
          eq: (field: string, val: any) => ({
            select: () => ({
              single: async () => {
                if (!store?.getAll || !store?.update) return { data: null, error: { message: 'Not found' } };
                const items = store.getAll().data || [];
                const item = items.find((r: any) => r[field] === val);
                if (item) return store.update(item.id, updates);
                return { data: null, error: { message: 'Not found' } };
              },
            }),
          }),
        }),
        delete: () => ({
          eq: (field: string, val: any) => {
            if (store?.getAll && store?.delete) {
              const items = store.getAll().data || [];
              const item = items.find((r: any) => r[field] === val);
              if (item) store.delete(item.id);
            }
            return { error: null };
          },
        }),
      };
    },
  };
}

export function createClient() {
  if (!isSupabaseConfigured()) {
    return makeMockClient();
  }
  const { createBrowserClient } = require('@supabase/ssr');
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
