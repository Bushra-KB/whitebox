interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  secondaryLabel?: string;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  secondaryLabel,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
        📄
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 max-w-sm text-xs text-slate-500">{description}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {actionLabel ? (
          <button className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white">
            {actionLabel}
          </button>
        ) : null}
        {secondaryLabel ? (
          <button className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
