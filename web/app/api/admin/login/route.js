import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, computeSessionToken } from '../../../../utils/adminAuth';

// POST /api/admin/login — verify the password against ADMIN_PASSWORD and, on a
// match, set the httpOnly session cookie the middleware checks for.
export async function POST(request) {
  let password;
  try {
    ({ password } = await request.json());
  } catch {
    password = undefined;
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password !== expected) {
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  }

  const token = await computeSessionToken(expected);
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
  return res;
}
