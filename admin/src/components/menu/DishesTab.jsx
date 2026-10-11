import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Search, MoreHorizontal, Pencil, Eye, EyeOff, ArrowUp, ArrowDown, UtensilsCrossed } from "lucide-react";
import { getDishesByCategory, setDishAvailable, setDishVisible, reorderDishes } from "../../services/dishService";
import { queryClient } from "../../lib/queryClient";
import { errorMessage } from "../../lib/errors";
import DishThumb from "../ui/DishThumb";
import DietMark, { SpiceMark } from "../ui/DietMark";
import Switch from "../ui/Switch";
import Menu, { MenuItem, MenuSeparator } from "../ui/Menu";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import { Segmented } from "../ui/Segmented";
import { invalidateMenu, priceText } from "./menuQueries";

function usePatchDish(categoryId, fn, message) {
  return useMutation({
    mutationFn: ({ id, v }) => fn(id, v),
    onMutate: async ({ id, v, field }) => {
      await queryClient.cancelQueries({ queryKey: ["dishes", categoryId] });
      const before = queryClient.getQueryData(["dishes", categoryId]);
      queryClient.setQueryData(["dishes", categoryId], (list) => list?.map((d) => (d.id === id ? { ...d, [field]: v } : d)));
      return { before };
    },
    onSuccess: (_d, vars) => toast.success(message(vars), { id: `dish-${vars.id}` }),
    onError: (e, _v, ctx) => {
      if (ctx?.before) queryClient.setQueryData(["dishes", categoryId], ctx.before);
      toast.error(errorMessage(e));
    },
    onSettled: () => invalidateMenu("dishes", "dish", "categories"),
  });
}

export default function DishesTab({ category }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const q = useQuery({ queryKey: ["dishes", category.id], queryFn: () => getDishesByCategory(category.id) });
  const dishes = q.data || [];

  const avail = usePatchDish(category.id, setDishAvailable, ({ v, name }) => (v ? `${name} is back in stock.` : `${name} marked sold out.`));
  const vis = usePatchDish(category.id, setDishVisible, ({ v, name }) => (v ? `${name} is on the menu.` : `${name} is hidden from guests.`));
  const reorder = useMutation({
    mutationFn: (ids) => reorderDishes(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["dishes", category.id] });
      const before = queryClient.getQueryData(["dishes", category.id]);
      queryClient.setQueryData(["dishes", category.id], ids.map((id, n) => ({ ...before.find((d) => d.id === id), sort_order: n + 1 })));
      return { before };
    },
    onError: (e, _ids, ctx) => {
      if (ctx?.before) queryClient.setQueryData(["dishes", category.id], ctx.before);
      toast.error(errorMessage(e));
    },
    onSettled: () => invalidateMenu("dishes"),
  });

  const counts = {
    all: dishes.length,
    soldout: dishes.filter((d) => !d.is_available).length,
    hidden: dishes.filter((d) => !d.is_visible).length,
  };

  const shown = useMemo(() => {
    const t = term.trim().toLowerCase();
    return dishes.filter(
      (d) =>
        (filter === "all" || (filter === "soldout" ? !d.is_available : !d.is_visible)) &&
        (!t || d.name.toLowerCase().includes(t) || (d.description || "").toLowerCase().includes(t)),
    );
  }, [dishes, term, filter]);

  const groups = category.category_groups || [];
  const sections = groups.length
    ? [
        ...groups.map((g) => ({ key: g.id, title: g.name, ko: g.name_ko, items: shown.filter((d) => d.group_id === g.id) })),
        { key: "none", title: "Not in a sub-section", items: shown.filter((d) => !d.group_id || !groups.some((g) => g.id === d.group_id)) },
      ].filter((s) => s.items.length)
    : [{ key: "all", items: shown }];

  function move(d, dir) {
    const ids = dishes.map((x) => x.id);
    const i = ids.indexOf(d.id);
    ids.splice(i, 1);
    ids.splice(i + dir, 0, d.id);
    reorder.mutate(ids);
  }

  const addDish = () => navigate(`/menu/dishes/new?category=${category.id}`);

  if (q.error) return <ErrorState message={errorMessage(q.error)} onRetry={q.refetch} compact />;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-5 py-4">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">Search dishes in {category.name}</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={`Search ${category.short_name || category.name}`} className="input pl-9" inputMode="search" />
        </label>
        <Segmented
          size="sm"
          plain
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "soldout", label: "Sold out", count: counts.soldout },
            { value: "hidden", label: "Hidden", count: counts.hidden },
          ]}
        />
        <button onClick={addDish} className="btn btn-primary">
          <Plus size={16} /> Add dish
        </button>
      </div>

      {q.isLoading ? (
        <div className="space-y-2 px-5 pb-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-[72px]" />)}</div>
      ) : !dishes.length ? (
        <EmptyState
          icon={UtensilsCrossed}
          title={`No dishes in ${category.name} yet`}
          message="Add the first one: a photo, a name and a price is all it takes."
          action="Add dish"
          actionIcon={Plus}
          onAction={addDish}
        />
      ) : !shown.length ? (
        <p className="px-5 pb-10 pt-4 text-center text-body text-ink-2">
          No dishes match. <button className="font-semibold text-cobalt-ink hover:underline" onClick={() => { setTerm(""); setFilter("all"); }}>Show all</button>
        </p>
      ) : (
        <div className="pb-2">
          {sections.map((s) => (
            <div key={s.key}>
              {s.title && (
                <p className="sticky top-0 z-[1] border-y border-line bg-sunken px-5 py-1.5 text-cap font-bold text-ink-2">
                  {s.title} {s.ko && <span className="font-medium text-ink-3" lang="ko">{s.ko}</span>}
                  <span className="ml-1.5 font-medium text-ink-3 tnum">{s.items.length}</span>
                </p>
              )}
              <ul className="divide-line">
                {s.items.map((d) => {
                  const idx = dishes.indexOf(d);
                  return (
                    <li key={d.id} className={`group relative flex items-center gap-3 sm:gap-3.5 px-4 sm:px-5 py-3 transition-colors hover:bg-sunken ${d.is_visible ? "" : "bg-sunken/60"}`}>
                      <button onClick={() => navigate(`/menu/dishes/${d.id}`)} className="absolute inset-0" aria-label={`Edit ${d.name}`} />
                      <DishThumb path={d.image_path} size={52} radius={12} className={`pointer-events-none relative ${d.is_visible ? "" : "opacity-50"}`} />
                      <div className="pointer-events-none relative min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <DietMark diet={d.diet} size={13} slot />
                          <p className={`line-clamp-2 sm:truncate text-body font-semibold ${d.is_visible ? "" : "text-ink-2"}`}>{d.name}</p>
                          <span className="hidden sm:contents">
                            <SpiceMark level={d.spice} size={12} />
                            {d.badge && <span className="chip chip-lemon !h-5 !px-1.5 !text-[10px] capitalize">{d.badge}</span>}
                          </span>
                          {!d.is_visible && <span className="chip chip-off !h-5 !px-1.5 !text-[10px]">Hidden</span>}
                        </div>
                        {d.description && <p className="mt-0.5 hidden truncate text-meta text-ink-3 sm:block">{d.description}</p>}
                        <p className="mt-0.5 flex items-center gap-1.5 text-meta sm:hidden">
                          <span className="font-semibold tnum">{priceText(d)}</span>
                          <SpiceMark level={d.spice} size={12} />
                          {!d.is_available && <span className="font-semibold text-red">Sold out</span>}
                        </p>
                      </div>
                      <p className="pointer-events-none relative w-[88px] shrink-0 text-right text-body font-semibold tnum hidden sm:block">{priceText(d)}</p>
                      <div className="relative flex shrink-0 items-center justify-end gap-2 md:w-[92px]">
                        <span className={`hidden md:inline text-cap font-semibold ${d.is_available ? "text-green-ink" : "text-red"}`}>
                          {d.is_available ? "In stock" : "Sold out"}
                        </span>
                        <Switch
                          checked={d.is_available}
                          onChange={(v) => avail.mutate({ id: d.id, v, field: "is_available", name: d.name })}
                          label={`${d.name} in stock`}
                          hideLabel
                          size="sm"
                        />
                      </div>
                      <span className="relative">
                        <Menu
                          label={`${d.name} actions`}
                          width={200}
                          trigger={(p) => (
                            <button {...p} className="btn btn-ghost btn-icon btn-sm">
                              <MoreHorizontal size={17} />
                            </button>
                          )}
                        >
                          <MenuItem icon={Pencil} onSelect={() => navigate(`/menu/dishes/${d.id}`)}>Edit dish</MenuItem>
                          <MenuItem icon={d.is_visible ? EyeOff : Eye} onSelect={() => vis.mutate({ id: d.id, v: !d.is_visible, field: "is_visible", name: d.name })}>
                            {d.is_visible ? "Hide from menu" : "Show on menu"}
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem icon={ArrowUp} disabled={idx === 0 || reorder.isPending || !!term || filter !== "all"} onSelect={() => move(d, -1)}>Move up</MenuItem>
                          <MenuItem icon={ArrowDown} disabled={idx === dishes.length - 1 || reorder.isPending || !!term || filter !== "all"} onSelect={() => move(d, 1)}>Move down</MenuItem>
                        </Menu>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
