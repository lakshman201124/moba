import { CalendarDays, ChevronDown } from "lucide-react";
import Menu, { MenuCheckItem } from "../ui/Menu";
import { RANGES } from "../../lib/analytics";

export default function RangeSelect({ value, onChange }) {
  const current = RANGES.find((r) => r.key === value) || RANGES[0];
  return (
    <Menu
      label="Date range"
      width={200}
      trigger={(p) => (
        <button {...p} aria-label={`Date range: ${current.label}`} className="btn btn-secondary">
          <CalendarDays size={16} className="text-ink-2" />
          {current.label}
          <ChevronDown size={16} className="text-ink-3 -mr-1" />
        </button>
      )}
    >
      {RANGES.map((r) => (
        <MenuCheckItem key={r.key} checked={r.key === current.key} onSelect={() => onChange(r.key)}>
          {r.label}
        </MenuCheckItem>
      ))}
    </Menu>
  );
}
