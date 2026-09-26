import { NextRequest, NextResponse } from 'next/server';

const REDIRECT_URI = 'https://tutorhelper-three.vercel.app/api/auth/yandex/callback';
const YANDEX_CLIENT_ID = process.env.YANDEX_CLIENT_ID || '';
const YANDEX_CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET || '';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/auth/login?error=yandex_denied', req.url));
  }

  if (!code) {
    // Redirect to Yandex OAuth
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: YANDEX_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
    });
    return NextResponse.redirect(`https://oauth.yandex.ru/authorize?${params}`);
  }

  // Exchange code for token
  try {
    const tokenRes = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: YANDEX_CLIENT_ID,
        client_secret: YANDEX_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) throw new Error('Token exchange failed');
    const tokenData = await tokenRes.json();

    // Get user info
    const userRes = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${tokenData.access_token}` },
    });

    if (!userRes.ok) throw new Error('User info failed');
    const userInfo = await userRes.json();

    // Create session via mock store
    const userId = `yandex-${userInfo.id}`;
    const displayName = userInfo.display_name || userInfo.real_name || userInfo.login;

    // Redirect with user data in cookies (simple approach)
    const response = NextResponse.redirect(new URL('/dashboard', req.url));
    response.cookies.set('yandex_user', JSON.stringify({
      id: userId,
      name: displayName,
      email: userInfo.default_email || '',
      login: userInfo.login,
    }), { httpOnly: false, maxAge: 86400 * 30, path: '/' });

    return response;
  } catch (err: any) {
    console.error('Yandex OAuth error:', err);
    return NextResponse.redirect(new URL('/auth/login?error=yandex_failed', req.url));
  }
}
