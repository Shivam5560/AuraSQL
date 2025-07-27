import SupabaseProvider from '@/components/supabase-provider'
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Text-to-SQL AI Assistant",
  description: "Connect to your database, extract schema, generate SQL queries with AI, and execute them.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SupabaseProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            
            <div id="root">
              {children}
            </div>
          </ThemeProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}