import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import {
  getChoiceGroups, saveChoiceGroup, deleteChoiceGroup, setOptionAvailable, getChoiceUsage,
} from "../services/choiceService";
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
  name: z.string().trim().min(1, "Staff name is required").max(60),
  label: z.string().trim().min(1, "The label diners see is required").max(40),
  min_select: z.coerce.number().int().min(0),
  max_select: z.coerce.number().int().min(1).max(10),
  options: z.array(z.object({
    id: z.string().optional(),
    label: z.string().trim().min(1, "Each option needs a name").max(40),
    diet: z.enum(["", "veg", "nonveg", "egg"]),
    price_delta: z.coerce.number().int("Extra price must be a whole number").min(0).max(10000),
    is_available: z.boolean(),
  })).min(1, "Add at least one option"),
}).superRefine((v, ctx) => {
  if (v.min_select > v.max_select) ctx.addIssue({ code: "custom", path: ["min_select"], message: "Minimum can't be more than maximum" });
  if (v.min_select > v.options.length) ctx.addIssue({ code: "custom", path: ["min_select"], message: "Minimum is more than the number of options" });
  const labels = v.options.map((o) => o.label.toLowerCase());
  if (new Set(labels).size !== labels.length) ctx.addIssue({ code: "custom", path: ["options"], message: "Two options have the same name" });
});

const ruleText = (g) =>
  g.min_select === 0 ? `Optional, up to ${g.max_select}` : g.min_select === g.max_select ? `Pick ${g.min_select}` : `Pick ${g.min_select} to ${g.max_select}`;

export default function ChoicesPage() {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const groups = useQuery({ queryKey: ["choice-groups"], queryFn: getChoiceGroups });
  const usage = useQuery({ queryKey: ["choice-usage"], queryFn: getChoiceUsage });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["choice-groups"] });
    queryClient.invalidateQueries({ queryKey: ["choice-usage"] });
  };

  const toggle = useMutation({
    mutationFn: ({ id, v }) => setOptionAvailable(id, v),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = useMutation({
    mutationFn: (id) => deleteChoiceGroup(id),
    onSuccess: () => { refresh(); toast.success("Choice list deleted."); setDeleting(null); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl mb-4">Menu</h1>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <Tab label="Categories" onClick={() => navigate("/menu")} />
        <Tab label="Choices" active />
        <Tab label="Add-ons" onClick={() => navigate("/menu/addons")} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">Choice lists</h2>
        <button className="btn-primary text-sm" onClick={() => setEditing({})}><Plus size={16} /> Add list</button>
      </div>

      {groups.isLoading ? <Skeleton className="h-32" count={3} />
        : groups.error ? <ErrorState message={groups.error.message} onRetry={groups.refetch} />
        : !groups.data?.length ? (
          <EmptyState title="No choice lists yet" message="Choice lists are reusable pick lists, like Filling or Base." action="Add list" onAction={() => setEditing({})} />
        ) : (
          <div className="space-y-3">
            {groups.data.map((g) => {
              const used = usage.data?.[g.id] ?? 0;
              return (
                <div key={g.id} className="card">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm">{g.name}</p>
                      <p className="text-xs text-ink/50">Diners see "{g.label}" · {ruleText(g)} · Used by {used} {used === 1 ? "dish" : "dishes"}</p>
                    </div>
                    <div className="flex shrink-0">
                      <button className="p-2 rounded hover:bg-ink/6" aria-label={`Edit ${g.name}`} onClick={() => setEditing(g)}><Pencil size={16} /></button>
                      <button className="p-2 rounded hover:bg-ink/6 text-nonveg disabled:opacity-30" disabled={used > 0}
                        title={used > 0 ? "In use by dishes" : "Delete"} aria-label={`Delete ${g.name}`} onClick={() => setDeleting(g)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="divide-y divide-line">
                    {(g.choice_options || []).map((o) => (
                      <div key={o.id} className="flex items-center gap-2 py-1.5 min-h-[44px]">
                        <DietMark diet={o.diet} />
                        <span className={`flex-1 text-sm ${o.is_available ? "" : "line-through text-ink/40"}`}>
                          {o.label}{o.price_delta > 0 && <span className="text-ink/50"> +{rupee(o.price_delta)}</span>}
                        </span>
                        <span className="text-xs text-ink/50">{o.is_available ? "In stock" : "Out today"}</span>
                        <Switch checked={o.is_available} onChange={(v) => toggle.mutate({ id: o.id, v })} label="" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {editing && <GroupModal group={editing} onClose={() => setEditing(null)} onSaved={() => { refresh(); setEditing(null); }} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => del.mutate(deleting.id)}
        title={`Delete ${deleting?.name}?`} message="This can't be undone." confirmLabel="Delete" danger loading={del.isPending} />
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border-2 ${active ? "border-cobalt bg-cobalt text-white" : "border-line bg-paper text-ink/60 hover:border-cobalt"}`}>{label}</button>
  );
}

function GroupModal({ group, onClose, onSaved }) {
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
    onSuccess: () => { toast.success("Choice list saved."); queryClient.invalidateQueries({ queryKey: ["dish"] }); onSaved(); },
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
    save.mutate({
      id: isNew ? null : group.id, name: v.name, label: v.label, min_select: v.min_select, max_select: v.max_select,
      options: v.options.map((o) => ({ id: o.id || null, label: o.label, diet: o.diet || null, price_delta: o.price_delta, is_available: o.is_available })),
    });
  });

  const input = "block w-full rounded-lg border-2 border-line bg-cream px-3 py-2.5 text-sm focus:border-cobalt focus:outline-none";
  const err = (k) => errors[k] && <p className="text-xs text-nonveg mt-1">{errors[k]}</p>;

  return (
    <Modal open onClose={onClose} title={isNew ? "New choice list" : "Edit choice list"} wide>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block"><span className="text-sm font-semibold">Staff name</span>
          <input className={input} maxLength={60} placeholder="e.g. Filling (rabokki)" {...register("name")} />{err("name")}</label>
        <label className="block"><span className="text-sm font-semibold">Label diners see</span>
          <input className={input} maxLength={40} placeholder="e.g. Filling" {...register("label")} />{err("label")}</label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-sm font-semibold">Minimum picks</span>
            <input type="number" min={0} className={input} {...register("min_select")} />{err("min_select")}</label>
          <label className="block"><span className="text-sm font-semibold">Maximum picks</span>
            <input type="number" min={1} max={10} className={input} {...register("max_select")} /></label>
        </div>
        <p className="text-xs text-ink/50">Minimum 0 makes the list optional.</p>

        <div className="space-y-2">
          <span className="text-sm font-semibold">Options</span>
          {options.fields.map((f, i) => (
            <div key={f.id} className="border-2 border-line rounded-xl p-2 space-y-2">
              <input className={input} placeholder="Option name" maxLength={40} {...register(`options.${i}.label`)} />
              <div className="flex items-center gap-2">
                <select className={input} aria-label="Diet" {...register(`options.${i}.diet`)}>
                  <option value="">No mark</option><option value="veg">Veg</option><option value="nonveg">Non-veg</option><option value="egg">Egg</option>
                </select>
                <input type="number" min={0} className={`${input} max-w-[100px]`} aria-label="Extra price" placeholder="+₹" {...register(`options.${i}.price_delta`)} />
                <Switch checked={watch(`options.${i}.is_available`)} onChange={(v) => setValue(`options.${i}.is_available`, v, { shouldDirty: true })} label="" />
                <button type="button" className="p-2 rounded hover:bg-ink/6 disabled:opacity-20" disabled={i === 0} onClick={() => options.move(i, i - 1)} aria-label="Move up"><ChevronUp size={16} /></button>
                <button type="button" className="p-2 rounded hover:bg-ink/6 text-nonveg disabled:opacity-20" disabled={options.fields.length === 1} onClick={() => options.remove(i)} aria-label="Remove option"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {err("options")}
          <button type="button" className="btn-secondary text-sm" onClick={() => options.append({ label: "", diet: "", price_delta: 0, is_available: true })}><Plus size={14} /> Add option</button>
        </div>

        <button type="submit" disabled={save.isPending} className="btn-primary w-full">{save.isPending ? "Saving…" : "Save choice list"}</button>
      </form>
    </Modal>
  );
}
