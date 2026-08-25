import type { ReactNode } from 'react';

import ContextualHelpButton from '@/components/help/ContextualHelpButton';

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  helpSlug?: string;
  helpLabel?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  helpSlug,
  helpLabel,
}: PageHeaderProps) {
  return (
    <section className="page-heading-row">
      <div className="page-heading-row__content">
        {eyebrow}
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">{title}</h1>
          {helpSlug ? <ContextualHelpButton slug={helpSlug} label={helpLabel} /> : null}
        </div>
        {description ? (
          <p className="mt-1.5 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="page-heading-row__actions">{actions}</div> : null}
    </section>
  );
}
