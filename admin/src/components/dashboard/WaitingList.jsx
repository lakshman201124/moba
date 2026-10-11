import { useQuery, useMutation } from "@tanstack/react-query";
import { getWaitingOrders, setOrderStatus } from "../../services/orderService";
import { queryClient } from "../../lib/queryClient";
import { tableLabel, relativeTime, rupee, plural } from "../../lib/format";
import { errorMessage } from "../../lib/errors";
import Skeleton from "../ui/Skeleton";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function WaitingList() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["waiting-orders"],
    queryFn: getWaitingOrders,
    refetchInterval: 30000,
  });

  const accept = useMutation({
    mutationFn: (id) =>
      setOrderStatus(id, "placed", "preparing"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiting-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["tables-overview"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isLoading) return <Skeleton className="h-20" count={3} />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data?.length)
    return (
      <EmptyState
        title="All caught up"
        message="New orders show up here."
      />
    );

  return (
    <div className="space-y-2">
      {data.map((o) => (
        <div key={o.id} className="card flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">
              {tableLabel(o.table?.label)} · Guest {o.guest_no} · #{o.order_no}
            </p>
            <p className="text-xs text-ink/50">
              {relativeTime(o.created_at)} · {plural(o.item_count, "item", "items")} · {rupee(o.total)}
            </p>
          </div>
          <button
            onClick={() => accept.mutate(o.id)}
            disabled={accept.isPending}
            className="btn-primary text-sm py-2 px-4"
          >
            Accept
          </button>
          <button
            onClick={() => navigate(`/orders/${o.table?.id}`)}
            className="btn-ghost text-sm py-2 px-3"
          >
            Open
          </button>
        </div>
      ))}
    </div>
  );
}
