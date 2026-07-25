'use client';

import SimpleInquiryModal from '@/components/landing/SimpleInquiryModal';
import { useHashModal } from '@/hooks/useHashModal';

export default function BookDemoModal() {
  const { isOpen, closeModal } = useHashModal('#book-demo');

  return (
    <SimpleInquiryModal
      isOpen={isOpen}
      onClose={closeModal}
      badge="Book demo"
      title="Schedule a demo"
      description="See how PraxisOne works for your firm."
      submitLabel="Request demo"
      successTitle="Demo request received"
      successMessage="We'll be in touch shortly to schedule your walkthrough."
      apiPath="/api/contact/demo"
    />
  );
}
