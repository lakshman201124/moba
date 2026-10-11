import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, MoreHorizontal, Pencil, Unlink, Link2, Search, CirclePlus, ArrowRight } from "lucide-react";
import { getAddons, setAddonAvailable, linkAddon, unlinkAddon } from "../../services/addonService";
import { queryClient } from "../../lib/queryClient";
import { errorMessage } from "../../lib/errors";
import { rupee } from "../../lib/format";
import DietMark from "../ui/DietMark";
import Switch from "../ui/Switch";
import Menu, { MenuItem, MenuSeparator } from "../ui/Menu";
import Modal from "../ui/Modal";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import AddonModal from "./AddonModal";
import { invalidateMenu } from "./menuQueries";

export function useAddonAvailability() {
  return useMutation({
    mutationFn: ({ id, v }) => setAddonAvailable(id, v),
    onMutate: async ({ id, v }) => {
      await queryClient.cancelQueries({ queryKey: ["addons"] });
      const before = queryClient.getQueryData(["addons"]);
      queryClient.setQueryData(["addons"], (list) => list?.map((a) => (a.id === id ? { ...a, is_available: v } : a)));
      return { before };
    },
    onSuccess: (_d, { v, name }) => toast.success(v ? `${name} is back in stock.` : `${name} marked out for today.`, { id: `addon-${name}` }),
    onError: (e, _v, ctx) => {
      if (ctx?.before) queryClient.setQueryData(["addons"], ctx.before);
      toast.error(errorMessage(e));
    },
    onSettled: () => invalidateMenu("addons"),
  });
}

function AttachModal({ category, candidates, catName, onClose }) {
  const [term, setTerm] = useState("");
  const [picked, setPicked] = useState([]);
  const attach = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) await linkAddon(category.id, id);
    },
    onSuccess: (_d, ids) => {
      toast.success(`${ids.length === 1 ? "1 add-on" : `${ids.length} add-ons`} now offered in ${category.name}.`);
      invalidateMenu("addons", "category");
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const t = term.trim().toLowerCase();
  const list = candidates.filter((a) => !t || a.name.toLowerCase().includes(t));
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Modal
      open
      onClose={onClose}
      title={`Offer add-ons in ${category.name}`}
      description="Pick add-ons you've already made. Their price and stock stay shared with other categories."
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={() => attach.mutate(picked)} disabled={!picked.length || attach.isPending} className="btn btn-primary">
            {attach.isPending ? "Adding…" : picked.length ? `Offer ${picked.length}` : "Offer add-ons"}
          </button>
        </>
      }
    >
      <label className="relative block">
        <span className="sr-only">Search add-ons</span>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search add-ons" className="input pl-9" data-autofocus />
      </label>
      <div className="mt-3 max-h-[320px] overflow-y-auto rounded-[12px] border border-line divide-line">
        {!list.length ? (
          <p className="px-4 py-6 text-center text-meta text-ink-3">{candidates.length ? "No add-on matches." : `Every add-on is already offered in ${category.name}.`}</p>
        ) : (
          list.map((a) => {
            const where = (a.category_addons || []).map((x) => catName(x.category_id)).filter(Boolean);
            return (
              <label key={a.id} className="flex min-h-[52px] cursor-pointer items-center gap-3 px-3 py-2 hover:bg-sunken">
                <input type="checkbox" checked={picked.includes(a.id)} onChange={() => toggle(a.id)} className="h-4.5 w-4.5 accent-[var(--color-cobalt)]" />
                <DietMark diet={a.diet} size={12} slot />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold">{a.name}</span>
                  <span className="block truncate text-cap text-ink-3">{where.length ? `In ${where.join(", ")}` : "Not offered anywhere yet"}</span>
                </span>
                <span className="text-body font-semibold tnum">+{rupee(a.price)}</span>
              </label>
            );
          })
        )}
      </div>
    </Modal>
  );
}

export default function AddonsTab({ category, categories }) {
  const [editing, setEditing] = useState(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const q = useQuery({ queryKey: ["addons"], queryFn: getAddons });
  const avail = useAddonAvailability();
  const unlink = useMutation({
    mutationFn: (a) => unlinkAddon(category.id, a.id),
    onSuccess: (_d, a) => {
      toast.success(`${a.name} removed from ${category.name}.`);
      invalidateMenu("addons", "category");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const catName = (id) => categories.find((c) => c.id === id)?.name;
  const all = q.data || [];
  const order = (category.category_addons || []).map((x) => x.addon_id);
  const linked = all
    .filter((a) => (a.category_addons || []).some((x) => x.category_id === category.id))
    .sort((a, b) => (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999));
  const candidates = all.filter((a) => !linked.some((l) => l.id === a.id));

  if (q.error) return <ErrorState message={errorMessage(q.error)} onRetry={q.refetch} compact />;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-5 py-4">
        <p className="mr-auto min-w-[220px] flex-1 text-meta text-ink-2">
          Extras guests can add to <span className="font-semibold text-ink">any dish in {category.name}</span>. One add-on can be offered in several
          categories; its price and stock are shared.
        </p>
        <button onClick={() => setAttachOpen(true)} className="btn btn-secondary" disabled={q.isLoading}>
          <Link2 size={16} /> Offer existing
        </button>
        <button onClick={() => setEditing({})} className="btn btn-primary">
          <Plus size={16} /> New add-on
        </button>
      </div>

      {q.isLoading ? (
        <div className="space-y-2 px-5 pb-5">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-[60px]" />)}</div>
      ) : !linked.length ? (
        <EmptyState
          icon={CirclePlus}
          title={`No add-ons in ${category.name}`}
          message="Add extras like a fried egg, extra cheese or a drink to make it a meal."
          action="New add-on"
          actionIcon={Plus}
          onAction={() => setEditing({})}
        />
      ) : (
        <ul className="divide-line border-t border-line">
          {linked.map((a) => {
            const others = (a.category_addons || []).map((x) => x.category_id).filter((id) => id !== category.id).map(catName).filter(Boolean);
            return (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-sunken">
                <DietMark diet={a.diet} size={13} slot />
                <button onClick={() => setEditing(a)} className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-1.5">
                    <span className={`truncate text-body font-semibold ${a.is_available ? "" : "text-ink-2 line-through decoration-ink-3/60"}`}>{a.name}</span>
                    {a.badge && <span className="chip chip-lemon !h-5 !px-1.5 !text-[10px] capitalize">{a.badge}</span>}
                  </span>
                  <span className="block truncate text-cap text-ink-3">
                    {others.length ? `Also in ${others.slice(0, 2).join(", ")}${others.length > 2 ? ` +${others.length - 2}` : ""}` : `Only in ${category.name}`}
                  </span>
                </button>
                <p className="w-[72px] text-right text-body font-semibold tnum">+{rupee(a.price)}</p>
                <div className="flex w-[104px] items-center justify-end gap-2">
                  <span className={`hidden md:inline text-cap font-semibold ${a.is_available ? "text-green-ink" : "text-red"}`}>
                    {a.is_available ? "In stock" : "Out today"}
                  </span>
                  <Switch checked={a.is_available} onChange={(v) => avail.mutate({ id: a.id, v, name: a.name })} label={`${a.name} in stock`} hideLabel size="sm" />
                </div>
                <Menu
                  label={`${a.name} actions`}
                  width={230}
                  trigger={(p) => (
                    <button {...p} className="btn btn-ghost btn-icon btn-sm">
                      <MoreHorizontal size={17} />
                    </button>
                  )}
                >
                  <MenuItem icon={Pencil} onSelect={() => setEditing(a)}>Edit add-on</MenuItem>
                  <MenuSeparator />
                  <MenuItem icon={Unlink} danger onSelect={() => unlink.mutate(a)}>Remove from {category.short_name || category.name}</MenuItem>
                </Menu>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-line px-5 py-3">
        <Link to="/menu/addons" className="inline-flex items-center gap-1 text-meta font-semibold text-ink-2 hover:text-ink">
          All add-ons across the menu <ArrowRight size={14} />
        </Link>
      </div>

      {editing && (
        <AddonModal
          addon={editing}
          categories={categories}
          presetCategory={category.id}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}
      {attachOpen && <AttachModal category={category} candidates={candidates} catName={catName} onClose={() => setAttachOpen(false)} />}
    </div>
  );
}
