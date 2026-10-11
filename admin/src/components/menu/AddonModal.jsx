import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import { createAddon, updateAddon } from "../../services/addonService";
import { errorMessage } from "../../lib/errors";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Switch from "../ui/Switch";
import DietMark, { DIET_OPTIONS } from "../ui/DietMark";
import { invalidateMenu } from "./menuQueries";

const schema = z.object({
  name: z.string().trim().min(1, "Give the add-on a name, like Fried egg.").max(60),
  price: z.coerce.number({ invalid_type_error: "Enter a price in rupees." }).int("Use whole rupees.").min(0, "Price can't be negative.").max(10000, "That's over ₹10,000."),
  diet: z.enum(["", "veg", "nonveg", "egg", "both"]),
  badge: z.string().max(24, "Keep the badge under 24 characters."),
  is_available: z.boolean(),
  category_ids: z.array(z.string()),
});

// Create or edit an add-on. `presetCategory` offers a new add-on in that category straight away.
export default function AddonModal({ addon, categories, presetCategory, onClose, onSaved }) {
  const isNew = !addon?.id;
  const [errors, setErrors] = useState({});
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { name: "", price: "", diet: "", badge: "", is_available: true, category_ids: presetCategory ? [presetCategory] : [] },
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
    onSuccess: (_d, v) => {
      toast.success(isNew ? `${v.name} added.` : `${v.name} saved.`);
      invalidateMenu("addons", "category");
      onSaved?.();
    },
    onError: (e) => setErrors({ form: errorMessage(e) }),
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
    save.mutate({ name: v.name, price: v.price, diet: v.diet || null, badge: v.badge || null, is_available: v.is_available, category_ids: v.category_ids });
  });

  const diet = watch("diet");
  const picked = watch("category_ids") || [];

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "New add-on" : `Edit ${addon.name}`}
      description="An extra guests can tick on a dish, like a fried egg or extra cheese."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" form="addon-form" disabled={save.isPending} className="btn btn-primary">
            {save.isPending ? "Saving…" : isNew ? "Add add-on" : "Save add-on"}
          </button>
        </>
      }
    >
      <form id="addon-form" onSubmit={onSubmit} className="space-y-4">
        {errors.form && <p role="alert" className="rounded-[10px] bg-red-soft px-3 py-2 text-meta font-semibold text-red">{errors.form}</p>}
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label="Name" error={errors.name}>
            {(p) => <input {...p} className="input" maxLength={60} placeholder="Fried egg" data-autofocus {...register("name")} />}
          </Field>
          <Field label="Price" error={errors.price}>
            {(p) => (
              <div className="input-prefix">
                <span>₹</span>
                <input {...p} type="number" inputMode="numeric" min={0} className="input" placeholder="25" {...register("price")} />
              </div>
            )}
          </Field>
        </div>

        <div>
          <p className="label">Diet</p>
          <div className="flex flex-wrap gap-1.5">
            {DIET_OPTIONS.map(([k, l]) => (
              <button
                key={k || "none"}
                type="button"
                onClick={() => setValue("diet", k, { shouldDirty: true })}
                aria-pressed={diet === k}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-meta font-semibold transition-colors ${
                  diet === k ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-2 hover:bg-sunken"
                }`}
              >
                <DietMark diet={k} size={12} decorative />
                {l}
              </button>
            ))}
          </div>
        </div>

        <Field label="Badge" optional hint="A short sticker, like “most loved”." error={errors.badge}>
          {(p) => <input {...p} className="input" maxLength={24} {...register("badge")} />}
        </Field>

        <Switch
          checked={watch("is_available")}
          onChange={(v) => setValue("is_available", v, { shouldDirty: true })}
          label="In stock"
          description="Turn off when you run out today. Guests see it as unavailable."
        />

        <div>
          <p className="label flex items-baseline justify-between">
            Offered in
            <span className="text-cap font-normal text-ink-3">{picked.length ? `${picked.length} selected` : "None yet"}</span>
          </p>
          <div className="max-h-52 overflow-y-auto rounded-[12px] border border-line divide-line">
            {categories.map((c) => (
              <label key={c.id} className="flex min-h-[44px] cursor-pointer items-center gap-3 px-3 hover:bg-sunken">
                <input type="checkbox" value={c.id} className="h-4.5 w-4.5 accent-[var(--color-cobalt)]" {...register("category_ids")} />
                <span className="flex-1 text-body">{c.name}</span>
                {c.name_ko && <span className="text-cap text-ink-3" lang="ko">{c.name_ko}</span>}
              </label>
            ))}
          </div>
          <p className="hint">Every dish in the ticked categories offers this add-on.</p>
        </div>
      </form>
    </Modal>
  );
}
