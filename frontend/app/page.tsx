'use client'

import { Button } from '@/components/ui/button'
import { ParticlesBackground } from '@/components/particles-background'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image';

export default function LandingPage() {

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center py-12 overflow-hidden">
      <ParticlesBackground />

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center py-20 px-4 max-w-4xl mx-auto bg-gradient-to-b from-transparent to-background/50 rounded-lg shadow-2xl p-8">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
            <Image
              src="/aurasql-logo.svg"
              alt="AuraSQL Logo"
              width={250}
              height={250}
              className="mb-8 mx-auto aura-glow-hover"
            />
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 text-white drop-shadow-lg">
            Unlock Your Data with <span className="text-primary">AuraSQL</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto drop-shadow-md">
            Transform natural language into powerful SQL queries. Connect, query, and analyze your databases effortlessly with AI.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-lg px-8 py-4 aura-glow-hover">
              Start Querying Now
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-4 w-full max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16">Features that Empower You</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm h-full aura-glow-hover"
          >
            <h3 className="text-xl font-semibold mb-2">Natural Language to SQL</h3>
            <p className="text-muted-foreground mb-4">Convert your questions into precise SQL queries instantly.</p>
            <p className="text-foreground">No more complex syntax. Just ask, and AuraSQL delivers the code you need.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm h-full aura-glow-hover"
          >
            <h3 className="text-xl font-semibold mb-2">Seamless Database Integration</h3>
            <p className="text-muted-foreground mb-4">Connect to PostgreSQL, MySQL, and Oracle databases with ease.</p>
            <p className="text-foreground">Securely manage your connections and extract schemas effortlessly.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm h-full aura-glow-hover"
          >
            <h3 className="text-xl font-semibold mb-2">Query History & Management</h3>
            <p className="text-muted-foreground mb-4">Keep track of all your generated and executed queries.</p>
            <p className="text-foreground">Review, re-run, and manage your past interactions with your data.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
            className="p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm h-full aura-glow-hover"
          >
            <h3 className="text-xl font-semibold mb-2">Advanced Security</h3>
            <p className="text-muted-foreground mb-4">Your data's safety is our top priority.</p>
            <p className="text-foreground">AuraSQL employs robust security measures to protect your sensitive database credentials and query data.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }}
            className="p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm h-full aura-glow-hover"
          >
            <h3 className="text-xl font-semibold mb-2">Intuitive User Interface</h3>
            <p className="text-muted-foreground mb-4">Designed for clarity and ease of use.</p>
            <p className="text-foreground">Navigate effortlessly through connections, queries, and results with a clean and responsive design.</p>
          </motion.div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="relative z-10 py-20 px-4 w-full text-center">
        <h2 className="text-4xl font-bold mb-8">Ready to Experience the Future of Data Interaction?</h2>
        <p className="text-lg text-foreground mb-10 max-w-2xl mx-auto drop-shadow-md">
          Join the AuraSQL community and revolutionize how you work with databases.
        </p>
        <Link href="/signup">
          <Button size="lg" className="text-lg px-8 py-4 aura-glow-hover">
            Get Started Free
          </Button>
        </Link>
      </section>
    </div>
  )
}