import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getDashboard } from "../services/dashboardService";
import { getRows } from "../services/analyticsService";
import { getTablesOverview } from "../services/tableService";
import { getAllDishes } from "../services/dishService";
import { RANGES, rangeWindow, toIso, aggregate } from "../lib/analytics";
import { errorMessage } from "../lib/errors";
import { todayLong } from "../lib/format";
import { useWakeLock } from "../hooks/useWakeLock";
import PageHeader from "../components/ui/PageHeader";
import ErrorState from "../components/ui/ErrorState";
import RangeSelect from "../components/dashboard/RangeSelect";
import { SoundToggle } from "../components/layout/AccountMenu";
import StatsRow from "../components/dashboard/StatsRow";
import RevenueChart from "../components/dashboard/RevenueChart";
import StatusDonut from "../components/dashboard/StatusDonut";
import TopDishes from "../components/dashboard/TopDishes";
import TableStatusGrid from "../components/dashboard/TableStatusGrid";
import WaitingList from "../components/dashboard/WaitingList";

export default function DashboardPage() {
  useWakeLock();
  const [params, setParams] = useSearchParams();
  const rangeKey = RANGES.some((r) => r.key === params.get("range")) ? params.get("range") : "today";
  const range = RANGES.find((r) => r.key === rangeKey);

  const stats = useQuery({
    queryKey: ["analytics", rangeKey],
    queryFn: async () => {
      const w = rangeWindow(rangeKey);
      return aggregate(w, await getRows(toIso(w)));
    },
    placeholderData: keepPreviousData,
    refetchInterval: rangeKey === "today" ? 60000 : false,
  });
  const live = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard, refetchInterval: 60000 });
  const tables = useQuery({ queryKey: ["tables-overview"], queryFn: getTablesOverview, refetchInterval: 60000 });
  const dishes = useQuery({ queryKey: ["dishes-all"], queryFn: getAllDishes, staleTime: 5 * 60000 });

  const images = useMemo(
    () => Object.fromEntries((dishes.data || []).map((d) => [d.id, d.image_path])),
    [dishes.data],
  );

  const setRange = (key) => {
    const next = new URLSearchParams(params);
    if (key === "today") next.delete("range");
    else next.set("range", key);
    setParams(next, { replace: true });
  };

  const loading = stats.isLoading;
  const fetching = stats.isFetching && stats.isPlaceholderData;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            {todayLong()}
            <span className="inline-flex items-center gap-1.5 text-green-ink font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-green" aria-hidden="true" /> Live
            </span>
          </span>
        }
        actions={
          <>
            <span className="hidden md:inline-flex"><SoundToggle /></span>
            <RangeSelect value={rangeKey} onChange={setRange} />
          </>
        }
      />

      {stats.error ? (
        <div className="panel mb-4">
          <ErrorState message={errorMessage(stats.error)} onRetry={stats.refetch} compact />
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-3 md:gap-4">
        <div className="col-span-12">
          <StatsRow
            stats={stats.data}
            loading={loading}
            compare={range.compare}
            live={live.data}
            showLive={rangeKey === "today"}
            tables={tables.data}
            tablesLoading={tables.isLoading}
          />
        </div>

        <div className="col-span-12 order-2 lg:order-none xl:col-span-8">
          <RevenueChart data={stats.data} loading={loading} fetching={fetching} rangeLabel={range.label} />
        </div>
        <div className="col-span-12 order-3 lg:order-none lg:col-span-6 xl:col-span-4">
          <StatusDonut status={stats.data?.status} loading={loading} rangeLabel={range.label} />
        </div>

        <div className="col-span-12 order-1 lg:order-none lg:col-span-6 xl:col-span-4 xl:order-last">
          <WaitingList />
        </div>
        <div className="col-span-12 order-4 lg:order-none lg:col-span-6 xl:col-span-4">
          <TopDishes dishes={stats.data?.topDishes} images={images} loading={loading} rangeLabel={range.label} />
        </div>
        <div className="col-span-12 order-5 lg:order-none lg:col-span-6 xl:col-span-4">
          <TableStatusGrid tables={tables.data} loading={tables.isLoading} />
        </div>
      </div>
    </>
  );
}
