export default function PageHeader({ title, subtitle, actions, children }) {
  return (
    <header className="mb-5 md:mb-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-h2 md:text-h1 font-bold tracking-[-0.02em]">{title}</h1>
          {subtitle && <p className="text-body text-ink-2 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
