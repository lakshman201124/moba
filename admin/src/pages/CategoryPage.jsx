import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { getCategory, saveCategory, deleteCategory } from "../services/categoryService";
import { getAddons } from "../services/addonService";
import { getDishesByCategory, setDishAvailable, setDishVisible, reorderDishes } from "../services/dishService";
import { queryClient } from "../lib/queryClient";
import { errorMessage } from "../lib/errors";
import { isUuid } from "../lib/ids";
import { rupee } from "../lib/format";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ImageUpload from "../components/ui/ImageUpload";
import Switch from "../components/ui/Switch";
import DietMark from "../components/ui/DietMark";
import NotFoundPage from "./NotFoundPage";

const ARTS = ["pot", "soup", "wok", "chicken", "corndog", "dimsum", "gimbap", "noodles", "rice", "burger", "boba", "sundae"];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  short_name: z.string().trim().max(24),
  name_ko: z.string().trim().max(40),
  slug: z.string().regex(SLUG, "Use lowercase letters, numbers and dashes").max(40),
  blurb: z.string().max(400),
  art: z.enum(ARTS),
  image_path: z.string().nullable(),
  is_visible: z.boolean(),
  groups: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().trim().min(1, "Sub-section name is required").max(60),
      name_ko: z.string().max(40),
      lede: z.string().max(300),
      slug: z.string().regex(SLUG, "Bad sub-section link name").max(40),
    }),
  ),
  notes: z.array(
    z.object({
      title: z.string().trim().min(1, "Note title is required").max(80),
      ko: z.string().max(40),
      text: z.string().max(600),
      itemsText: z.string().max(1200),
    }),
  ),
  addon_ids: z.array(z.string()),
});

const toItems = (t) =>
  t.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [a, ...b] = l.split("|");
    return [a.trim(), b.join("|").trim()];
  });

const blank = {
  name: "", short_name: "", name_ko: "", slug: "", blurb: "", art: "pot",
  image_path: null, is_visible: true, groups: [], notes: [], addon_ids: [],
};

export default function CategoryPage() {
  const { categoryId } = useParams();
  const isNew = !categoryId;
  if (!isNew && !isUuid(categoryId)) return <NotFoundPage message="This category doesn't exist." />;
  return <CategoryEditor categoryId={categoryId} isNew={isNew} />;
}

function CategoryEditor({ categoryId, isNew }) {
  const navigate = useNavigate();
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState({});

  const cat = useQuery({ queryKey: ["category", categoryId], queryFn: () => getCategory(categoryId), enabled: !isNew });
  const addons = useQuery({ queryKey: ["addons"], queryFn: getAddons });
  const dishes = useQuery({ queryKey: ["dishes", categoryId], queryFn: () => getDishesByCategory(categoryId), enabled: !isNew });

  const { register, control, handleSubmit, reset, watch, setValue, formState: { isDirty } } = useForm({ defaultValues: blank });
  const groups = useFieldArray({ control, name: "groups" });
  const notes = useFieldArray({ control, name: "notes" });

  useEffect(() => {
    if (!cat.data) return;
    const c = cat.data;
    reset({
      name: c.name, short_name: c.short_name || "", name_ko: c.name_ko || "", slug: c.slug,
      blurb: c.blurb || "", art: c.art, image_path: c.image_path, is_visible: c.is_visible,
      groups: (c.category_groups || []).map((g) => ({ id: g.id, name: g.name, name_ko: g.name_ko || "", lede: g.lede || "", slug: g.slug })),
      notes: (c.notes || []).map((n) => ({
        title: n.title || "", ko: n.ko || "", text: n.text || "",
        itemsText: (n.items || []).map(([a, b]) => `${a} | ${b}`).join("\n"),
      })),
      addon_ids: (c.category_addons || []).map((x) => x.addon_id),
    });
  }, [cat.data, reset]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const name = watch("name");
  useEffect(() => {
    if (!slugTouched) setValue("slug", slugify(name || ""));
  }, [name, slugTouched, setValue]);

  const save = useMutation({
    mutationFn: saveCategory,
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["category", categoryId] });
      toast.success("Category saved.");
      if (isNew) navigate(`/menu/categories/${id}`, { replace: true });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const del = useMutation({
    mutationFn: () => deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted.");
      navigate("/menu", { replace: true });
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
      id: isNew ? null : categoryId,
      slug: v.slug, name: v.name, short_name: v.short_name || null, name_ko: v.name_ko || null,
      blurb: v.blurb || null, art: v.art, image_path: v.image_path, is_visible: v.is_visible,
      groups: v.groups.map((g) => ({ ...g, name_ko: g.name_ko || null, lede: g.lede || null })),
      notes: v.notes.map((n) => {
        const items = toItems(n.itemsText);
        return { title: n.title, ...(n.ko ? { ko: n.ko } : {}), ...(n.text ? { text: n.text } : {}), ...(items.length ? { items } : {}) };
      }),
      addon_ids: v.addon_ids,
    });
  });

  if (!isNew && cat.isLoading) return <div className="p-4 md:p-6 max-w-3xl mx-auto"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-64" /></div>;
  if (!isNew && cat.error) {
    return cat.error.code === "PGRST116"
      ? <NotFoundPage message="This category doesn't exist or was deleted." />
      : <ErrorState message={cat.error.message} onRetry={cat.refetch} />;
  }

  const dishCount = dishes.data?.length ?? 0;
  const input = "mt-1 block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none";
  const err = (k) => errors[k] && <p className="text-xs text-nonveg mt-1">{errors[k]}</p>;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <button onClick={() => navigate("/menu")} className="btn-ghost text-sm -ml-3"><ArrowLeft size={16} /> Menu</button>
      <h1 className="font-display text-2xl">{isNew ? "New category" : watch("name") || "Category"}</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="card space-y-3">
          <h2 className="font-bold">Details</h2>
          <label className="block"><span className="text-sm font-semibold">Name</span>
            <input className={input} maxLength={60} {...register("name")} />{err("name")}</label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-sm font-semibold">Short name</span>
              <input className={input} maxLength={24} placeholder="Shown in the top bar" {...register("short_name")} /></label>
            <label className="block"><span className="text-sm font-semibold">Korean name</span>
              <input className={input} maxLength={40} lang="ko" {...register("name_ko")} /></label>
          </div>
          <label className="block"><span className="text-sm font-semibold">Link name</span>
            <input className={input} maxLength={40} {...register("slug", { onChange: () => setSlugTouched(true) })} />
            <span className="text-xs text-ink/50">Menu links like menu.html#rameyon use this. Changing it breaks old links.</span>{err("slug")}</label>
          <label className="block"><span className="text-sm font-semibold">Blurb</span>
            <textarea className={input} rows={2} maxLength={400} {...register("blurb")} /></label>
          <div>
            <span className="text-sm font-semibold">Icon</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {ARTS.map((a) => (
                <button type="button" key={a} onClick={() => setValue("art", a, { shouldDirty: true })}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 ${watch("art") === a ? "border-cobalt bg-lemon" : "border-line"}`}>{a}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-semibold block mb-1">Cover photo (optional)</span>
            <ImageUpload folder="categories" value={watch("image_path")} onChange={(p) => setValue("image_path", p, { shouldDirty: true })} />
          </div>
          <Switch checked={watch("is_visible")} onChange={(v) => setValue("is_visible", v, { shouldDirty: true })} label="Visible on the menu" />
        </div>

        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Sub-sections</h2>
            <button type="button" className="btn-secondary text-sm" onClick={() => groups.append({ name: "", name_ko: "", lede: "", slug: "" })}><Plus size={14} /> Add</button>
          </div>
          {!groups.fields.length && <p className="text-sm text-ink/50">None. Dishes show in one list.</p>}
          {groups.fields.map((f, i) => (
            <div key={f.id} className="border-2 border-line rounded-xl p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input className={input} placeholder="Name" maxLength={60}
                  {...register(`groups.${i}.name`, { onChange: (e) => { if (!watch(`groups.${i}.id`)) setValue(`groups.${i}.slug`, slugify(e.target.value)); } })} />
                <input className={input} placeholder="Korean" lang="ko" maxLength={40} {...register(`groups.${i}.name_ko`)} />
              </div>
              <input className={input} placeholder="Intro (optional)" maxLength={300} {...register(`groups.${i}.lede`)} />
              <div className="flex items-center gap-2">
                <input className={input} placeholder="link-name" maxLength={40} {...register(`groups.${i}.slug`)} />
                <button type="button" className="p-2 rounded hover:bg-ink/6 disabled:opacity-20" disabled={i === 0} onClick={() => groups.move(i, i - 1)} aria-label="Move up"><ChevronUp size={16} /></button>
                <button type="button" className="p-2 rounded hover:bg-ink/6 disabled:opacity-20" disabled={i === groups.fields.length - 1} onClick={() => groups.move(i, i + 1)} aria-label="Move down"><ChevronDown size={16} /></button>
                <button type="button" className="p-2 rounded hover:bg-ink/6 text-nonveg" onClick={() => groups.remove(i)} aria-label="Remove sub-section"><Trash2 size={16} /></button>
              </div>
              {err(`groups.${i}.name`)}
            </div>
          ))}
          {groups.fields.length > 0 && <p className="text-xs text-ink/50">Removing a sub-section keeps its dishes in the category, without a sub-section.</p>}
        </div>

        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Notes</h2>
            <button type="button" className="btn-secondary text-sm" onClick={() => notes.append({ title: "", ko: "", text: "", itemsText: "" })}><Plus size={14} /> Add</button>
          </div>
          {!notes.fields.length && <p className="text-sm text-ink/50">Notes appear under the dishes, like "Flavour options".</p>}
          {notes.fields.map((f, i) => (
            <div key={f.id} className="border-2 border-line rounded-xl p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input className={input} placeholder="Title" maxLength={80} {...register(`notes.${i}.title`)} />
                <input className={input} placeholder="Korean" lang="ko" maxLength={40} {...register(`notes.${i}.ko`)} />
              </div>
              <textarea className={input} rows={2} placeholder="Text" maxLength={600} {...register(`notes.${i}.text`)} />
              <textarea className={input} rows={3} placeholder={"Optional list, one per line:\nTerm | Description"} maxLength={1200} {...register(`notes.${i}.itemsText`)} />
              <button type="button" className="btn-ghost text-sm text-nonveg" onClick={() => notes.remove(i)}><Trash2 size={14} /> Remove note</button>
              {err(`notes.${i}.title`)}
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="font-bold mb-2">Add-ons offered</h2>
          {addons.isLoading ? <Skeleton className="h-10" /> : !addons.data?.length ? (
            <p className="text-sm text-ink/50">No add-ons yet. Create them in Menu → Add-ons.</p>
          ) : (
            <div className="space-y-1">
              {addons.data.map((a) => (
                <label key={a.id} className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                  <input type="checkbox" value={a.id} className="w-5 h-5 accent-cobalt" {...register("addon_ids")} />
                  <span className="flex-1 text-sm font-semibold">{a.name}</span>
                  <span className="text-sm text-ink/50">+{rupee(a.price)}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-20 md:bottom-4 z-10">
          <button type="submit" disabled={save.isPending} className="btn-primary w-full">{save.isPending ? "Saving…" : isNew ? "Create category" : "Save changes"}</button>
        </div>
      </form>

      {!isNew && <DishSection categoryId={categoryId} query={dishes} navigate={navigate} />}

      {!isNew && (
        <div className="card border-nonveg/30">
          <h2 className="font-bold text-nonveg mb-2">Delete category</h2>
          <p className="text-sm text-ink/60 mb-3">
            {dishCount > 0 ? `Move or delete its ${dishCount} dishes first, or hide the category.` : "Permanently remove this category."}
          </p>
          <button type="button" className="btn-danger text-sm disabled:opacity-40" disabled={dishCount > 0} onClick={() => setConfirmDelete(true)}>Delete category</button>
        </div>
      )}
      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => del.mutate()}
        title="Delete this category?" message="This can't be undone." confirmLabel="Delete" danger loading={del.isPending} />
    </div>
  );
}

function DishSection({ categoryId, query, navigate }) {
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dishes", categoryId] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };
  const avail = useMutation({ mutationFn: ({ id, v }) => setDishAvailable(id, v), onSuccess: refresh, onError: (e) => toast.error(errorMessage(e)) });
  const vis = useMutation({ mutationFn: ({ id, v }) => setDishVisible(id, v), onSuccess: refresh, onError: (e) => toast.error(errorMessage(e)) });
  const reorder = useMutation({ mutationFn: reorderDishes, onSuccess: refresh, onError: (e) => toast.error(errorMessage(e)) });

  const dishes = query.data || [];
  const move = (i, d) => {
    const ids = dishes.map((x) => x.id);
    const [id] = ids.splice(i, 1);
    ids.splice(i + d, 0, id);
    reorder.mutate(ids);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">Dishes</h2>
        <button className="btn-primary text-sm" onClick={() => navigate(`/menu/dishes/new?category=${categoryId}`)}><Plus size={16} /> Add dish</button>
      </div>
      {query.isLoading ? <Skeleton className="h-14" count={3} /> : query.error ? (
        <ErrorState message={query.error.message} onRetry={query.refetch} />
      ) : !dishes.length ? (
        <p className="text-sm text-ink/50 py-4 text-center">No dishes yet.</p>
      ) : (
        <div className="space-y-2">
          {dishes.map((d, i) => {
            const sizes = d.dish_sizes || [];
            const price = sizes.length ? `from ${rupee(Math.min(...sizes.map((s) => s.price)))}` : rupee(d.price);
            return (
              <div key={d.id} className={`border-2 border-line rounded-xl p-2 flex items-center gap-2 ${d.is_visible ? "" : "opacity-60"}`}>
                <button className="flex-1 min-w-0 flex items-center gap-2 text-left min-h-[44px]" onClick={() => navigate(`/menu/dishes/${d.id}`)}>
                  <DietMark diet={d.diet} />
                  <span className="min-w-0">
                    <span className="block font-semibold text-sm truncate">{d.name}</span>
                    <span className="block text-xs text-ink/50">{price}{!d.is_visible && " · Hidden"}{!d.is_available && " · Sold out"}</span>
                  </span>
                </button>
                <div className="flex flex-col items-center">
                  <Switch checked={d.is_available} onChange={(v) => avail.mutate({ id: d.id, v })} label="" />
                  <span className="text-[10px] text-ink/50">{d.is_available ? "Available" : "Sold out"}</span>
                </div>
                <div className="flex flex-col items-center">
                  <Switch checked={d.is_visible} onChange={(v) => vis.mutate({ id: d.id, v })} label="" />
                  <span className="text-[10px] text-ink/50">Visible</span>
                </div>
                <div className="flex flex-col">
                  <button className="p-1 rounded hover:bg-ink/6 disabled:opacity-20" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)} aria-label="Move up"><ChevronUp size={14} /></button>
                  <button className="p-1 rounded hover:bg-ink/6 disabled:opacity-20" disabled={i === dishes.length - 1 || reorder.isPending} onClick={() => move(i, 1)} aria-label="Move down"><ChevronDown size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
