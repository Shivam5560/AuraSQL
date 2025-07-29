'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

interface HeaderProps {
  session: Session | null;
}

export function Header({ session }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 aura-glow-hover transition-all-ease">
      <div className="container flex h-16 items-center justify-between py-2">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2 transition-all-ease hover:scale-[1.02]">
            <Image
              src="/aurasql-logo.svg"
              alt="AuraSQL Logo"
              width={48}
              height={48}
              className="rounded-full aura-glow"
            />
            <span className="font-extrabold text-xl tracking-tight">AuraSQL</span>
          </Link>
          <nav className="flex items-center space-x-4 text-sm font-medium">
            <Link href="/dashboard" className="transition-colors hover:text-primary hover:scale-[1.05] px-2 py-1 rounded-md">
              Dashboard
            </Link>
            <Link href="/about" className="transition-colors hover:text-primary hover:scale-[1.05] px-2 py-1 rounded-md">
              About
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          {session ? (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="aura-glow-hover">
              Logout
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="sm" className="aura-glow-hover">Login</Button>
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
