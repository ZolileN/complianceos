import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="page-heading-row">
      <div className="page-heading-row__content">
        {eyebrow}
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">{title}</h1>
        {description ? (
          <p className="mt-1.5 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="page-heading-row__actions">{actions}</div> : null}
    </section>
  );
}
