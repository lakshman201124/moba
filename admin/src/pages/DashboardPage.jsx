import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../services/dashboardService";
import { useWakeLock } from "../hooks/useWakeLock";
import {
  isSoundEnabled,
  setSoundEnabled,
  unlockAudio,
} from "../hooks/useLiveOrders";
import { useState } from "react";
import OrderingSwitch from "../components/dashboard/OrderingSwitch";
import StatsRow from "../components/dashboard/StatsRow";
import WaitingList from "../components/dashboard/WaitingList";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import { Volume2, VolumeX } from "lucide-react";

export default function DashboardPage() {
  useWakeLock();
  const [sound, setSound] = useState(isSoundEnabled());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 60000,
  });

  function toggleSound() {
    const on = !sound;
    setSoundEnabled(on);
    setSound(on);
    if (on) unlockAudio();
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Dashboard</h1>
        <button
          onClick={toggleSound}
          className="btn-ghost text-sm gap-1"
          aria-label={sound ? "Mute notifications" : "Enable sound"}
        >
          {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          {sound ? "Sound on" : "Sound off"}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Skeleton className="h-20" count={4} />
          </div>
          <Skeleton className="h-16" count={3} />
        </div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : (
        <>
          <OrderingSwitch isOpen={data.orderingOpen} />
          <StatsRow data={data} />
          <div>
            <h2 className="font-bold text-lg mb-2">Waiting to be accepted</h2>
            <WaitingList />
          </div>
        </>
      )}
    </div>
  );
}
