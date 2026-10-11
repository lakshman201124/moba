import { AlertCircle } from "lucide-react";

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <AlertCircle size={40} className="text-nonveg mb-3" />
      <p className="font-bold text-lg mb-1">Something went wrong</p>
      <p className="text-ink/60 mb-4">{message || "Please try again."}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          Retry
        </button>
      )}
    </div>
  );
}
