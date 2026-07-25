'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Brain, Sparkles, Wand2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Suggestion = {
  id: string;
  title: string;
  description: string;
  triggerEvent: string;
  suggestedSteps: string;
  status: string;
};

export default function IntelligenceTab() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const loadPending = useCallback(async () => {
    const res = await fetch('/api/skills/suggestions?status=pending');
    const data = await res.json();
    if (data.data) setSuggestions(data.data);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadPending();
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadPending]);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setLoading(true);
    try {
      await fetch('/api/skills/analyze', { method: 'POST' });
      await loadPending();
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  const dismiss = async (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch('/api/skills/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'dismissed' }),
      });
    } catch (err) {
      console.error(err);
      await loadPending();
    }
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
            <Brain className="size-5 text-[var(--accent)]" />
            Behavioral Intelligence
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Heuristic suggestions from trigger coverage gaps in your installed skills.
          </p>
        </div>
        <Button onClick={handleRunAnalysis} disabled={analyzing}>
          {analyzing ? 'Analyzing…' : 'Run analysis'}
        </Button>
      </div>

      {loading ? (
        <div className="flex-center" style={{ minHeight: '30vh' }}>
          <span className="spinner" style={{ width: 30, height: 30 }} />
        </div>
      ) : suggestions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Sparkles className="size-8 text-[var(--text-muted)]" />
            <h3 className="font-semibold text-[var(--text-primary)]">No suggestions right now</h3>
            <p className="max-w-md text-sm text-[var(--text-muted)]">
              Run analysis after installing skills, or create more client activity so coverage gaps
              can be detected.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {suggestions.map((s) => {
            let steps: Array<{ name: string; stepType: string }> = [];
            try {
              steps = JSON.parse(s.suggestedSteps);
            } catch {
              steps = [];
            }
            return (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{s.title}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => dismiss(s.id)}>
                      Dismiss
                    </Button>
                  </div>
                  <CardDescription>{s.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Badge variant="info">{s.triggerEvent}</Badge>
                  </div>
                  <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                    {steps.map((step, i) => (
                      <li key={i}>
                        {step.name}{' '}
                        <span className="text-[var(--text-muted)]">({step.stepType})</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full">
                    <Link href={`/dashboard/marketplace/builder?suggestion=${s.id}`}>
                      <Wand2 className="size-4" />
                      Automate this
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-12 border-t border-[var(--border-primary)] pt-8 text-center">
        <h3 className="mb-2 text-base font-semibold">Build from scratch</h3>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Design a custom skill without a suggestion.
        </p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/marketplace/builder">Open builder</Link>
        </Button>
      </div>
    </section>
  );
}
