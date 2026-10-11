import { NavLink } from "react-router-dom";
import { NAV } from "./nav";
import AccountMenu from "./AccountMenu";
import OrderingSwitch, { OrderingPill } from "../dashboard/OrderingSwitch";

function Brand({ compact }) {
  return (
    <NavLink to="/dashboard" className="flex items-center gap-2.5 rounded-[12px]" aria-label="MOBA Admin, dashboard">
      <img src="/logo-mark.webp" alt="" width="40" height="40" className="h-10 w-10 object-contain" />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-title font-extrabold tracking-[-0.01em]">MOBA</span>
          <span className="block text-cap text-ink-3">
            Admin · <span lang="ko">모바</span>
          </span>
        </span>
      )}
    </NavLink>
  );
}

// Full sidebar from 1024px; an icon rail from 768px; phones use the bottom bar instead.
export default function Sidebar({ waitingCount, orderingOpen, loading }) {
  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[236px] flex-col border-r border-line bg-surface">
        <div className="px-5 pt-5 pb-6">
          <Brand />
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-[10px] px-3 text-body font-semibold transition-colors ${
                  isActive ? "bg-lemon text-ink shadow-[0_1px_2px_rgb(107_91_0/0.14)]" : "text-ink-2 hover:bg-hover hover:text-ink"
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              <span className="flex-1">{label}</span>
              {badge && waitingCount > 0 && (
                <span className="badge" aria-label={`${waitingCount} waiting`}>{waitingCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-line p-3">
          <OrderingSwitch isOpen={orderingOpen} loading={loading} />
          <AccountMenu />
        </div>
      </aside>

      <aside className="hidden md:flex lg:hidden fixed inset-y-0 left-0 z-40 w-[84px] flex-col items-center border-r border-line bg-surface py-4">
        <Brand compact />
        <nav aria-label="Main" className="mt-6 flex flex-1 flex-col items-center gap-1.5">
          {NAV.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                `relative flex w-[68px] flex-col items-center gap-1 rounded-[12px] py-2 text-[11px] font-semibold transition-colors ${
                  isActive ? "bg-lemon text-ink" : "text-ink-2 hover:bg-hover hover:text-ink"
                }`
              }
            >
              <Icon size={20} />
              {label}
              {badge && waitingCount > 0 && <span className="badge absolute right-1.5 top-1">{waitingCount}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col items-center gap-2">
          <OrderingPill isOpen={orderingOpen} loading={loading} iconOnly />
          <AccountMenu compact />
        </div>
      </aside>
    </>
  );
}
