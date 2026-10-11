import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export default function NotFoundPage({ message, standalone, backTo = "/dashboard", backLabel = "Back to dashboard" }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 ${standalone ? "min-h-dvh bg-canvas" : "py-24"}`}>
      <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-sunken border border-line text-ink-2">
        <Compass size={20} strokeWidth={1.75} />
      </span>
      <p className="text-h3 font-bold">Nothing here</p>
      <p className="text-body text-ink-2 mt-1 max-w-[40ch]">{message || "That page doesn't exist, or it moved."}</p>
      <Link to={backTo} className="btn btn-secondary mt-5">{backLabel}</Link>
    </div>
  );
}
