import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import { useLiveOrders } from "../../hooks/useLiveOrders";
import { getDashboard } from "../../services/dashboardService";

export default function AppShell() {
  useLiveOrders();

  const { data: dash } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 60000,
  });

  const waitingCount = dash?.waiting || 0;

  return (
    <div className="min-h-screen bg-cream">
      <Sidebar waitingCount={waitingCount} />
      <main className="md:ml-60 pb-20 md:pb-6 min-h-screen">
        <Outlet />
      </main>
      <BottomNav waitingCount={waitingCount} />
    </div>
  );
}
