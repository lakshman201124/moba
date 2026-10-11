import { NavLink } from "react-router-dom";

// Page-level view switcher (lemon pill on the active view), as links or as local state.
export function SegmentedLinks({ items, label, size }) {
  return (
    <nav aria-label={label} className={`seg ${size === "sm" ? "seg-sm" : ""}`}>
      {items.map(({ to, label: text, icon: Icon, count, end, active }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          aria-current={active ? "page" : undefined}
          className={({ isActive }) => `seg-item ${(active ?? isActive) ? "active" : ""}`}
        >
          {Icon && <Icon size={15} />}
          {text}
          {count > 0 && <span className="badge !h-[18px] !min-w-[18px] !text-[10px]">{count}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

export function Segmented({ value, onChange, options, label, size, plain }) {
  return (
    <div role="tablist" aria-label={label} className={`seg ${size === "sm" ? "seg-sm" : ""} ${plain ? "seg-plain" : ""}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className="seg-item"
        >
          {o.icon && <o.icon size={14} />}
          {o.label}
          {o.count != null && <span className="text-ink-3 tnum">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Tabs({ value, onChange, options, label, className = "" }) {
  return (
    <div role="tablist" aria-label={label} className={`tabs ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className="tab"
        >
          {o.label}
          {o.count != null && <span className="tab-count tnum">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
