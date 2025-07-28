import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { data: { session } } = await supabase.auth.getSession()

  console.log(`Middleware: Path - ${req.nextUrl.pathname}, Session - ${session ? 'Authenticated' : 'Unauthenticated'}`)

  const protectedPaths = ['/dashboard', '/new-connection', '/query-interface']
  const authPaths = ['/login', '/signup']

  // Redirect unauthenticated users from protected routes
  if (!session && protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))) {
    console.log(`Middleware: Unauthenticated user trying to access protected path ${req.nextUrl.pathname}. Redirecting to /login`)
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set(`redirectedFrom`, req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users from auth routes to dashboard
  if (session && authPaths.some(path => req.nextUrl.pathname.startsWith(path))) {
    console.log(`Middleware: Authenticated user trying to access auth path ${req.nextUrl.pathname}. Redirecting to /dashboard`)
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}