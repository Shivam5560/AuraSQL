'use client'

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Loader2 } from 'lucide-react';
import { DbConfig, ExtractedSchema } from '@/lib/types';
import { extractSchema } from '@/lib/api';
import { QueryInterface } from '@/components/query-interface';

export default function LandingPage() {
  const [dbConfig, setDbConfig] = useState<DbConfig | null>(null);
  const [extractedSchema, setExtractedSchema] = useState<ExtractedSchema | null>(null);
  const [loadingDbConfig, setLoadingDbConfig] = useState(true);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [showQueryInterface, setShowQueryInterface] = useState(false);

  useEffect(() => {
    const storedConfig = localStorage.getItem('currentDbConfig');
    if (storedConfig) {
      setDbConfig(JSON.parse(storedConfig));
    }
    setLoadingDbConfig(false);
  }, []);

  useEffect(() => {
    const fetchSchema = async () => {
      if (!dbConfig) return;
      setLoadingSchema(true);
      try {
        const result = await extractSchema(dbConfig);
        if (result.success && result.schema) {
          setExtractedSchema(result.schema);
        } else {
          console.error("Failed to extract schema:", result.detail);
          // Clear invalid config and show landing page
          localStorage.removeItem('currentDbConfig');
          setDbConfig(null);
        }
      } catch (error) {
        console.error("Error fetching schema:", error);
        localStorage.removeItem('currentDbConfig');
        setDbConfig(null);
      } finally {
        setLoadingSchema(false);
      }
    };

    if (dbConfig) {
      fetchSchema();
    }
  }, [dbConfig]);

  if (loadingDbConfig || (dbConfig && showQueryInterface && loadingSchema)) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="mt-4 text-lg">Loading database schema...</p>
      </main>
    );
  }

  if (dbConfig && extractedSchema && showQueryInterface) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8 pt-16">
        <div className="w-full max-w-7xl space-y-8">
          <QueryInterface dbConfig={dbConfig} extractedSchema={extractedSchema} />
        </div>
      </main>
    );
  }

  // If dbConfig exists but showQueryInterface is false, show a prompt on the landing page
  if (dbConfig && !showQueryInterface) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background text-foreground">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/placeholder-video.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <section className="relative z-10 flex flex-col items-center justify-center text-center py-20 px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <Image
              src="/aurasql-logo.svg"
              alt="AuraSQL Logo"
              width={180}
              height={180}
              className="mb-8 mx-auto"
            />
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
              Welcome Back to <span className="text-primary">AuraSQL</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              A saved database connection was found. Do you want to continue with it?
            </p>
            <Button size="lg" className="text-lg px-8 py-4 aura-glow-hover" onClick={() => setShowQueryInterface(true)}>
              Continue with Saved Connection
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4 mt-4" onClick={() => {
              localStorage.removeItem('currentDbConfig');
              setDbConfig(null);
            }}>
              Start Fresh
            </Button>
          </motion.div>
        </section>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background text-foreground">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/placeholder-video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center py-20 px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <Image
            src="/aurasql-logo.svg"
            alt="AuraSQL Logo"
            width={180}
            height={180}
            className="mb-8 mx-auto"
          />
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
            Unlock Your Data with <span className="text-primary">AuraSQL</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
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
          >
            <Card className="h-full aura-glow-hover">
              <CardHeader>
                <CardTitle>Natural Language to SQL</CardTitle>
                <CardDescription>Convert your questions into precise SQL queries instantly.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No more complex syntax. Just ask, and AuraSQL delivers the code you need.</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            <Card className="h-full aura-glow-hover">
              <CardHeader>
                <CardTitle>Seamless Database Integration</CardTitle>
                <CardDescription>Connect to PostgreSQL, MySQL, and Oracle databases with ease.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Securely manage your connections and extract schemas effortlessly.</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          >
            <Card className="h-full aura-glow-hover">
              <CardHeader>
                <CardTitle>Query History & Management</CardTitle>
                <CardDescription>Keep track of all your generated and executed queries.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Review, re-run, and manage your past interactions with your data.</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Featured Video Section */}
      <section className="relative z-10 py-20 px-4 w-full max-w-6xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 className="text-4xl font-bold mb-8">See AuraSQL in Action</h2>
          <div className="relative w-full max-w-4xl mx-auto aspect-video rounded-xl overflow-hidden shadow-2xl aura-glow">
            <video
              controls
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/placeholder-product-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </motion.div>
      </section>

      {/* Call to Action Section */}
      <section className="relative z-10 py-20 px-4 w-full text-center bg-card/50 backdrop-blur-sm">
        <h2 className="text-4xl font-bold mb-8">Ready to Experience the Future of Data Interaction?</h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
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
