import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { MoreHorizontal, Pencil, ArrowUp, ArrowDown, Eye, EyeOff, Plus } from "lucide-react";
import { reorderCategories, setCategoryVisible } from "../../services/categoryService";
import { queryClient } from "../../lib/queryClient";
import { errorMessage } from "../../lib/errors";
import DishThumb from "../ui/DishThumb";
import Menu, { MenuItem, MenuSeparator } from "../ui/Menu";
import { invalidateMenu } from "./menuQueries";

export function useCategoryVisibility() {
  return useMutation({
    mutationFn: ({ id, visible }) => setCategoryVisible(id, visible),
    onMutate: async ({ id, visible }) => {
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      const before = queryClient.getQueryData(["categories"]);
      queryClient.setQueryData(["categories"], (list) => list?.map((c) => (c.id === id ? { ...c, is_visible: visible } : c)));
      return { before };
    },
    onSuccess: (_d, { visible, name }) => toast.success(visible ? `${name} is on the menu.` : `${name} is hidden from guests.`),
    onError: (e, _v, ctx) => {
      if (ctx?.before) queryClient.setQueryData(["categories"], ctx.before);
      toast.error(errorMessage(e));
    },
    onSettled: () => invalidateMenu("categories", "category"),
  });
}

export default function CategoryList({ categories, selectedId, loading, creating }) {
  const navigate = useNavigate();
  const visibility = useCategoryVisibility();
  const reorder = useMutation({
    mutationFn: (ids) => reorderCategories(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      const before = queryClient.getQueryData(["categories"]);
      queryClient.setQueryData(["categories"], ids.map((id, n) => ({ ...before.find((c) => c.id === id), sort_order: n + 1 })));
      return { before };
    },
    onError: (e, _ids, ctx) => {
      if (ctx?.before) queryClient.setQueryData(["categories"], ctx.before);
      toast.error(errorMessage(e));
    },
    onSettled: () => invalidateMenu("categories"),
  });

  function move(i, d) {
    const ids = categories.map((c) => c.id);
    const [id] = ids.splice(i, 1);
    ids.splice(i + d, 0, id);
    reorder.mutate(ids);
  }

  return (
    <section className="panel overflow-hidden" aria-labelledby="categories-title">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h2 id="categories-title" className="panel-title">
          Categories <span className="text-ink-3 font-semibold tnum">{loading ? "" : categories.length}</span>
        </h2>
        <button onClick={() => navigate("/menu/categories/new")} className="btn btn-ghost btn-sm -mr-1.5" aria-label="Add category">
          <Plus size={15} /> New
        </button>
      </div>
      <ul className="max-h-none lg:max-h-[calc(100dvh-230px)] overflow-y-auto px-2 pb-2 space-y-0.5">
        {loading
          ? Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-2 py-2">
                <div className="skeleton h-11 w-11 !rounded-[10px]" />
                <div className="flex-1 space-y-1.5"><div className="skeleton h-3.5 w-3/4" /><div className="skeleton h-3 w-1/3" /></div>
              </li>
            ))
          : categories.map((c, i) => {
              const on = c.id === selectedId;
              return (
                <li key={c.id} className="relative">
                  <button
                    onClick={() => navigate(`/menu/categories/${c.id}`)}
                    aria-current={on ? "true" : undefined}
                    className={`flex w-full items-center gap-3 rounded-[12px] border px-2 py-2 pr-11 text-left transition-colors ${
                      on ? "border-[#E8E27A] bg-lemon" : "border-transparent hover:bg-hover"
                    }`}
                  >
                    <DishThumb path={c.image_path} size={44} radius={10} className={c.is_visible ? "" : "opacity-50 grayscale"} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-body font-semibold ${c.is_visible ? "" : "text-ink-2"}`}>{c.name}</span>
                      <span className={`block truncate text-cap ${on ? "text-ink-2" : "text-ink-3"}`}>
                        {c.dish_count} {c.dish_count === 1 ? "dish" : "dishes"}
                        {!c.is_visible && " · Hidden"}
                      </span>
                    </span>
                  </button>
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
                    <Menu
                      label={`${c.name} actions`}
                      width={200}
                      trigger={(p) => (
                        <button {...p} className={`btn btn-ghost btn-icon btn-sm ${on ? "hover:!bg-[#EDE97E]" : ""}`}>
                          <MoreHorizontal size={17} />
                        </button>
                      )}
                    >
                      <MenuItem icon={Pencil} onSelect={() => navigate(`/menu/categories/${c.id}?tab=details`)}>Edit details</MenuItem>
                      <MenuItem icon={c.is_visible ? EyeOff : Eye} onSelect={() => visibility.mutate({ id: c.id, visible: !c.is_visible, name: c.name })}>
                        {c.is_visible ? "Hide from menu" : "Show on menu"}
                      </MenuItem>
                      <MenuSeparator />
                      <MenuItem icon={ArrowUp} disabled={i === 0 || reorder.isPending} onSelect={() => move(i, -1)}>Move up</MenuItem>
                      <MenuItem icon={ArrowDown} disabled={i === categories.length - 1 || reorder.isPending} onSelect={() => move(i, 1)}>Move down</MenuItem>
                    </Menu>
                  </span>
                </li>
              );
            })}
        {creating && (
          <li className="flex items-center gap-3 rounded-[12px] border border-[#E8E27A] bg-lemon px-2 py-2">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-dashed border-[#BDB650] text-lemon-ink"><Plus size={18} /></span>
            <span className="text-body font-semibold">New category</span>
          </li>
        )}
      </ul>
    </section>
  );
}
