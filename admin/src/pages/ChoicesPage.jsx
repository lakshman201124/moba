import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import { ChevronUp, Pencil, Plus, Trash2, ListChecks, MoreHorizontal } from "lucide-react";
import {
  getChoiceGroups, saveChoiceGroup, deleteChoiceGroup, setOptionAvailable, getChoiceUsage,
} from "../services/choiceService";
import { queryClient } from "../lib/queryClient";
import { errorMessage } from "../lib/errors";
import { rupee } from "../lib/format";
import PageHeader from "../components/ui/PageHeader";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Switch from "../components/ui/Switch";
import DietMark from "../components/ui/DietMark";
import Field from "../components/ui/Field";
import Menu, { MenuItem, MenuSeparator } from "../components/ui/Menu";
import MenuTabs from "../components/menu/MenuTabs";
import { invalidateMenu, ruleText } from "../components/menu/menuQueries";

const schema = z
  .object({
    name: z.string().trim().min(1, "Give the list a name staff will recognise.").max(60),
    label: z.string().trim().min(1, "Add the heading guests see, like Filling.").max(40),
    min_select: z.coerce.number().int().min(0),
    max_select: z.coerce.number().int().min(1, "Allow at least 1 pick.").max(10, "10 picks at most."),
    options: z
      .array(
        z.object({
          id: z.string().optional(),
          label: z.string().trim().min(1, "Each option needs a name.").max(40),
          diet: z.enum(["", "veg", "nonveg", "egg"]),
          price_delta: z.coerce.number().int("Use whole rupees.").min(0).max(10000),
          is_available: z.boolean(),
        }),
      )
      .min(1, "Add at least one option."),
  })
  .superRefine((v, ctx) => {
    if (v.min_select > v.max_select) ctx.addIssue({ code: "custom", path: ["min_select"], message: "The minimum can't be more than the maximum." });
    if (v.min_select > v.options.length) ctx.addIssue({ code: "custom", path: ["min_select"], message: "The minimum is more than the number of options." });
    const labels = v.options.map((o) => o.label.toLowerCase());
    if (new Set(labels).size !== labels.length) ctx.addIssue({ code: "custom", path: ["options"], message: "Two options have the same name." });
  });

export default function ChoicesPage() {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const groups = useQuery({ queryKey: ["choice-groups"], queryFn: getChoiceGroups });
  const usage = useQuery({ queryKey: ["choice-usage"], queryFn: getChoiceUsage });

  const toggle = useMutation({
    mutationFn: ({ id, v }) => setOptionAvailable(id, v),
    onMutate: async ({ id, v }) => {
      await queryClient.cancelQueries({ queryKey: ["choice-groups"] });
      const before = queryClient.getQueryData(["choice-groups"]);
      queryClient.setQueryData(["choice-groups"], (list) =>
        list?.map((g) => ({ ...g, choice_options: g.choice_options.map((o) => (o.id === id ? { ...o, is_available: v } : o)) })),
      );
      return { before };
    },
    onSuccess: (_d, { v, label }) => toast.success(v ? `${label} is back.` : `${label} marked out for today.`, { id: `opt-${label}` }),
    onError: (e, _v, ctx) => {
      if (ctx?.before) queryClient.setQueryData(["choice-groups"], ctx.before);
      toast.error(errorMessage(e));
    },
    onSettled: () => invalidateMenu("choice-groups"),
  });
  const del = useMutation({
    mutationFn: (g) => deleteChoiceGroup(g.id),
    onSuccess: (_d, g) => {
      invalidateMenu("choice-groups", "choice-usage");
      toast.success(`${g.name} deleted.`);
      setDeleting(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Menu"
        subtitle="Choice lists are the picks a guest makes on a dish, like the filling or the base."
        actions={<MenuTabs active="choices" showAdd={false} />}
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="panel-title">
          Choice lists <span className="text-ink-3 font-semibold tnum">{groups.data?.length ?? ""}</span>
        </h2>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <Plus size={16} /> New list
        </button>
      </div>

      {groups.error ? (
        <div className="panel"><ErrorState message={errorMessage(groups.error)} onRetry={groups.refetch} /></div>
      ) : groups.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-48 !rounded-[16px]" />)}</div>
      ) : !groups.data?.length ? (
        <div className="panel">
          <EmptyState icon={ListChecks} title="No choice lists yet" message="Make one list, like Filling: Tofu, Paneer, Chicken, and reuse it on every dish that needs it." action="New list" actionIcon={Plus} onAction={() => setEditing({})} />
        </div>
      ) : (
        <div className="gap-4 md:columns-2 2xl:columns-3">
          {groups.data.map((g) => {
            const used = usage.data?.[g.id] ?? 0;
            return (
              <section key={g.id} className="panel mb-4 overflow-hidden break-inside-avoid">
                <header className="flex items-start gap-2 px-4 pt-4 pb-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-bold">{g.label}</p>
                    <p className="truncate text-cap text-ink-3">
                      {g.name} · {ruleText(g)} · {used} {used === 1 ? "dish" : "dishes"}
                    </p>
                  </div>
                  <Menu
                    label={`${g.name} actions`}
                    trigger={(p) => (
                      <button {...p} className="btn btn-ghost btn-icon btn-sm -mr-1.5">
                        <MoreHorizontal size={17} />
                      </button>
                    )}
                  >
                    <MenuItem icon={Pencil} onSelect={() => setEditing(g)}>Edit list</MenuItem>
                    <MenuSeparator />
                    <MenuItem icon={Trash2} danger disabled={used > 0} hint={used > 0 ? "In use" : undefined} onSelect={() => setDeleting(g)}>Delete</MenuItem>
                  </Menu>
                </header>
                <ul className="divide-line border-t border-line">
                  {(g.choice_options || []).map((o) => (
                    <li key={o.id} className="flex min-h-[44px] items-center gap-2.5 px-4 py-1.5">
                      <DietMark diet={o.diet} size={12} />
                      <span className={`min-w-0 flex-1 truncate text-body ${o.is_available ? "" : "text-ink-3 line-through decoration-ink-3/60"}`}>
                        {o.label}
                        {o.price_delta > 0 && <span className="text-ink-3 no-underline"> +{rupee(o.price_delta)}</span>}
                      </span>
                      <span className={`text-cap font-semibold ${o.is_available ? "text-green-ink" : "text-red"}`}>{o.is_available ? "In stock" : "Out today"}</span>
                      <Switch checked={o.is_available} onChange={(v) => toggle.mutate({ id: o.id, v, label: o.label })} label={`${o.label} in stock`} hideLabel size="sm" />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {editing && <GroupModal group={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => del.mutate(deleting)}
        title={`Delete ${deleting?.name}?`}
        message="This can't be undone."
        confirmLabel="Delete list"
        danger
        loading={del.isPending}
      />
    </>
  );
}

function GroupModal({ group, onClose }) {
  const isNew = !group.id;
  const [errors, setErrors] = useState({});
  const { register, control, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { name: "", label: "", min_select: 1, max_select: 1, options: [{ label: "", diet: "", price_delta: 0, is_available: true }] },
  });
  const options = useFieldArray({ control, name: "options" });

  useEffect(() => {
    if (isNew) return;
    reset({
      name: group.name, label: group.label, min_select: group.min_select, max_select: group.max_select,
      options: (group.choice_options || []).map((o) => ({ id: o.id, label: o.label, diet: o.diet || "", price_delta: o.price_delta, is_available: o.is_available })),
    });
  }, [group, isNew, reset]);

  const save = useMutation({
    mutationFn: saveChoiceGroup,
    onSuccess: (_d, p) => {
      toast.success(`${p.label} saved.`);
      invalidateMenu("choice-groups", "choice-usage", "dish");
      onClose();
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
    save.mutate({
      id: isNew ? null : group.id, name: v.name, label: v.label, min_select: v.min_select, max_select: v.max_select,
      options: v.options.map((o) => ({ id: o.id || null, label: o.label, diet: o.diet || null, price_delta: o.price_delta, is_available: o.is_available })),
    });
  });

  const optionError = errors.options || Object.entries(errors).find(([k]) => k.startsWith("options."))?.[1];

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "New choice list" : `Edit ${group.label}`}
      wide
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" form="group-form" disabled={save.isPending} className="btn btn-primary">{save.isPending ? "Saving…" : "Save list"}</button>
        </>
      }
    >
      <form id="group-form" onSubmit={onSubmit} className="space-y-4">
        {errors.form && <p role="alert" className="rounded-[10px] bg-red-soft px-3 py-2 text-meta font-semibold text-red">{errors.form}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heading guests see" error={errors.label}>
            {(p) => <input {...p} className="input" maxLength={40} placeholder="Filling" data-autofocus {...register("label")} />}
          </Field>
          <Field label="Name for staff" hint="To tell similar lists apart." error={errors.name}>
            {(p) => <input {...p} className="input" maxLength={60} placeholder="Filling (rabokki)" {...register("name")} />}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fewest picks" hint="0 makes the list optional." error={errors.min_select}>
            {(p) => <input {...p} type="number" min={0} className="input" {...register("min_select")} />}
          </Field>
          <Field label="Most picks" error={errors.max_select}>
            {(p) => <input {...p} type="number" min={1} max={10} className="input" {...register("max_select")} />}
          </Field>
        </div>

        <div>
          <p className="label">Options</p>
          <div className="space-y-2">
            {options.fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-[12px] border border-line bg-sunken p-2 sm:grid-cols-[1fr_120px_110px_auto]">
                <input className="input" placeholder="Option, like Paneer" aria-label={`Option ${i + 1}`} maxLength={40} {...register(`options.${i}.label`)} />
                <div className="flex items-center gap-1 sm:order-last">
                  <Switch checked={watch(`options.${i}.is_available`)} onChange={(v) => setValue(`options.${i}.is_available`, v, { shouldDirty: true })} label="In stock" hideLabel size="sm" />
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={i === 0} onClick={() => options.move(i, i - 1)} aria-label="Move up"><ChevronUp size={16} /></button>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm !text-red" disabled={options.fields.length === 1} onClick={() => options.remove(i)} aria-label="Remove option"><Trash2 size={16} /></button>
                </div>
                <select className="select" aria-label="Diet" {...register(`options.${i}.diet`)}>
                  <option value="">No mark</option>
                  <option value="veg">Veg</option>
                  <option value="nonveg">Non-veg</option>
                  <option value="egg">Egg</option>
                </select>
                <div className="input-prefix">
                  <span>+₹</span>
                  <input type="number" min={0} className="input !pl-9" aria-label="Extra price" {...register(`options.${i}.price_delta`)} />
                </div>
              </div>
            ))}
          </div>
          {optionError && <p className="field-error">{optionError}</p>}
          <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={() => options.append({ label: "", diet: "", price_delta: 0, is_available: true })}>
            <Plus size={14} /> Add option
          </button>
        </div>
      </form>
    </Modal>
  );
}
