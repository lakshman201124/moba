import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, MoreHorizontal, Search, CirclePlus } from "lucide-react";
import { getAddons, deleteAddon } from "../services/addonService";
import { getCategories } from "../services/categoryService";
import { errorMessage } from "../lib/errors";
import { rupee } from "../lib/format";
import PageHeader from "../components/ui/PageHeader";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Switch from "../components/ui/Switch";
import DietMark from "../components/ui/DietMark";
import Menu, { MenuItem, MenuSeparator } from "../components/ui/Menu";
import { Segmented } from "../components/ui/Segmented";
import MenuTabs from "../components/menu/MenuTabs";
import AddonModal from "../components/menu/AddonModal";
import { useAddonAvailability } from "../components/menu/AddonsTab";
import { invalidateMenu } from "../components/menu/menuQueries";

export default function AddonsPage() {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState("all");

  const addons = useQuery({ queryKey: ["addons"], queryFn: getAddons });
  const cats = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const avail = useAddonAvailability();
  const del = useMutation({
    mutationFn: (a) => deleteAddon(a.id),
    onSuccess: (_d, a) => {
      invalidateMenu("addons", "category");
      toast.success(`${a.name} deleted.`);
      setDeleting(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const catById = useMemo(() => Object.fromEntries((cats.data || []).map((c) => [c.id, c])), [cats.data]);
  const offeredIn = (a) => (a.category_addons || []).map((x) => catById[x.category_id]).filter(Boolean);
  const list = addons.data || [];
  const t = term.trim().toLowerCase();
  const shown = list.filter(
    (a) =>
      (filter === "all" || (filter === "out" ? !a.is_available : !(a.category_addons || []).length)) &&
      (!t || a.name.toLowerCase().includes(t)),
  );
  const outCount = list.filter((a) => !a.is_available).length;
  const unusedCount = list.filter((a) => !(a.category_addons || []).length).length;
  const loading = addons.isLoading || cats.isLoading;

  return (
    <>
      <PageHeader
        title="Menu"
        subtitle="Every add-on across the menu. Edit a price or mark one out for today in one place."
        actions={<MenuTabs active="addons" showAdd={false} />}
      />

      <section className="panel overflow-hidden" aria-labelledby="addons-title">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-4">
          <h2 id="addons-title" className="panel-title mr-2">
            Add-ons <span className="text-ink-3 font-semibold tnum">{loading ? "" : list.length}</span>
          </h2>
          <Segmented
            size="sm"
            plain
            label="Show"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "out", label: "Out today", count: outCount },
              { value: "unused", label: "Not offered", count: unusedCount },
            ]}
          />
          <label className="relative ml-auto w-full sm:w-56">
            <span className="sr-only">Search add-ons</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search add-ons" className="input pl-9" />
          </label>
          <button className="btn btn-primary" onClick={() => setEditing({})}>
            <Plus size={16} /> New add-on
          </button>
        </div>

        {addons.error ? (
          <ErrorState message={errorMessage(addons.error)} onRetry={addons.refetch} />
        ) : loading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-14" />)}</div>
        ) : !list.length ? (
          <EmptyState icon={CirclePlus} title="No add-ons yet" message="Add-ons are extras guests tick on a dish, like a fried egg or extra cheese." action="New add-on" actionIcon={Plus} onAction={() => setEditing({})} />
        ) : !shown.length ? (
          <p className="px-5 py-10 text-center text-body text-ink-2">Nothing matches.</p>
        ) : (
          <ul className="divide-line">
            {shown.map((a) => {
              const where = offeredIn(a);
              return (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-sunken">
                  <DietMark diet={a.diet} size={13} slot />
                  <button onClick={() => setEditing(a)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-1.5">
                      <span className={`truncate text-body font-semibold ${a.is_available ? "" : "text-ink-2 line-through decoration-ink-3/60"}`}>{a.name}</span>
                      {a.badge && <span className="chip chip-lemon !h-5 !px-1.5 !text-[10px] capitalize">{a.badge}</span>}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {where.length ? (
                        where.map((c) => (
                          <span key={c.id} className="inline-flex h-5 items-center rounded-full bg-hover px-2 text-[11px] font-semibold text-ink-2">
                            {c.short_name || c.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-cap text-orange-ink font-semibold">Not offered in any category</span>
                      )}
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
                    trigger={(p) => (
                      <button {...p} className="btn btn-ghost btn-icon btn-sm">
                        <MoreHorizontal size={17} />
                      </button>
                    )}
                  >
                    <MenuItem icon={Pencil} onSelect={() => setEditing(a)}>Edit add-on</MenuItem>
                    <MenuSeparator />
                    <MenuItem icon={Trash2} danger onSelect={() => setDeleting(a)}>Delete</MenuItem>
                  </Menu>
                </li>
              );
            })}
          </ul>
        )}
        <p className="border-t border-line px-5 py-3 text-meta text-ink-3">
          To choose which add-ons a category offers, open the category in{" "}
          <Link to="/menu" className="font-semibold text-cobalt-ink hover:underline underline-offset-2">Categories</Link> and use its Add-ons tab.
        </p>
      </section>

      {editing && <AddonModal addon={editing} categories={cats.data || []} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => del.mutate(deleting)}
        title={`Delete ${deleting?.name}?`}
        confirmLabel="Delete add-on"
        danger
        loading={del.isPending}
        message={
          deleting && offeredIn(deleting).length
            ? `It disappears from ${offeredIn(deleting).map((c) => c.name).join(", ")}. To pause it for today, mark it out of stock instead.`
            : "This can't be undone."
        }
      />
    </>
  );
}
