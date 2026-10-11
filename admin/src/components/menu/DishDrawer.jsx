import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import { ChevronDown, ChevronUp, Plus, Trash2, Flame, ArrowRight, X } from "lucide-react";
import { getDish, saveDish, deleteDish } from "../../services/dishService";
import { getCategory } from "../../services/categoryService";
import { getChoiceGroups } from "../../services/choiceService";
import { getAddons } from "../../services/addonService";
import { errorMessage } from "../../lib/errors";
import { isUuid } from "../../lib/ids";
import { rupee } from "../../lib/format";
import Drawer from "../ui/Drawer";
import Field, { Section } from "../ui/Field";
import Switch from "../ui/Switch";
import ImageUpload from "../ui/ImageUpload";
import ConfirmDialog from "../ui/ConfirmDialog";
import DietMark, { DIET_OPTIONS, SPICE_LABELS } from "../ui/DietMark";
import { Segmented } from "../ui/Segmented";
import { invalidateMenu, ruleText } from "./menuQueries";

const BADGES = ["signature", "most loved", "new", "chef's pick"];

const schema = z
  .object({
    name: z.string().trim().min(1, "Give the dish a name.").max(80),
    category_id: z.string().min(1, "Pick a category."),
    group_id: z.string(),
    description: z.string().max(400, "Keep the description under 400 characters."),
    note: z.string().max(600, "Keep “Good to know” under 600 characters."),
    pricing: z.enum(["single", "sizes"]),
    price: z.coerce.number({ invalid_type_error: "Enter a price in rupees." }).int("Use whole rupees.").min(0, "Price can't be negative.").max(100000),
    sizes: z.array(
      z.object({
        id: z.string().optional(),
        label: z.string().trim().min(1, "Each size needs a name, like Small or 6 pcs.").max(40),
        price: z.coerce.number({ invalid_type_error: "Each size needs a price." }).int("Use whole rupees.").min(0).max(100000),
      }),
    ),
    diet: z.enum(["", "veg", "nonveg", "egg", "both"]),
    spice: z.coerce.number().int().min(0).max(3),
    badge: z.string().max(24, "Keep the badge under 24 characters."),
    image_path: z.string().nullable(),
    choice_group_ids: z.array(z.string()),
    is_available: z.boolean(),
    is_visible: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.pricing === "sizes" && (v.sizes.length < 2 || v.sizes.length > 4)) {
      ctx.addIssue({ code: "custom", path: ["sizes"], message: "Use 2 to 4 sizes, or switch to one price." });
    }
  });

const EMPTY = {
  name: "", category_id: "", group_id: "", description: "", note: "", pricing: "single", price: "",
  sizes: [], diet: "", spice: 0, badge: "", image_path: null, choice_group_ids: [], is_available: true, is_visible: true,
};

export default function DishDrawer({ dishId, presetCategory, categories, onClose }) {
  const isNew = !dishId;
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);

  const dish = useQuery({ queryKey: ["dish", dishId], queryFn: () => getDish(dishId), enabled: !isNew });
  const lists = useQuery({ queryKey: ["choice-groups"], queryFn: getChoiceGroups });
  const addons = useQuery({ queryKey: ["addons"], queryFn: getAddons });

  const { register, control, handleSubmit, reset, watch, setValue, formState: { isDirty } } = useForm({
    defaultValues: { ...EMPTY, category_id: presetCategory || "" },
  });
  const sizes = useFieldArray({ control, name: "sizes" });

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

  const categoryId = watch("category_id");
  const catDetail = useQuery({ queryKey: ["category", categoryId], queryFn: () => getCategory(categoryId), enabled: isUuid(categoryId) });
  const subSections = catDetail.data?.category_groups || [];
  const catAddons = useMemo(
    () => (addons.data || []).filter((a) => (a.category_addons || []).some((x) => x.category_id === categoryId)),
    [addons.data, categoryId],
  );

  const save = useMutation({
    mutationFn: saveDish,
    onSuccess: (id, p) => {
      invalidateMenu("dishes", "dish", "categories", "choice-groups", "choice-usage", "dishes-all");
      toast.success(isNew ? `${p.name} added to the menu.` : `${p.name} saved.`);
      reset(undefined, { keepValues: true });
      onClose(true);
      if (isNew) navigate(`/menu/categories/${p.category_id}`, { replace: true });
    },
    onError: (err) => setErrors({ form: errorMessage(err) }),
  });

  const del = useMutation({
    mutationFn: () => deleteDish(dishId),
    onSuccess: () => {
      invalidateMenu("dishes", "categories", "dishes-all");
      toast.success(`${dish.data.name} deleted.`);
      setConfirm(null);
      navigate(`/menu/categories/${dish.data.category_id}`, { replace: true });
    },
    onError: (err) => {
      setConfirm(null);
      toast.error(errorMessage(err));
    },
  });

  const onSubmit = handleSubmit((values) => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const map = {};
      for (const i of parsed.error.issues) map[i.path.join(".")] ??= i.message;
      setErrors(map);
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

  function requestClose() {
    if (isDirty) setConfirm("discard");
    else onClose(false);
  }

  const pricing = watch("pricing");
  const diet = watch("diet");
  const spice = Number(watch("spice"));
  const badge = watch("badge") || "";
  const description = watch("description") || "";
  const picked = watch("choice_group_ids") || [];
  const allLists = lists.data || [];
  const available = allLists.filter((l) => !picked.includes(l.id));
  const setPicked = (ids) => setValue("choice_group_ids", ids, { shouldDirty: true });
  const sizeError = errors.sizes || Object.entries(errors).find(([k]) => k.startsWith("sizes."))?.[1];
  const title = isNew ? "New dish" : dish.data?.name || "Dish";

  return (
    <Drawer
      open
      onClose={requestClose}
      title={title}
      subtitle={isNew ? "Add it to the menu" : categories.find((c) => c.id === dish.data?.category_id)?.name}
      width={620}
      footer={
        <>
          {!isNew && dish.data && (
            <button type="button" onClick={() => setConfirm("delete")} className="btn btn-ghost !text-red hover:!bg-red-soft mr-auto">
              <Trash2 size={16} /> Delete
            </button>
          )}
          <button type="button" onClick={requestClose} className={`btn btn-secondary ${isNew || !dish.data ? "ml-auto" : ""}`}>Cancel</button>
          <button type="submit" form="dish-form" disabled={save.isPending || (!isNew && !dish.data)} className="btn btn-primary">
            {save.isPending ? "Saving…" : isNew ? "Add dish" : "Save dish"}
          </button>
        </>
      }
    >
      {!isNew && dish.isLoading ? (
        <div className="space-y-4 p-6">
          <div className="skeleton h-28 w-28 !rounded-[16px]" />
          <div className="skeleton h-10" />
          <div className="skeleton h-24" />
        </div>
      ) : !isNew && dish.error ? (
        <div className="p-6">
          <p className="text-body text-red font-semibold">{dish.error.code === "PGRST116" ? "This dish doesn't exist any more." : errorMessage(dish.error)}</p>
        </div>
      ) : (
        <form id="dish-form" onSubmit={onSubmit} className="px-5 sm:px-6 py-5 divide-line">
          {errors.form && <p role="alert" className="mb-4 rounded-[10px] bg-red-soft px-3 py-2 text-meta font-semibold text-red">{errors.form}</p>}

          <Section>
            <ImageUpload folder="dishes" label="Dish photo" value={watch("image_path")} onChange={(p) => setValue("image_path", p, { shouldDirty: true })} />
          </Section>

          <Section title="Details">
            <div className="space-y-4">
              <Field label="Name" error={errors.name}>
                {(p) => <input {...p} className="input" maxLength={80} placeholder="Classic Rabokki" {...register("name")} data-autofocus={isNew || undefined} />}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" error={errors.category_id}>
                  {(p) => (
                    <select {...p} className="select" {...register("category_id", { onChange: () => setValue("group_id", "") })}>
                      <option value="">Choose…</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </Field>
                <Field label="Sub-section" hint={subSections.length ? null : "This category has none."}>
                  {(p) => (
                    <select {...p} className="select" disabled={!subSections.length} {...register("group_id")}>
                      <option value="">None</option>
                      {subSections.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  )}
                </Field>
              </div>
              <Field label="Description" optional error={errors.description} counter={<span className="text-cap font-normal text-ink-3 tnum">{description.length}/400</span>}>
                {(p) => <textarea {...p} className="textarea" rows={3} maxLength={400} placeholder="What's in it, in one or two lines." {...register("description")} />}
              </Field>
              <Field label="Good to know" optional hint="Allergens, wait time, “served with steamed rice”." error={errors.note}>
                {(p) => <textarea {...p} className="textarea" rows={2} maxLength={600} {...register("note")} />}
              </Field>
            </div>
          </Section>

          <Section
            title="Price"
            action={
              <Segmented
                size="sm"
                plain
                label="Pricing"
                value={pricing}
                onChange={(k) => {
                  setValue("pricing", k, { shouldDirty: true });
                  if (k === "sizes" && sizes.fields.length < 2) {
                    sizes.replace([{ label: "Regular", price: watch("price") || "" }, { label: "Large", price: "" }]);
                  }
                }}
                options={[
                  { value: "single", label: "One price" },
                  { value: "sizes", label: "Sizes" },
                ]}
              />
            }
          >
            {pricing === "single" ? (
              <Field error={errors.price} hint="Before tax, in rupees.">
                {(p) => (
                  <div className="input-prefix max-w-[180px]">
                    <span>₹</span>
                    <input {...p} aria-label="Price in rupees" type="number" inputMode="numeric" min={0} className="input" placeholder="299" {...register("price")} />
                  </div>
                )}
              </Field>
            ) : (
              <div className="space-y-2">
                {sizes.fields.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <input className="input" placeholder="Size, like 6 pcs" aria-label={`Size ${i + 1} name`} maxLength={40} {...register(`sizes.${i}.label`)} />
                    <div className="input-prefix w-[130px] shrink-0">
                      <span>₹</span>
                      <input type="number" inputMode="numeric" min={0} className="input" aria-label={`Size ${i + 1} price`} {...register(`sizes.${i}.price`)} />
                    </div>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={i === 0} onClick={() => sizes.move(i, i - 1)} aria-label="Move size up"><ChevronUp size={16} /></button>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm !text-red" disabled={sizes.fields.length <= 2} onClick={() => sizes.remove(i)} aria-label="Remove size"><Trash2 size={16} /></button>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-cap text-ink-3">The menu shows “from” the lowest price. 2 to 4 sizes.</p>
                  {sizes.fields.length < 4 && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => sizes.append({ label: "", price: "" })}>
                      <Plus size={14} /> Add size
                    </button>
                  )}
                </div>
                {sizeError && <p className="field-error">{sizeError}</p>}
              </div>
            )}
          </Section>

          <Section title="Labels" description="Shown as marks next to the dish name.">
            <div className="space-y-4">
              <div>
                <p className="label">Diet</p>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Diet">
                  {DIET_OPTIONS.map(([k, l]) => (
                    <button
                      key={k || "none"}
                      type="button"
                      role="radio"
                      aria-checked={diet === k}
                      onClick={() => setValue("diet", k, { shouldDirty: true })}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-meta font-semibold transition-colors ${
                        diet === k ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-2 hover:bg-sunken"
                      }`}
                    >
                      <DietMark diet={k} size={12} decorative />
                      {l}
                    </button>
                  ))}
                </div>
                {diet === "both" && <p className="hint">Use this when the guest's choice (tofu or chicken, say) decides it.</p>}
              </div>
              <div>
                <p className="label">Spice</p>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Spice level">
                  {SPICE_LABELS.map((l, i) => (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={spice === i}
                      onClick={() => setValue("spice", i, { shouldDirty: true })}
                      className={`inline-flex h-9 items-center gap-1 rounded-full border px-3 text-meta font-semibold transition-colors ${
                        spice === i ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-2 hover:bg-sunken"
                      }`}
                    >
                      {i > 0 && (
                        <span className={`inline-flex ${spice === i ? "text-[#FFB59A]" : "text-orange-ink"}`}>
                          {Array.from({ length: i }, (_, k) => <Flame key={k} size={13} className={k ? "-ml-1" : ""} fill="currentColor" fillOpacity={0.2} />)}
                        </span>
                      )}
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Badge" optional hint="Dishes with a badge also appear in “Most loved”." error={errors.badge}>
                {(p) => (
                  <div>
                    <input {...p} className="input" maxLength={24} placeholder="signature" {...register("badge")} />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {BADGES.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setValue("badge", badge === b ? "" : b, { shouldDirty: true })}
                          className={`chip capitalize ${badge === b ? "chip-lemon" : "border border-line bg-surface text-ink-2 hover:bg-sunken"}`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Field>
            </div>
          </Section>

          <Section
            title="Choices guests make"
            description="Required or optional picks, like the filling or the base. They don't change the price unless an option adds to it."
            action={<Link to="/menu/choices" className="text-meta font-semibold text-cobalt-ink hover:underline underline-offset-2 whitespace-nowrap">Manage lists</Link>}
          >
            <div className="space-y-2">
              {picked.map((id, i) => {
                const l = allLists.find((x) => x.id === id);
                return (
                  <div key={id} className="flex items-center gap-2 rounded-[12px] border border-line px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-semibold">{l?.label || "Unknown list"}</p>
                      {l && (
                        <p className="truncate text-cap text-ink-3">
                          {ruleText(l)} · {(l.choice_options || []).map((o) => o.label).join(", ")}
                        </p>
                      )}
                    </div>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={i === 0}
                      onClick={() => { const n = [...picked]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setPicked(n); }} aria-label="Move up"><ChevronUp size={16} /></button>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={i === picked.length - 1}
                      onClick={() => { const n = [...picked]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setPicked(n); }} aria-label="Move down"><ChevronDown size={16} /></button>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setPicked(picked.filter((x) => x !== id))} aria-label={`Remove ${l?.label || "list"}`}><X size={16} /></button>
                  </div>
                );
              })}
              {available.length > 0 && (
                <select className="select" value="" aria-label="Attach a choice list" onChange={(e) => e.target.value && setPicked([...picked, e.target.value])}>
                  <option value="">{picked.length ? "Add another choice list…" : "Attach a choice list…"}</option>
                  {available.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}
            </div>
          </Section>

          <Section title="Add-ons" description="Add-ons belong to the category, so every dish in it offers the same extras.">
            {!isUuid(categoryId) ? (
              <p className="text-meta text-ink-3">Pick a category to see its add-ons.</p>
            ) : (
              <div className="rounded-[12px] border border-line bg-sunken px-3 py-2.5">
                {catAddons.length ? (
                  <p className="text-meta text-ink-2">
                    {catAddons.slice(0, 4).map((a) => `${a.name} +${rupee(a.price)}`).join(" · ")}
                    {catAddons.length > 4 && ` · ${catAddons.length - 4} more`}
                  </p>
                ) : (
                  <p className="text-meta text-ink-3">No add-ons in this category yet.</p>
                )}
                <Link to={`/menu/categories/${categoryId}?tab=addons`} onClick={() => onClose(false)} className="mt-1 inline-flex items-center gap-1 text-meta font-semibold text-cobalt-ink hover:underline underline-offset-2">
                  Manage add-ons <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </Section>

          <Section title="Availability">
            <div className="space-y-4">
              <Switch
                checked={watch("is_available")}
                onChange={(v) => setValue("is_available", v, { shouldDirty: true })}
                label="In stock"
                description="Off marks it sold out: guests still see it, but can't order it."
              />
              <Switch
                checked={watch("is_visible")}
                onChange={(v) => setValue("is_visible", v, { shouldDirty: true })}
                label="On the menu"
                description="Off hides it from guests completely."
              />
            </div>
          </Section>
        </form>
      )}

      <ConfirmDialog
        open={confirm === "discard"}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          onClose(false);
        }}
        title="Discard your changes?"
        message="The changes you made to this dish haven't been saved."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        danger
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        onConfirm={() => del.mutate()}
        title={`Delete ${dish.data?.name}?`}
        message="This can't be undone. Past orders keep their copy of the dish. To take it off the menu for now, hide it instead."
        confirmLabel="Delete dish"
        danger
        loading={del.isPending}
      />
    </Drawer>
  );
}
