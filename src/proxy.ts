import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const authCookie = request.cookies.get('auth_session')?.value;
  const isAuthPage = request.nextUrl.pathname === '/login';

  if (!authCookie && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (authCookie && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
