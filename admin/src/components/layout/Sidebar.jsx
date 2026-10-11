import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  BookOpen,
  LogOut,
} from "lucide-react";
import { signOut } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

const links = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/orders", icon: UtensilsCrossed, label: "Orders" },
  { to: "/tables", icon: Grid3X3, label: "Tables" },
  { to: "/menu", icon: BookOpen, label: "Menu" },
];

export default function Sidebar({ waitingCount }) {
  const { staff } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-60 h-screen bg-ink fixed left-0 top-0 z-40">
      <div className="p-5 pb-3">
        <h1 className="font-display text-xl text-white tracking-wide">MOBA</h1>
        <p className="text-xs text-white/40 mt-0.5">Admin</p>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-white/12 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/6"
              }`
            }
          >
            <Icon size={20} />
            <span className="flex-1">{label}</span>
            {label === "Orders" && waitingCount > 0 && (
              <span className="bg-orange text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center">
                {waitingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        {staff && (
          <p className="text-xs text-white/40 px-3 mb-2 truncate">
            {staff.display_name || staff.email}
          </p>
        )}
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-white/50 hover:text-white hover:bg-white/6 w-full transition-colors"
        >
          <LogOut size={20} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
