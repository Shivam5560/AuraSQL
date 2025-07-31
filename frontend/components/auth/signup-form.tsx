import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/supabase-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { FaGoogle, FaGithub } from 'react-icons/fa'

export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useSupabase()
  const router = useRouter()

  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    console.log('Attempting signup with:', { email, password: '********' })
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.error('Supabase signup error:', error)
      setError(error.message)
    } else {
      setIsSubmitted(true) // Show confirmation message
    }
    setLoading(false)
  }

  const handleOAuthSignUp = async (provider: 'google' | 'github') => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      console.error(`Supabase OAuth signup with ${provider} error:`, error)
    }
    setLoading(false)
  }

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Confirm Your Email</CardTitle>
          <CardDescription>
            We've sent a confirmation link to <strong>{email}</strong>. Please check your inbox to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/login')} className="w-full">
            Go to Login
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Sign Up</CardTitle>
        <CardDescription>Enter your email and password to create an account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing up...</> : "Sign Up"}
          </Button>
        </form>

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Button variant="outline" onClick={() => handleOAuthSignUp('google')} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FaGoogle className="mr-2 h-4 w-4" />}
            Google
          </Button>
          <Button variant="outline" onClick={() => handleOAuthSignUp('github')} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FaGithub className="mr-2 h-4 w-4" />}
            GitHub
          </Button>
        </div>

        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <a href="/login" className="underline">
            Login
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
