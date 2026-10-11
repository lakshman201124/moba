import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getCategories, reorderCategories, setCategoryVisible } from "../services/categoryService";
import { queryClient } from "../lib/queryClient";
import { errorMessage } from "../lib/errors";
import { useState } from "react";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import Switch from "../components/ui/Switch";
import toast from "react-hot-toast";
import { Plus, ChevronUp, ChevronDown } from "lucide-react";

export default function MenuPage() {
  const navigate = useNavigate();

  const { data: categories, isLoading, error, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const reorder = useMutation({
    mutationFn: (ids) => reorderCategories(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err) => toast.error(errorMessage(err)),
  });

  const toggleVisible = useMutation({
    mutationFn: ({ id, visible }) => setCategoryVisible(id, visible),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err) => toast.error(errorMessage(err)),
  });

  function moveCategory(idx, dir) {
    const ids = categories.map((c) => c.id);
    const [id] = ids.splice(idx, 1);
    ids.splice(idx + dir, 0, id);
    reorder.mutate(ids);
  }

  if (isLoading)
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-40 mb-4" />
        <Skeleton className="h-16" count={6} />
      </div>
    );
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl mb-4">Menu</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <TabButton active label="Categories" />
        <TabButton to="/menu/choices" label="Choices" navigate={navigate} />
        <TabButton to="/menu/addons" label="Add-ons" navigate={navigate} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">Categories</h2>
        <button
          onClick={() => navigate("/menu/categories/new")}
          className="btn-primary text-sm"
        >
          <Plus size={16} /> Add category
        </button>
      </div>

      {!categories?.length ? (
        <EmptyState
          title="No categories yet"
          message="Create categories to organize your dishes."
          action="Add category"
          onAction={() => navigate("/menu/categories/new")}
        />
      ) : (
        <div className="space-y-2">
          {categories.map((c, i) => (
            <div
              key={c.id}
              className="card flex items-center gap-3 cursor-pointer hover:border-cobalt transition-colors"
              onClick={() => navigate(`/menu/categories/${c.id}`)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">
                  {c.name}
                  {c.name_ko && (
                    <span className="text-ink/40 ml-1" lang="ko">
                      {c.name_ko}
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink/50">
                  {c.dish_count || 0} dishes
                </p>
              </div>

              <Switch
                checked={c.is_visible}
                onChange={(on) => {
                  toggleVisible.mutate({ id: c.id, visible: on });
                }}
                disabled={toggleVisible.isPending}
                label=""
              />

              <div
                className="flex flex-col gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => moveCategory(i, -1)}
                  disabled={i === 0 || reorder.isPending}
                  className="p-1 rounded hover:bg-ink/6 disabled:opacity-20"
                  aria-label="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveCategory(i, 1)}
                  disabled={i === categories.length - 1 || reorder.isPending}
                  className="p-1 rounded hover:bg-ink/6 disabled:opacity-20"
                  aria-label="Move down"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({ label, active, to, navigate }) {
  return (
    <button
      onClick={() => to && navigate(to)}
      className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border-2 ${
        active
          ? "border-cobalt bg-cobalt text-white"
          : "border-line bg-paper text-ink/60 hover:border-cobalt"
      }`}
    >
      {label}
    </button>
  );
}
