import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { getDish, saveDish, deleteDish } from "../services/dishService";
import { getCategories, getCategory } from "../services/categoryService";
import { getChoiceGroups } from "../services/choiceService";
import { queryClient } from "../lib/queryClient";
import { errorMessage } from "../lib/errors";
import { isUuid } from "../lib/ids";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ImageUpload from "../components/ui/ImageUpload";
import Switch from "../components/ui/Switch";
import NotFoundPage from "./NotFoundPage";

const DIETS = [["", "Not marked"], ["veg", "Veg"], ["nonveg", "Non-veg"], ["egg", "Contains egg"], ["both", "Veg or non-veg"]];
const SPICES = ["None", "Mild", "Hot", "Very hot"];

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  category_id: z.string().min(1, "Pick a category"),
  group_id: z.string(),
  description: z.string().max(400, "Description is over 400 characters"),
  note: z.string().max(600, "Good to know is over 600 characters"),
  pricing: z.enum(["single", "sizes"]),
  price: z.coerce.number().int("Price must be a whole number").min(0).max(100000),
  sizes: z.array(z.object({
    id: z.string().optional(),
    label: z.string().trim().min(1, "Each size needs a name").max(40),
    price: z.coerce.number().int("Price must be a whole number").min(0).max(100000),
  })),
  diet: z.enum(["", "veg", "nonveg", "egg", "both"]),
  spice: z.coerce.number().int().min(0).max(3),
  badge: z.string().max(24, "Badge is over 24 characters"),
  image_path: z.string().nullable(),
  choice_group_ids: z.array(z.string()),
  is_available: z.boolean(),
  is_visible: z.boolean(),
}).superRefine((v, ctx) => {
  if (v.pricing === "sizes" && (v.sizes.length < 2 || v.sizes.length > 4)) {
    ctx.addIssue({ code: "custom", path: ["sizes"], message: "Use 2 to 4 sizes, or switch to one price" });
  }
});

export default function DishPage() {
  const { dishId } = useParams();
  const [params] = useSearchParams();
  const isNew = !dishId;
  const presetCat = params.get("category");
  if (!isNew && !isUuid(dishId)) return <NotFoundPage message="This dish doesn't exist." />;
  if (isNew && presetCat && !isUuid(presetCat)) return <NotFoundPage message="That category doesn't exist." />;
  return <DishEditor dishId={dishId} isNew={isNew} presetCat={presetCat} />;
}

function DishEditor({ dishId, isNew, presetCat }) {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dish = useQuery({ queryKey: ["dish", dishId], queryFn: () => getDish(dishId), enabled: !isNew });
  const cats = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const lists = useQuery({ queryKey: ["choice-groups"], queryFn: getChoiceGroups });

  const { register, control, handleSubmit, reset, watch, setValue, formState: { isDirty } } = useForm({
    defaultValues: {
      name: "", category_id: presetCat || "", group_id: "", description: "", note: "", pricing: "single", price: 0,
      sizes: [], diet: "", spice: 0, badge: "", image_path: null, choice_group_ids: [], is_available: true, is_visible: true,
    },
  });
  const sizes = useFieldArray({ control, name: "sizes" });

  const categoryId = watch("category_id");
  const catDetail = useQuery({
    queryKey: ["category", categoryId], queryFn: () => getCategory(categoryId), enabled: isUuid(categoryId),
  });
  const subSections = catDetail.data?.category_groups || [];

  useEffect(() => {
    if (!dish.data) return;
    const d = dish.data;
    const ds = d.dish_sizes || [];
    reset({
      name: d.name, category_id: d.category_id, group_id: d.group_id || "", description: d.description || "", note: d.note || "",
      pricing: ds.length ? "sizes" : "single", price: d.price,
      sizes: ds.map((s) => ({ id: s.id, label: s.label, price: s.price })),
      diet: d.diet || "", spice: d.spice, badge: d.badge || "", image_path: d.image_path,
      choice_group_ids: [...(d.dish_choice_groups || [])].sort((a, b) => a.sort_order - b.sort_order).map((x) => x.group_id),
      is_available: d.is_available, is_visible: d.is_visible,
    });
  }, [dish.data, reset]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const save = useMutation({
    mutationFn: saveDish,
    onSuccess: (id) => {
      ["dishes", "dish", "categories", "choice-groups"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      toast.success("Dish saved.");
      reset({}, { keepValues: true });
      if (isNew) navigate(`/menu/dishes/${id}`, { replace: true });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const del = useMutation({
    mutationFn: () => deleteDish(dishId),
    onSuccess: () => {
      ["dishes", "categories"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      toast.success("Dish deleted.");
      navigate(`/menu/categories/${dish.data.category_id}`, { replace: true });
    },
    onError: (err) => toast.error(errorMessage(err)),
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
    save.mutate({
      id: isNew ? null : dishId,
      category_id: v.category_id,
      group_id: v.group_id || null,
      name: v.name,
      description: v.description || null,
      note: v.note || null,
      price: v.pricing === "sizes" ? Math.min(...v.sizes.map((s) => s.price)) : v.price,
      sizes: v.pricing === "sizes" ? v.sizes.map((s) => ({ id: s.id || null, label: s.label, price: s.price })) : [],
      diet: v.diet || null,
      spice: v.spice,
      badge: v.badge || null,
      image_path: v.image_path,
      choice_group_ids: v.choice_group_ids,
      is_available: v.is_available,
      is_visible: v.is_visible,
    });
  });

  if (!isNew && dish.isLoading) return <div className="p-4 md:p-6 max-w-3xl mx-auto"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-96" /></div>;
  if (!isNew && dish.error) {
    return dish.error.code === "PGRST116"
      ? <NotFoundPage message="This dish doesn't exist or was deleted." />
      : <ErrorState message={dish.error.message} onRetry={dish.refetch} />;
  }
  if (cats.error) return <ErrorState message={cats.error.message} onRetry={cats.refetch} />;

  const pricing = watch("pricing");
  const picked = watch("choice_group_ids") || [];
  const allLists = lists.data || [];
  const available = allLists.filter((l) => !picked.includes(l.id));
  const rule = (l) => (l.min_select === 0 ? `Optional, up to ${l.max_select}` : l.min_select === l.max_select ? `Pick ${l.min_select}` : `Pick ${l.min_select}–${l.max_select}`);
  const setPicked = (ids) => setValue("choice_group_ids", ids, { shouldDirty: true });
  const input = "mt-1 block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none";
  const err = (k) => errors[k] && <p className="text-xs text-nonveg mt-1">{errors[k]}</p>;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <button onClick={() => navigate(categoryId && isUuid(categoryId) ? `/menu/categories/${categoryId}` : "/menu")} className="btn-ghost text-sm -ml-3">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="font-display text-2xl">{isNew ? "New dish" : watch("name") || "Dish"}</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="card space-y-3">
          <ImageUpload folder="dishes" value={watch("image_path")} onChange={(p) => setValue("image_path", p, { shouldDirty: true })} />
          <label className="block"><span className="text-sm font-semibold">Name</span>
            <input className={input} maxLength={80} {...register("name")} />{err("name")}</label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-sm font-semibold">Category</span>
              <select className={input} {...register("category_id", { onChange: () => setValue("group_id", "") })}>
                <option value="">Choose…</option>
                {(cats.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>{err("category_id")}</label>
            <label className="block"><span className="text-sm font-semibold">Sub-section</span>
              <select className={input} disabled={!subSections.length} {...register("group_id")}>
                <option value="">None</option>
                {subSections.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select></label>
          </div>
          <label className="block"><span className="text-sm font-semibold">Description</span>
            <textarea className={input} rows={2} maxLength={400} {...register("description")} />{err("description")}</label>
          <label className="block"><span className="text-sm font-semibold">Good to know</span>
            <textarea className={input} rows={2} maxLength={600} {...register("note")} />{err("note")}</label>
        </div>

        <div className="card space-y-3">
          <h2 className="font-bold">Price</h2>
          <div className="flex gap-2">
            {[["single", "One price"], ["sizes", "Sizes"]].map(([k, l]) => (
              <button type="button" key={k}
                onClick={() => { setValue("pricing", k, { shouldDirty: true }); if (k === "sizes" && sizes.fields.length < 2) { sizes.replace([{ label: "Small", price: watch("price") || 0 }, { label: "Large", price: 0 }]); } }}
                className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${pricing === k ? "border-cobalt bg-cobalt text-white" : "border-line"}`}>{l}</button>
            ))}
          </div>
          {pricing === "single" ? (
            <label className="block"><span className="text-sm font-semibold">Price (₹)</span>
              <input type="number" min={0} className={input} {...register("price")} />{err("price")}</label>
          ) : (
            <div className="space-y-2">
              {sizes.fields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-2">
                  <input className={input} placeholder="Size name" maxLength={40} {...register(`sizes.${i}.label`)} />
                  <input type="number" min={0} className={`${input} max-w-[110px]`} placeholder="₹" {...register(`sizes.${i}.price`)} />
                  <button type="button" className="p-2 rounded hover:bg-ink/6 disabled:opacity-20" disabled={i === 0} onClick={() => sizes.move(i, i - 1)} aria-label="Move up"><ChevronUp size={16} /></button>
                  <button type="button" className="p-2 rounded hover:bg-ink/6 text-nonveg" onClick={() => sizes.remove(i)} aria-label="Remove size"><Trash2 size={16} /></button>
                </div>
              ))}
              {sizes.fields.length < 4 && <button type="button" className="btn-secondary text-sm" onClick={() => sizes.append({ label: "", price: 0 })}><Plus size={14} /> Add size</button>}
              <p className="text-xs text-ink/50">The menu shows "from" the lowest price.</p>
              {err("sizes")}{err("sizes.0.label")}{err("sizes.0.price")}
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-sm font-semibold">Diet</span>
              <select className={input} {...register("diet")}>{DIETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label className="block"><span className="text-sm font-semibold">Spice</span>
              <select className={input} {...register("spice")}>{SPICES.map((l, i) => <option key={l} value={i}>{l}</option>)}</select></label>
          </div>
          <label className="block"><span className="text-sm font-semibold">Badge</span>
            <input className={input} maxLength={24} {...register("badge")} />
            <span className="text-xs text-ink/50">Dishes with a badge appear in Most loved.</span>{err("badge")}</label>
        </div>

        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Choice lists</h2>
            <Link to="/menu/choices" className="text-sm font-semibold text-cobalt">Manage choice lists</Link>
          </div>
          {!picked.length && <p className="text-sm text-ink/50">None attached.</p>}
          {picked.map((id, i) => {
            const l = allLists.find((x) => x.id === id);
            return (
              <div key={id} className="flex items-center gap-2 border-2 border-line rounded-xl p-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{l?.name || "Unknown list"}</p>
                  {l && <p className="text-xs text-ink/50">{l.label} · {rule(l)}</p>}
                </div>
                <button type="button" className="p-2 rounded hover:bg-ink/6 disabled:opacity-20" disabled={i === 0}
                  onClick={() => { const n = [...picked]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setPicked(n); }} aria-label="Move up"><ChevronUp size={16} /></button>
                <button type="button" className="p-2 rounded hover:bg-ink/6 disabled:opacity-20" disabled={i === picked.length - 1}
                  onClick={() => { const n = [...picked]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setPicked(n); }} aria-label="Move down"><ChevronDown size={16} /></button>
                <button type="button" className="p-2 rounded hover:bg-ink/6 text-nonveg" onClick={() => setPicked(picked.filter((x) => x !== id))} aria-label="Remove list"><Trash2 size={16} /></button>
              </div>
            );
          })}
          {available.length > 0 && (
            <select className={input} value="" onChange={(e) => e.target.value && setPicked([...picked, e.target.value])}>
              <option value="">Add a choice list…</option>
              {available.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
        </div>

        <div className="card space-y-3">
          <Switch checked={watch("is_available")} onChange={(v) => setValue("is_available", v, { shouldDirty: true })} label="Available" />
          <Switch checked={watch("is_visible")} onChange={(v) => setValue("is_visible", v, { shouldDirty: true })} label="Visible on the menu" />
          <p className="text-xs text-ink/50">Sold out keeps it on the menu; hidden removes it.</p>
        </div>

        <div className="sticky bottom-20 md:bottom-4 z-10">
          <button type="submit" disabled={save.isPending} className="btn-primary w-full">{save.isPending ? "Saving…" : isNew ? "Create dish" : "Save changes"}</button>
        </div>
      </form>

      {!isNew && (
        <div className="card border-nonveg/30">
          <h2 className="font-bold text-nonveg mb-2">Delete dish</h2>
          <p className="text-sm text-ink/60 mb-3">Past orders keep their copy. Consider hiding it instead.</p>
          <button type="button" className="btn-danger text-sm" onClick={() => setConfirmDelete(true)}>Delete dish</button>
        </div>
      )}
      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => del.mutate()}
        title="Delete this dish?" message="This can't be undone. Past orders keep their copy." confirmLabel="Delete" danger loading={del.isPending} />
    </div>
  );
}
