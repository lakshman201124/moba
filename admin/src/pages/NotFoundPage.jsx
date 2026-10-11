import { Link } from "react-router-dom";

export default function NotFoundPage({ message }) {
  return (
    <div className="p-6 max-w-md mx-auto text-center py-20">
      <p className="font-display text-3xl mb-2">Not found</p>
      <p className="text-ink/60 mb-5">{message || "That page doesn't exist."}</p>
      <Link to="/dashboard" className="btn-primary">Back to dashboard</Link>
    </div>
  );
}
