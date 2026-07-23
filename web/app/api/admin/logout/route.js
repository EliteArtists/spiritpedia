import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '../../../../utils/adminAuth';

// POST /api/admin/logout — clear the session cookie and send the browser back to
// the login screen. Status 303 makes the browser follow the redirect with a GET,
// so a plain <form method="POST"> sign-out link navigates cleanly.
export async function POST(request) {
  const res = NextResponse.redirect(new URL('/admin/login', request.url), { status: 303 });
  res.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // expire immediately
    path: '/',
  });
  return res;
}
