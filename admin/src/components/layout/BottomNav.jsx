import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  BookOpen,
} from "lucide-react";

const links = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/orders", icon: UtensilsCrossed, label: "Orders" },
  { to: "/tables", icon: Grid3X3, label: "Tables" },
  { to: "/menu", icon: BookOpen, label: "Menu" },
];

export default function BottomNav({ waitingCount }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper border-t-2 border-line flex">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold transition-colors relative ${
              isActive ? "text-orange" : "text-ink/40"
            }`
          }
        >
          <div className="relative">
            <Icon size={22} />
            {label === "Orders" && waitingCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                {waitingCount}
              </span>
            )}
          </div>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
