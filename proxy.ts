import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { CUSTOMER_AUTH_COOKIE, isCustomerAuthCookie } from '@/lib/supabase/customer-auth-options'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const pendingCookies: { name: string; value: string; options: import('@supabase/ssr').CookieOptions }[] = []
  for (const customer of [false, true]) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(customer ? { cookieOptions: { name: CUSTOMER_AUTH_COOKIE }, auth: { storageKey: CUSTOMER_AUTH_COOKIE } } : {}),
      cookies: {
        getAll: () => request.cookies.getAll().filter(c => isCustomerAuthCookie(c.name) === customer),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          pendingCookies.push(...cookiesToSet)
          pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // Apenas sincroniza/renova a sessão. As guardas e RPCs autorizam o acesso.
  await supabase.auth.getUser()
  }
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*', '/cozinha', '/bar', '/garcom', '/gerente', '/', '/identificacao', '/mesa/:path*'],
}
