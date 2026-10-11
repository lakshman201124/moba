export default function Switch({ checked, onChange, disabled, label, hideLabel = false, size = "md", description }) {
  const sm = size === "sm";
  const button = (
    <button
      role="switch"
      type="button"
      aria-checked={checked}
      aria-label={hideLabel || !label ? label : undefined}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative shrink-0 rounded-full transition-colors duration-200 ${sm ? "w-8 h-[18px]" : "w-10 h-[22px]"} ${
        checked ? "bg-green" : "bg-[#C4C3BB]"
      } ${disabled ? "opacity-45" : "hover:brightness-95"}`}
    >
      <span
        className={`absolute top-[2px] left-[2px] rounded-full bg-white shadow-[0_1px_2px_rgb(27_26_46/0.25)] transition-transform duration-200 ease-[var(--ease-out)] ${
          sm ? "w-[14px] h-[14px]" : "w-[18px] h-[18px]"
        } ${checked ? (sm ? "translate-x-[14px]" : "translate-x-[18px]") : ""}`}
      />
    </button>
  );

  if (!label || hideLabel) return button;

  return (
    <label className={`flex items-center justify-between gap-4 ${disabled ? "" : "cursor-pointer"}`}>
      <span className="min-w-0">
        <span className="block text-body font-semibold">{label}</span>
        {description && <span className="block text-meta text-ink-3 mt-0.5">{description}</span>}
      </span>
      {button}
    </label>
  );
}
