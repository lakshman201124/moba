import { useId } from "react";

// A labelled form control. `children` is a render function receiving the input's id and
// aria props, so hints and errors are announced with the field.
export default function Field({ label, hint, error, optional, children, className = "", counter }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label flex items-baseline justify-between gap-2">
          <span>
            {label}
            {optional && <span className="font-normal text-ink-3"> (optional)</span>}
          </span>
          {counter}
        </label>
      )}
      {children({
        id,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
      })}
      {error ? (
        <p id={errorId} className="field-error">{error}</p>
      ) : (
        hint && <p id={hintId} className="hint">{hint}</p>
      )}
    </div>
  );
}

export function Section({ title, description, action, children, className = "" }) {
  return (
    <section className={`py-5 first:pt-0 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div>
            {title && <h3 className="text-body font-bold">{title}</h3>}
            {description && <p className="text-meta text-ink-3 mt-0.5">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
