'use client';

import React from 'react';
import Link from 'next/link';
import { CircleHelp } from 'lucide-react';

import { helpArticlePath } from '@/lib/dashboard-help';
import { Button } from '@/components/ui/button';

type ContextualHelpButtonProps = {
  slug: string;
  label?: string;
  className?: string;
};

export default function ContextualHelpButton({
  slug,
  label = 'Help',
  className,
}: ContextualHelpButtonProps) {
  const href = helpArticlePath(slug);

  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className={className}
      title={`Help: ${label}`}
    >
      <Link href={href} target="_blank" rel="noopener noreferrer">
        <CircleHelp className="size-4" />
        <span className="sr-only">{label} help</span>
      </Link>
    </Button>
  );
}
