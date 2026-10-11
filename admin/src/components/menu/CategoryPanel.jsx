import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getCategory } from "../../services/categoryService";
import { errorMessage } from "../../lib/errors";
import DishThumb from "../ui/DishThumb";
import Switch from "../ui/Switch";
import { Tabs } from "../ui/Segmented";
import ErrorState from "../ui/ErrorState";
import DishesTab from "./DishesTab";
import AddonsTab from "./AddonsTab";
import CategoryForm from "./CategoryForm";
import { useCategoryVisibility } from "./CategoryList";

const TABS = ["dishes", "addons", "details"];

export function NewCategoryPanel({ onCancel, showBack }) {
  const navigate = useNavigate();
  return (
    <section className="panel overflow-hidden" aria-label="New category">
      <header className="flex items-center gap-3 border-b border-line px-5 py-4">
        {showBack && (
          <button onClick={() => navigate("/menu")} className="btn btn-ghost btn-icon btn-sm -ml-1.5" aria-label="Back to categories">
            <ArrowLeft size={18} />
          </button>
        )}
        <div>
          <h2 className="text-h3 font-bold">New category</h2>
          <p className="text-meta text-ink-3">Create it, then add dishes and add-ons inside.</p>
        </div>
      </header>
      <CategoryForm onCancel={onCancel} />
    </section>
  );
}

export default function CategoryPanel({ categoryId, summary, categories, showBack }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("tab")) ? params.get("tab") : "dishes";
  const q = useQuery({ queryKey: ["category", categoryId], queryFn: () => getCategory(categoryId) });
  const visibility = useCategoryVisibility();
  const c = q.data;

  const setTab = (t) => {
    const next = new URLSearchParams(params);
    if (t === "dishes") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  };

  if (q.error) {
    return (
      <section className="panel">
        <ErrorState
          message={q.error.code === "PGRST116" ? "This category was deleted." : errorMessage(q.error)}
          onRetry={q.error.code === "PGRST116" ? undefined : q.refetch}
        />
      </section>
    );
  }

  const dishCount = summary?.dish_count ?? 0;
  const addonCount = (c?.category_addons || []).length;
  const visible = summary?.is_visible ?? c?.is_visible;

  return (
    <section className="panel overflow-hidden" aria-labelledby="category-title">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 pt-5 pb-1">
        {showBack && (
          <button onClick={() => navigate("/menu")} className="btn btn-ghost btn-icon btn-sm -ml-1.5" aria-label="Back to categories">
            <ArrowLeft size={18} />
          </button>
        )}
        {c ? (
          <>
            <DishThumb path={c.image_path} size={56} radius={14} />
            <div className="min-w-0 flex-1 basis-40">
              <h2 id="category-title" className="flex flex-wrap items-baseline gap-x-2 text-h3 sm:text-h2 font-bold tracking-[-0.02em]">
                <span className="min-w-0 sm:truncate">{c.name}</span>
                {c.name_ko && <span className="text-title font-semibold text-ink-3" lang="ko">{c.name_ko}</span>}
              </h2>
              <p className="truncate text-meta text-ink-3">
                {dishCount} {dishCount === 1 ? "dish" : "dishes"} · {addonCount} {addonCount === 1 ? "add-on" : "add-ons"}
                {c.blurb && <> · {c.blurb}</>}
              </p>
            </div>
            <div className="flex w-full items-center justify-between gap-2.5 rounded-[12px] border border-line px-3 py-2 sm:w-auto">
              <span className={`text-meta font-semibold ${visible ? "text-green-ink" : "text-ink-3"}`}>{visible ? "On the menu" : "Hidden"}</span>
              <Switch
                checked={!!visible}
                onChange={(v) => visibility.mutate({ id: c.id, visible: v, name: c.name })}
                label={`Show ${c.name} on the menu`}
                hideLabel
                size="sm"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center gap-4">
            <div className="skeleton h-14 w-14 !rounded-[14px]" />
            <div className="flex-1 space-y-2"><div className="skeleton h-6 w-48" /><div className="skeleton h-3.5 w-64" /></div>
          </div>
        )}
      </header>

      <Tabs
        className="mt-3 px-5"
        label="Category sections"
        value={tab}
        onChange={setTab}
        options={[
          { value: "dishes", label: "Dishes", count: dishCount },
          { value: "addons", label: "Add-ons", count: c ? addonCount : undefined },
          { value: "details", label: "Details" },
        ]}
      />

      {!c ? (
        <div className="space-y-2 p-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-[68px]" />)}</div>
      ) : tab === "dishes" ? (
        <DishesTab key={c.id} category={c} />
      ) : tab === "addons" ? (
        <AddonsTab key={c.id} category={c} categories={categories} />
      ) : (
        <CategoryForm key={c.id} category={c} dishCount={dishCount} />
      )}
    </section>
  );
}
