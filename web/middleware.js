import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, computeSessionToken } from './utils/adminAuth';

// Gate every /admin route behind a valid session cookie. The login screen stays
// reachable, and the auth API routes live under /api (outside this matcher), so
// they are never intercepted here.
export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // The login screen must always be reachable, or there is no way back in.
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    const expected = await computeSessionToken(process.env.ADMIN_PASSWORD);
    // Only a token minted from the configured password passes. If ADMIN_PASSWORD
    // is unset, no valid cookie can ever exist, so access stays denied.
    if (process.env.ADMIN_PASSWORD && token === expected) {
      return NextResponse.next();
    }
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
