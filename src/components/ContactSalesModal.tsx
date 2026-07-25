'use client';

import SimpleInquiryModal from '@/components/landing/SimpleInquiryModal';
import { useHashModal } from '@/hooks/useHashModal';

export default function ContactSalesModal() {
  const { isOpen, closeModal } = useHashModal('#contact-sales');

  return (
    <SimpleInquiryModal
      isOpen={isOpen}
      onClose={closeModal}
      badge="Contact sales"
      title="Enterprise pricing"
      description="Tell us about your firm and we'll follow up with a custom quote."
      submitLabel="Send inquiry"
      successTitle="Inquiry received"
      successMessage="Our sales team will contact you within one business day."
      apiPath="/api/contact/sales"
    />
  );
}
