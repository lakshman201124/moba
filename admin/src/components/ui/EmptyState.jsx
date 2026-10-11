export default function EmptyState({ title, message, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="font-bold text-lg mb-1">{title}</p>
      {message && <p className="text-ink/60 mb-4">{message}</p>}
      {action && onAction && (
        <button onClick={onAction} className="btn-primary">
          {action}
        </button>
      )}
    </div>
  );
}
