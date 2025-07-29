'use client'

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DeveloperInfo } from '@/components/developer-info';

function AboutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get('section');

  useEffect(() => {
    if (section) {
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [section]);

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center text-foreground px-4 py-8 sm:px-6 lg:px-8 pt-16 bg-gradient-to-br from-gray-900 to-black aura-glow-hover">
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 z-10">
        <Card id="about-aurasql">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">About AuraSQL</CardTitle>
            <CardDescription>Your intelligent assistant for database interactions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-lg">
            <p>AuraSQL is designed to simplify your database management and query generation. It leverages advanced AI capabilities to understand natural language queries and translate them into executable SQL, making database interactions more intuitive and efficient.</p>
            <p>Key features include:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Seamless database connection and schema extraction.</li>
              <li>AI-powered natural language to SQL conversion.</li>
              <li>Query history tracking and execution.</li>
              <li>Intuitive dashboard for managing connections and reviewing activity.</li>
            </ul>
            <p>Our goal is to empower users, from data analysts to developers, to interact with their databases more effectively, reducing the need for deep SQL expertise and accelerating data-driven decision-making.</p>
          </CardContent>
        </Card>

        <Card id="developer-info">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Developer</CardTitle>
          </CardHeader>
          <CardContent>
            <DeveloperInfo />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function AboutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AboutContent />
    </Suspense>
  );
}
