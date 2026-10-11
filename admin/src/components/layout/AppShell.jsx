import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import Sidebar from "./Sidebar";
import BottomNav, { MobileTopBar } from "./BottomNav";
import { useLiveOrders } from "../../hooks/useLiveOrders";
import { getDashboard } from "../../services/dashboardService";
import { isDemo, exitDemo, DEMO_FORCED } from "../../lib/demo";

function PageLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton mt-2 h-4 w-72" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="skeleton h-40 !rounded-[16px]" />
        <div className="skeleton h-40 !rounded-[16px]" />
        <div className="skeleton h-40 !rounded-[16px]" />
      </div>
    </div>
  );
}

function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-[#EEEAA6] bg-lemon-soft px-4 py-2 text-meta text-lemon-ink">
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <FlaskConical size={14} /> Demo mode
      </span>
      <span className="hidden sm:inline">Sample orders and MOBA's real menu, saved only in this browser. Nothing reaches the live restaurant.</span>
      <span className="sm:hidden">Sample data in this browser only.</span>
      {!DEMO_FORCED && (
        <button onClick={exitDemo} className="font-bold underline underline-offset-2 hover:text-ink">
          Leave demo
        </button>
      )}
    </div>
  );
}

export default function AppShell() {
  useLiveOrders();

  const { data: dash, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 60000,
  });

  const waitingCount = dash?.waiting || 0;

  return (
    <div className="min-h-dvh bg-canvas">
      <Sidebar waitingCount={waitingCount} orderingOpen={dash?.orderingOpen} loading={isLoading} />
      <div className="md:pl-[84px] lg:pl-[236px]">
        {isDemo && <DemoBanner />}
        <MobileTopBar orderingOpen={dash?.orderingOpen} loading={isLoading} />
        <main id="main" className="mx-auto w-full max-w-[1560px] px-4 pt-5 pb-28 md:px-6 md:pt-6 md:pb-10 xl:px-8 xl:pt-7">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav waitingCount={waitingCount} />
    </div>
  );
}
