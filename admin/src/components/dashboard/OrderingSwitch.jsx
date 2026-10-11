import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { setOrderingOpen } from "../../services/settingsService";
import { queryClient } from "../../lib/queryClient";
import Switch from "../ui/Switch";
import ConfirmDialog from "../ui/ConfirmDialog";
import toast from "react-hot-toast";

export default function OrderingSwitch({ isOpen }) {
  const [confirmClose, setConfirmClose] = useState(false);

  const mutation = useMutation({
    mutationFn: (open) => setOrderingOpen(open),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => toast.error("Couldn't update. Please try again."),
  });

  function handleToggle(on) {
    if (!on) {
      setConfirmClose(true);
    } else {
      mutation.mutate(true);
    }
  }

  return (
    <>
      <div className="card flex items-center justify-between gap-4">
        <div>
          <p className="font-bold">Accepting orders</p>
          <p className="text-sm text-ink/60">
            {isOpen
              ? "Phones can place orders."
              : "Ordering is off. Phones can still browse."}
          </p>
        </div>
        <Switch
          checked={isOpen}
          onChange={handleToggle}
          disabled={mutation.isPending}
          label=""
        />
      </div>

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => {
          mutation.mutate(false);
          setConfirmClose(false);
        }}
        title="Stop accepting orders?"
        message="Phones can still browse the menu, but can't place orders."
        confirmLabel="Turn off"
        danger
      />
    </>
  );
}
