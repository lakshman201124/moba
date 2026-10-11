import { WifiOff } from "lucide-react";

export default function ErrorState({ message, onRetry, compact }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 ${compact ? "py-8" : "py-16"}`} role="alert">
      <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-soft text-red">
        <WifiOff size={20} strokeWidth={1.75} />
      </span>
      <p className="text-title font-bold">Couldn't load this</p>
      <p className="text-body text-ink-2 mt-1 max-w-[46ch]">
        {message || "Check the connection and try again."}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary mt-4">
          Try again
        </button>
      )}
    </div>
  );
}
