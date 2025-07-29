'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/ui/header'
import { Session } from '@supabase/supabase-js'

interface LayoutContentProps {
  children: React.ReactNode;
}

export default function LayoutContent({ children }: LayoutContentProps) {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      if (supabase && supabase.auth) {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setLoadingSession(false);
      }
    };

    getSession();

    if (supabase && supabase.auth) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    }
  }, [supabase]);

  return (
    <>
      {!loadingSession && <Header session={session} />}
      {children}
    </>
  );
}
