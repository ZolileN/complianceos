'use client';

import { X } from 'lucide-react';

import RefundPolicyContent from '@/components/landing/RefundPolicyContent';
import { Button } from '@/components/ui/button';
import { useHashModal } from '@/hooks/useHashModal';

export default function RefundPolicyModal() {
  const { isOpen, closeModal } = useHashModal('#refund-policy');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10 backdrop-blur-sm sm:pt-16"
      onClick={closeModal}
      role="presentation"
    >
      <div
        className="relative mb-10 w-full max-w-[760px] overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Refund and cancellation policy"
      >
        <div className="sticky top-0 z-10 flex items-center justify-end border-b border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3">
          <Button type="button" variant="ghost" size="icon" onClick={closeModal} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
          <RefundPolicyContent />
        </div>
      </div>
    </div>
  );
}
