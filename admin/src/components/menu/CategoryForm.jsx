import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { saveCategory, deleteCategory } from "../../services/categoryService";
import { queryClient } from "../../lib/queryClient";
import { errorMessage } from "../../lib/errors";
import Field, { Section } from "../ui/Field";
import Switch from "../ui/Switch";
import ImageUpload from "../ui/ImageUpload";
import ConfirmDialog from "../ui/ConfirmDialog";
import { ARTS, ART_LABELS, SLUG, slugify, invalidateMenu } from "./menuQueries";

const schema = z.object({
  name: z.string().trim().min(1, "Give the category a name.").max(60),
  short_name: z.string().trim().max(24, "Keep the short name under 24 characters."),
  name_ko: z.string().trim().max(40),
  slug: z.string().regex(SLUG, "Use lowercase letters, numbers and dashes, like k-desserts.").max(40),
  blurb: z.string().max(400, "Keep the intro under 400 characters."),
  art: z.enum(ARTS),
  image_path: z.string().nullable(),
  is_visible: z.boolean(),
  groups: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().trim().min(1, "Each sub-section needs a name.").max(60),
      name_ko: z.string().max(40),
      lede: z.string().max(300),
      slug: z.string().regex(SLUG, "Sub-section link names use lowercase letters, numbers and dashes.").max(40),
    }),
  ),
  notes: z.array(
    z.object({
      title: z.string().trim().min(1, "Each note needs a title.").max(80),
      ko: z.string().max(40),
      text: z.string().max(600),
      itemsText: z.string().max(1200),
    }),
  ),
});

const toItems = (t) =>
  t.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [a, ...b] = l.split("|");
    return [a.trim(), b.join("|").trim()];
  });

const blank = {
  name: "", short_name: "", name_ko: "", slug: "", blurb: "", art: "pot",
  image_path: null, is_visible: true, groups: [], notes: [],
};

function currentAddonIds(category) {
  if (!category) return [];
  const addons = queryClient.getQueryData(["addons"]);
  if (addons) return addons.filter((a) => (a.category_addons || []).some((x) => x.category_id === category.id)).map((a) => a.id);
  return (category.category_addons || []).map((x) => x.addon_id);
}

export default function CategoryForm({ category, dishCount = 0, onCancel }) {
  const isNew = !category;
  const navigate = useNavigate();
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { register, control, handleSubmit, reset, watch, setValue, formState: { isDirty } } = useForm({ defaultValues: blank });
  const groups = useFieldArray({ control, name: "groups" });
  const notes = useFieldArray({ control, name: "notes" });

  useEffect(() => {
    if (!category) return;
    const c = category;
    reset({
      name: c.name, short_name: c.short_name || "", name_ko: c.name_ko || "", slug: c.slug,
      blurb: c.blurb || "", art: c.art, image_path: c.image_path, is_visible: c.is_visible,
      groups: (c.category_groups || []).map((g) => ({ id: g.id, name: g.name, name_ko: g.name_ko || "", lede: g.lede || "", slug: g.slug })),
      notes: (c.notes || []).map((n) => ({
        title: n.title || "", ko: n.ko || "", text: n.text || "",
        itemsText: (n.items || []).map(([a, b]) => `${a} | ${b}`).join("\n"),
      })),
    });
  }, [category, reset]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const name = watch("name");
  useEffect(() => {
    if (!slugTouched) setValue("slug", slugify(name || ""));
  }, [name, slugTouched, setValue]);

  const save = useMutation({
    mutationFn: saveCategory,
    onSuccess: (id, p) => {
      invalidateMenu("categories", "category");
      toast.success(isNew ? `${p.name} created. Now add its dishes.` : `${p.name} saved.`);
      if (isNew) navigate(`/menu/categories/${id}`, { replace: true });
      else reset(undefined, { keepValues: true });
    },
    onError: (err) => setErrors({ form: errorMessage(err) }),
  });

  const del = useMutation({
    mutationFn: () => deleteCategory(category.id),
    onSuccess: () => {
      invalidateMenu("categories");
      toast.success(`${category.name} deleted.`);
      navigate("/menu", { replace: true });
    },
    onError: (err) => {
      setConfirmDelete(false);
      toast.error(errorMessage(err));
    },
  });

  const onSubmit = handleSubmit((values) => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const map = {};
      for (const i of parsed.error.issues) map[i.path.join(".")] ??= i.message;
      setErrors(map);
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setErrors({});
    const v = parsed.data;
    save.mutate({
      id: isNew ? null : category.id,
      slug: v.slug, name: v.name, short_name: v.short_name || null, name_ko: v.name_ko || null,
      blurb: v.blurb || null, art: v.art, image_path: v.image_path, is_visible: v.is_visible,
      groups: v.groups.map((g) => ({ ...g, name_ko: g.name_ko || null, lede: g.lede || null })),
      notes: v.notes.map((n) => {
        const items = toItems(n.itemsText);
        return { title: n.title, ...(n.ko ? { ko: n.ko } : {}), ...(n.text ? { text: n.text } : {}), ...(items.length ? { items } : {}) };
      }),
      // The save replaces the category's add-on links, so always send the current ones.
      addon_ids: currentAddonIds(category),
    });
  });

  const art = watch("art");
  const blurb = watch("blurb") || "";

  return (
    <form onSubmit={onSubmit} className="flex min-h-full flex-col">
      <div className="flex-1 px-5 py-5 divide-line">
        {errors.form && <p role="alert" className="mb-4 rounded-[10px] bg-red-soft px-3 py-2 text-meta font-semibold text-red">{errors.form}</p>}

        <Section title="Basics" description="What guests see at the top of this section of the menu.">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" error={errors.name}>
                {(p) => <input {...p} className="input" maxLength={60} placeholder="Korean Starters" {...register("name")} data-autofocus={isNew || undefined} />}
              </Field>
              <Field label="Korean name" optional>
                {(p) => <input {...p} className="input" maxLength={40} lang="ko" placeholder="한국식 스타터" {...register("name_ko")} />}
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Short name" optional hint="Shown in the menu's top bar." error={errors.short_name}>
                {(p) => <input {...p} className="input" maxLength={24} placeholder="Starters" {...register("short_name")} />}
              </Field>
              <Field label="Link name" hint="menu.html#this-name. Changing it breaks old links." error={errors.slug}>
                {(p) => <input {...p} className="input" maxLength={40} {...register("slug", { onChange: () => setSlugTouched(true) })} />}
              </Field>
            </div>
            <Field label="Intro" optional error={errors.blurb} counter={<span className="text-cap font-normal text-ink-3 tnum">{blurb.length}/400</span>}>
              {(p) => <textarea {...p} className="textarea" rows={3} maxLength={400} placeholder="One or two lines that make people hungry." {...register("blurb")} />}
            </Field>
          </div>
        </Section>

        <Section title="Look" description="The cover photo and the line drawing next to the section title.">
          <div className="space-y-5">
            <ImageUpload folder="categories" label="Cover photo" value={watch("image_path")} onChange={(p) => setValue("image_path", p, { shouldDirty: true })} />
            <div>
              <p className="label">Menu illustration</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Menu illustration">
                {ARTS.map((a) => (
                  <button
                    type="button"
                    key={a}
                    role="radio"
                    aria-checked={art === a}
                    onClick={() => setValue("art", a, { shouldDirty: true })}
                    className={`h-8 rounded-full border px-3 text-meta font-semibold transition-colors ${
                      art === a ? "border-[#E2DB55] bg-lemon text-ink" : "border-line-strong bg-surface text-ink-2 hover:bg-sunken"
                    }`}
                  >
                    {ART_LABELS[a]}
                  </button>
                ))}
              </div>
            </div>
            <Switch
              checked={watch("is_visible")}
              onChange={(v) => setValue("is_visible", v, { shouldDirty: true })}
              label="On the menu"
              description="Hidden categories stay here for you, but guests don't see them."
            />
          </div>
        </Section>

        <Section
          title="Sub-sections"
          description="Split a long category, like Corn Doggs and Nachos inside Street Snacks."
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => groups.append({ name: "", name_ko: "", lede: "", slug: "" })}>
              <Plus size={14} /> Add
            </button>
          }
        >
          {!groups.fields.length ? (
            <p className="rounded-[12px] border border-dashed border-line-strong px-4 py-4 text-center text-meta text-ink-3">None. Dishes show as one list.</p>
          ) : (
            <div className="space-y-2">
              {groups.fields.map((f, i) => (
                <div key={f.id} className="rounded-[14px] border border-line bg-sunken p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      className="input"
                      placeholder="Sub-section name"
                      aria-label="Sub-section name"
                      maxLength={60}
                      {...register(`groups.${i}.name`, { onChange: (e) => { if (!watch(`groups.${i}.id`)) setValue(`groups.${i}.slug`, slugify(e.target.value)); } })}
                    />
                    <input className="input" placeholder="Korean (optional)" aria-label="Korean name" lang="ko" maxLength={40} {...register(`groups.${i}.name_ko`)} />
                    <div className="flex items-center gap-0.5">
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={i === 0} onClick={() => groups.move(i, i - 1)} aria-label="Move up"><ChevronUp size={16} /></button>
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={i === groups.fields.length - 1} onClick={() => groups.move(i, i + 1)} aria-label="Move down"><ChevronDown size={16} /></button>
                      <button type="button" className="btn btn-ghost btn-icon btn-sm !text-red" onClick={() => groups.remove(i)} aria-label="Remove sub-section"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[2fr_1fr]">
                    <input className="input" placeholder="Intro line (optional)" aria-label="Intro line" maxLength={300} {...register(`groups.${i}.lede`)} />
                    <input className="input" placeholder="link-name" aria-label="Link name" maxLength={40} {...register(`groups.${i}.slug`)} />
                  </div>
                  {(errors[`groups.${i}.name`] || errors[`groups.${i}.slug`]) && (
                    <p className="field-error">{errors[`groups.${i}.name`] || errors[`groups.${i}.slug`]}</p>
                  )}
                </div>
              ))}
              <p className="hint">Removing a sub-section keeps its dishes in the category.</p>
            </div>
          )}
        </Section>

        <Section
          title="Notes"
          description="Boxes under the dishes, like “Choose your base” or “Flavour options”."
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => notes.append({ title: "", ko: "", text: "", itemsText: "" })}>
              <Plus size={14} /> Add
            </button>
          }
        >
          {!notes.fields.length ? (
            <p className="rounded-[12px] border border-dashed border-line-strong px-4 py-4 text-center text-meta text-ink-3">No notes.</p>
          ) : (
            <div className="space-y-2">
              {notes.fields.map((f, i) => (
                <div key={f.id} className="rounded-[14px] border border-line bg-sunken p-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input className="input" placeholder="Title" aria-label="Note title" maxLength={80} {...register(`notes.${i}.title`)} />
                    <input className="input" placeholder="Korean (optional)" aria-label="Korean title" lang="ko" maxLength={40} {...register(`notes.${i}.ko`)} />
                    <button type="button" className="btn btn-ghost btn-icon btn-sm !text-red self-center" onClick={() => notes.remove(i)} aria-label="Remove note"><Trash2 size={16} /></button>
                  </div>
                  <textarea className="textarea" rows={2} placeholder="Text" aria-label="Note text" maxLength={600} {...register(`notes.${i}.text`)} />
                  <textarea className="textarea" rows={3} placeholder={"Optional list, one per line:\nGochujang | Sweet, spicy, the classic"} aria-label="Note list" maxLength={1200} {...register(`notes.${i}.itemsText`)} />
                  {errors[`notes.${i}.title`] && <p className="field-error">{errors[`notes.${i}.title`]}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>

        {!isNew && (
          <Section title="Delete category">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#F4D3CF] px-4 py-3">
              <p className="text-meta text-ink-2 max-w-[44ch]">
                {dishCount > 0
                  ? `It still has ${dishCount} ${dishCount === 1 ? "dish" : "dishes"}. Move or delete them first, or just hide the category.`
                  : "Permanently removes this category. This can't be undone."}
              </p>
              <button type="button" className="btn btn-danger-outline btn-sm" disabled={dishCount > 0} onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} /> Delete category
              </button>
            </div>
          </Section>
        )}
      </div>

      {(isDirty || isNew) && (
        <div className="sticky bottom-0 z-[2] flex items-center gap-2 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur-sm">
          <p className="mr-auto text-meta text-ink-3">{isNew ? "Name it, then add dishes inside." : "You have unsaved changes."}</p>
          <button type="button" className="btn btn-ghost" onClick={() => (isNew ? onCancel?.() : reset())}>
            {isNew ? "Cancel" : "Discard"}
          </button>
          <button type="submit" disabled={save.isPending} className="btn btn-primary">
            {save.isPending ? "Saving…" : isNew ? "Create category" : "Save changes"}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => del.mutate()}
        title={`Delete ${category?.name}?`}
        message="This can't be undone."
        confirmLabel="Delete category"
        danger
        loading={del.isPending}
      />
    </form>
  );
}
