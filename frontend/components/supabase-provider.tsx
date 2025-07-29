import { createContext, useContext } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseContext = SupabaseClient

const Context = createContext<SupabaseContext | undefined>(undefined)

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookieOptions: {
      name: 'sb-flrqfrzgvranidndzeiy-auth-token',
      secure: true,
      sameSite: 'Lax',
    },
  }
)

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Context.Provider value={supabase}>
      <>{children}</>
    </Context.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider')
  }
  return context
}