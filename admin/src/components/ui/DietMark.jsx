import { Flame } from "lucide-react";

const LABELS = {
  veg: "Veg",
  nonveg: "Non-veg",
  egg: "Contains egg",
  both: "Veg or non-veg",
};

export const DIET_OPTIONS = [
  ["", "Not marked"],
  ["veg", "Veg"],
  ["nonveg", "Non-veg"],
  ["egg", "Egg"],
  ["both", "Veg or non-veg"],
];

// `decorative` when a visible label beside it already names the diet.
// `slot` reserves room for two marks, so names in a list start on one line.
export default function DietMark({ diet, size = 14, decorative, slot }) {
  if (slot) {
    return (
      <span className="inline-flex shrink-0" style={{ width: size * 2 + 2 }}>
        <DietMark diet={diet} size={size} decorative={decorative} />
      </span>
    );
  }
  if (!diet || !LABELS[diet]) return null;
  const a11y = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": LABELS[diet], title: LABELS[diet] };

  if (diet === "both") {
    return (
      <span className="inline-flex gap-0.5 shrink-0" {...a11y}>
        <Mark diet="veg" size={size} />
        <Mark diet="nonveg" size={size} />
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0" {...a11y}>
      <Mark diet={diet} size={size} />
    </span>
  );
}

function Mark({ diet, size }) {
  return <span className={`mark mark--${diet}`} style={{ width: size, height: size }} />;
}

export const SPICE_LABELS = ["Not spicy", "Mild", "Hot", "Very hot"];

export function SpiceMark({ level, size = 13 }) {
  if (!level) return null;
  return (
    <span className="inline-flex items-center text-orange-ink shrink-0" role="img" aria-label={SPICE_LABELS[level]} title={SPICE_LABELS[level]}>
      {Array.from({ length: level }, (_, i) => (
        <Flame key={i} size={size} strokeWidth={2.25} className={i ? "-ml-1" : ""} fill="currentColor" fillOpacity={0.18} />
      ))}
    </span>
  );
}
