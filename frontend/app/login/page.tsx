'use client'

import { LoginForm } from '@/components/auth/login-form'
import { ParticlesBackground } from '@/components/particles-background'
import Image from 'next/image'

export default function Login() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center py-12 overflow-hidden">
      <ParticlesBackground />
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md px-4">
        <Image
          src="/aurasql-logo.svg" // Placeholder for your AuraSQL logo
          alt="AuraSQL Logo"
          width={250}
          height={250}
          className="mb-8"
        />
        <LoginForm />
      </div>
    </div>
  )
}