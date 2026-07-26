'use client';

import SimpleInquiryModal from '@/components/landing/SimpleInquiryModal';
import { useHashModal } from '@/hooks/useHashModal';

export default function ContactModal() {
  const { isOpen, closeModal } = useHashModal('#contact');

  return (
    <SimpleInquiryModal
      isOpen={isOpen}
      onClose={closeModal}
      badge="Contact"
      title="Get in touch"
      description="Tell us how we can help your firm."
      submitLabel="Send message"
      successTitle="Message received"
      successMessage="Thanks for contacting PraxisOne. We'll reply within one business day."
      apiPath="/api/contact/general"
    />
  );
}
