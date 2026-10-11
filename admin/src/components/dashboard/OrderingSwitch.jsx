import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Power } from "lucide-react";
import { setOrderingOpen } from "../../services/settingsService";
import { queryClient } from "../../lib/queryClient";
import Switch from "../ui/Switch";
import ConfirmDialog from "../ui/ConfirmDialog";

function useOrdering() {
  const [confirmClose, setConfirmClose] = useState(false);
  const mutation = useMutation({
    mutationFn: (open) => setOrderingOpen(open),
    onMutate: async (open) => {
      await queryClient.cancelQueries({ queryKey: ["dashboard"] });
      const before = queryClient.getQueryData(["dashboard"]);
      if (before) queryClient.setQueryData(["dashboard"], { ...before, orderingOpen: open });
      return { before };
    },
    onError: (_e, _open, ctx) => {
      if (ctx?.before) queryClient.setQueryData(["dashboard"], ctx.before);
      toast.error("Couldn't change ordering. Please try again.");
    },
    onSuccess: (_d, open) => toast.success(open ? "Ordering is on. Phones can order." : "Ordering paused. Phones can still browse."),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
  const toggle = (on) => (on ? mutation.mutate(true) : setConfirmClose(true));
  const dialog = (
    <ConfirmDialog
      open={confirmClose}
      onClose={() => setConfirmClose(false)}
      onConfirm={() => {
        mutation.mutate(false);
        setConfirmClose(false);
      }}
      title="Pause ordering?"
      message="Diners can still browse the menu on their phones, but they can't place orders until you turn this back on."
      confirmLabel="Pause ordering"
      danger
    />
  );
  return { toggle, pending: mutation.isPending, dialog };
}

// The sidebar card: always visible, so nobody wonders why phones stopped ordering.
export default function OrderingSwitch({ isOpen, loading }) {
  const { toggle, pending, dialog } = useOrdering();
  return (
    <>
      <div className={`rounded-[14px] border p-3 transition-colors ${isOpen ? "border-line bg-surface" : "border-[#F1C4BF] bg-red-soft"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-meta font-bold flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-green" : "bg-red"}`} aria-hidden="true" />
              {loading ? "Ordering" : isOpen ? "Taking orders" : "Ordering paused"}
            </p>
            <p className="text-cap text-ink-3 mt-0.5">{isOpen ? "Phones can order" : "Phones can only browse"}</p>
          </div>
          <Switch checked={!!isOpen} onChange={toggle} disabled={pending || loading} label="Accept orders from phones" hideLabel size="sm" />
        </div>
      </div>
      {dialog}
    </>
  );
}

// Compact control for the icon rail and the phone top bar.
export function OrderingPill({ isOpen, loading, iconOnly }) {
  const { toggle, pending, dialog } = useOrdering();
  const label = isOpen ? "Taking orders" : "Ordering paused";
  return (
    <>
      <button
        type="button"
        onClick={() => toggle(!isOpen)}
        disabled={pending || loading}
        title={`${label}. Tap to ${isOpen ? "pause" : "resume"}.`}
        aria-label={`${label}. ${isOpen ? "Pause" : "Resume"} ordering`}
        className={`inline-flex items-center gap-1.5 rounded-full border text-cap font-bold transition-colors ${
          iconOnly ? "h-10 w-10 justify-center" : "h-8 px-3"
        } ${isOpen ? "border-line bg-surface text-green-ink hover:bg-sunken" : "border-[#F1C4BF] bg-red-soft text-red"}`}
      >
        {iconOnly ? <Power size={16} /> : <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-green" : "bg-red"}`} aria-hidden="true" />}
        {!iconOnly && (isOpen ? "Open" : "Paused")}
      </button>
      {dialog}
    </>
  );
}
