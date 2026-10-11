import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { getAddons, createAddon, updateAddon, deleteAddon, setAddonAvailable } from "../services/addonService";
import { getCategories } from "../services/categoryService";
import { queryClient } from "../lib/queryClient";
import { errorMessage } from "../lib/errors";
import { rupee } from "../lib/format";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Switch from "../components/ui/Switch";
import DietMark from "../components/ui/DietMark";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  price: z.coerce.number().int("Price must be a whole number").min(0).max(10000),
  diet: z.enum(["", "veg", "nonveg", "egg", "both"]),
  badge: z.string().max(24, "Badge is over 24 characters"),
  is_available: z.boolean(),
  category_ids: z.array(z.string()),
});

export default function AddonsPage() {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const addons = useQuery({ queryKey: ["addons"], queryFn: getAddons });
  const cats = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["addons"] });
    queryClient.invalidateQueries({ queryKey: ["category"] });
  };
  const toggle = useMutation({
    mutationFn: ({ id, v }) => setAddonAvailable(id, v),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = useMutation({
    mutationFn: (id) => deleteAddon(id),
    onSuccess: () => { refresh(); toast.success("Add-on deleted."); setDeleting(null); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const catName = (id) => cats.data?.find((c) => c.id === id)?.name;
  const offeredIn = (a) => (a.category_addons || []).map((x) => catName(x.category_id)).filter(Boolean);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl mb-4">Menu</h1>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <Tab label="Categories" onClick={() => navigate("/menu")} />
        <Tab label="Choices" onClick={() => navigate("/menu/choices")} />
        <Tab label="Add-ons" active />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">Add-ons</h2>
        <button className="btn-primary text-sm" onClick={() => setEditing({})}><Plus size={16} /> Add add-on</button>
      </div>

      {addons.isLoading || cats.isLoading ? <Skeleton className="h-20" count={4} />
        : addons.error ? <ErrorState message={addons.error.message} onRetry={addons.refetch} />
        : !addons.data?.length ? (
          <EmptyState title="No add-ons yet" message="Add-ons are optional extras, like a fried egg." action="Add add-on" onAction={() => setEditing({})} />
        ) : (
          <div className="space-y-2">
            {addons.data.map((a) => {
              const where = offeredIn(a);
              return (
                <div key={a.id} className="card flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm flex items-center gap-2">
                      <DietMark diet={a.diet} />{a.name}
                      {a.badge && <span className="text-[11px] bg-lemon px-2 rounded-full">{a.badge}</span>}
                    </p>
                    <p className="text-xs text-ink/50">+{rupee(a.price)} · Offered in: {where.length ? where.join(", ") : "no categories"}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <Switch checked={a.is_available} onChange={(v) => toggle.mutate({ id: a.id, v })} label="" />
                    <span className="text-[10px] text-ink/50">{a.is_available ? "Available" : "Out today"}</span>
                  </div>
                  <button className="p-2 rounded hover:bg-ink/6" aria-label={`Edit ${a.name}`} onClick={() => setEditing(a)}><Pencil size={16} /></button>
                  <button className="p-2 rounded hover:bg-ink/6 text-nonveg" aria-label={`Delete ${a.name}`} onClick={() => setDeleting(a)}><Trash2 size={16} /></button>
                </div>
              );
            })}
          </div>
        )}

      {editing && <AddonModal addon={editing} categories={cats.data || []} onClose={() => setEditing(null)} onSaved={() => { refresh(); setEditing(null); }} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => del.mutate(deleting.id)}
        title={`Delete ${deleting?.name}?`} confirmLabel="Delete" danger loading={del.isPending}
        message={deleting && offeredIn(deleting).length ? `It will no longer be offered in: ${offeredIn(deleting).join(", ")}.` : "This can't be undone."} />
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border-2 ${active ? "border-cobalt bg-cobalt text-white" : "border-line bg-paper text-ink/60 hover:border-cobalt"}`}>{label}</button>
  );
}

function AddonModal({ addon, categories, onClose, onSaved }) {
  const isNew = !addon.id;
  const [errors, setErrors] = useState({});
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { name: "", price: 0, diet: "", badge: "", is_available: true, category_ids: [] },
  });

  useEffect(() => {
    if (isNew) return;
    reset({
      name: addon.name, price: addon.price, diet: addon.diet || "", badge: addon.badge || "", is_available: addon.is_available,
      category_ids: (addon.category_addons || []).map((x) => x.category_id),
    });
  }, [addon, isNew, reset]);

  const save = useMutation({
    mutationFn: (v) => (isNew ? createAddon(v) : updateAddon(addon.id, v)),
    onSuccess: () => { toast.success("Add-on saved."); onSaved(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const onSubmit = handleSubmit((values) => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const map = {};
      for (const i of parsed.error.issues) map[i.path.join(".")] = i.message;
      setErrors(map);
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setErrors({});
    const v = parsed.data;
    save.mutate({ name: v.name, price: v.price, diet: v.diet || null, badge: v.badge || null, is_available: v.is_available, category_ids: v.category_ids });
  });

  const input = "mt-1 block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none";
  const err = (k) => errors[k] && <p className="text-xs text-nonveg mt-1">{errors[k]}</p>;

  return (
    <Modal open onClose={onClose} title={isNew ? "New add-on" : "Edit add-on"}>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block"><span className="text-sm font-semibold">Name</span>
          <input className={input} maxLength={60} {...register("name")} />{err("name")}</label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-sm font-semibold">Price (₹)</span>
            <input type="number" min={0} className={input} {...register("price")} />{err("price")}</label>
          <label className="block"><span className="text-sm font-semibold">Diet</span>
            <select className={input} {...register("diet")}>
              <option value="">Not marked</option><option value="veg">Veg</option><option value="nonveg">Non-veg</option><option value="egg">Contains egg</option><option value="both">Veg or non-veg</option>
            </select></label>
        </div>
        <label className="block"><span className="text-sm font-semibold">Badge</span>
          <input className={input} maxLength={24} {...register("badge")} />{err("badge")}</label>
        <Switch checked={watch("is_available")} onChange={(v) => setValue("is_available", v, { shouldDirty: true })} label="Available" />
        <div>
          <span className="text-sm font-semibold">Offered in</span>
          <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-3 min-h-[40px] cursor-pointer">
                <input type="checkbox" value={c.id} className="w-5 h-5 accent-cobalt" {...register("category_ids")} />
                <span className="text-sm">{c.name}</span>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={save.isPending} className="btn-primary w-full">{save.isPending ? "Saving…" : "Save add-on"}</button>
      </form>
    </Modal>
  );
}
