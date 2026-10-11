import { NavLink } from "react-router-dom";
import { NAV } from "./nav";
import AccountMenu, { SoundToggle } from "./AccountMenu";
import { OrderingPill } from "../dashboard/OrderingSwitch";

export function MobileTopBar({ orderingOpen, loading }) {
  return (
    <div className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-sm">
      <NavLink to="/dashboard" className="flex items-center gap-2" aria-label="MOBA Admin, dashboard">
        <img src="/logo-mark.webp" alt="" width="32" height="32" className="h-8 w-8 object-contain" />
        <span className="text-title font-extrabold">MOBA</span>
      </NavLink>
      <div className="flex items-center gap-1.5">
        <OrderingPill isOpen={orderingOpen} loading={loading} />
        <SoundToggle compact />
        <AccountMenu compact />
      </div>
    </div>
  );
}

export default function BottomNav({ waitingCount }) {
  return (
    <nav
      aria-label="Main"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 px-2 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] backdrop-blur-sm"
    >
      {NAV.map(({ to, icon: Icon, label, badge }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `group flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold transition-colors ${
              isActive ? "text-ink" : "text-ink-3"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${isActive ? "bg-lemon" : ""}`}>
                <Icon size={20} />
                {badge && waitingCount > 0 && <span className="badge absolute -right-0.5 -top-1">{waitingCount}</span>}
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
