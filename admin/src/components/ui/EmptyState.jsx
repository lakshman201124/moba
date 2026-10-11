export default function EmptyState({ icon: Icon, title, message, action, onAction, actionIcon: ActionIcon, compact }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 ${compact ? "py-8" : "py-14"}`}>
      {Icon && (
        <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-sunken border border-line text-ink-2">
          <Icon size={20} strokeWidth={1.75} />
        </span>
      )}
      <p className="text-title font-bold">{title}</p>
      {message && <p className="text-body text-ink-2 mt-1 max-w-[42ch]">{message}</p>}
      {action && onAction && (
        <button onClick={onAction} className="btn btn-primary mt-4">
          {ActionIcon && <ActionIcon size={16} />}
          {action}
        </button>
      )}
    </div>
  );
}
