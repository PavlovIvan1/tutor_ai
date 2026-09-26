'use client';

export const consentStore = {
  save: async (data: { user_id: string; consent_type: string; granted: boolean }) => {
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error('Consent save error:', e);
    }
  },
};
