'use client'

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DeveloperInfo } from '@/components/developer-info';

export default function AboutPage() {
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
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute top-4 left-4">
        <Button onClick={() => router.back()}>Back to Dashboard</Button>
      </div>
      <div className="w-full max-w-3xl space-y-8">
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
