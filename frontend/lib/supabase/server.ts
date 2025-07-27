import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `cookies()` helper can be called only from a Server Component or Route Handler
            // This error is typically not an issue if you're using it on a page that doesn't require authentication
            // console.warn('Error setting cookie:', error)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `cookies()` helper can be called only from a Server Component or Route Handler
            // This error is typically not an issue if you're using it on a page that doesn't require authentication
            // console.warn('Error removing cookie:', error)
          }
        },
      },
    }
  )
}
