import { useEffect } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, Plus } from "lucide-react";
import { getCategories } from "../services/categoryService";
import { getDish } from "../services/dishService";
import { errorMessage } from "../lib/errors";
import { isUuid } from "../lib/ids";
import { useMediaQuery } from "../hooks/useNow";
import PageHeader from "../components/ui/PageHeader";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import MenuTabs from "../components/menu/MenuTabs";
import CategoryList from "../components/menu/CategoryList";
import CategoryPanel, { NewCategoryPanel } from "../components/menu/CategoryPanel";
import DishDrawer from "../components/menu/DishDrawer";
import NotFoundPage from "./NotFoundPage";

// /menu                         categories, first one open on wide screens
// /menu/categories/:id(?tab=)    one category: dishes, add-ons or details
// /menu/categories/new           a new category
// /menu/dishes/:id, /new?category=  the dish editor over its category
export default function MenuPage({ mode }) {
  const params = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const wide = useMediaQuery("(min-width: 1024px)");

  const cats = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const dishId = mode === "dish" ? params.dishId : null;
  const dish = useQuery({ queryKey: ["dish", dishId], queryFn: () => getDish(dishId), enabled: isUuid(dishId) });

  const presetCategory = mode === "new-dish" ? search.get("category") : null;
  const categoryId = params.categoryId || (mode === "dish" ? dish.data?.category_id : presetCategory) || null;
  const categories = cats.data || [];
  const summary = categories.find((c) => c.id === categoryId);

  const first = categories[0]?.id;
  const shouldPickFirst = wide && !mode && !params.categoryId && first;
  useEffect(() => {
    if (shouldPickFirst) navigate(`/menu/categories/${first}`, { replace: true });
  }, [shouldPickFirst, first, navigate]);

  if (params.categoryId && !isUuid(params.categoryId)) return <NotFoundPage message="That category doesn't exist." backTo="/menu" backLabel="Back to the menu" />;
  if (mode === "dish" && !isUuid(params.dishId)) return <NotFoundPage message="That dish doesn't exist." backTo="/menu" backLabel="Back to the menu" />;
  if (mode === "new-dish" && presetCategory && !isUuid(presetCategory)) return <Navigate to="/menu" replace />;

  const closeDish = () => navigate(categoryId ? `/menu/categories/${categoryId}` : "/menu", { replace: true });
  const creating = mode === "new-category";
  const showDetail = creating || !!categoryId;

  const right = creating ? (
    <NewCategoryPanel onCancel={() => navigate("/menu")} showBack={!wide} />
  ) : categoryId ? (
    <CategoryPanel key={categoryId} categoryId={categoryId} summary={summary} categories={categories} showBack={!wide} />
  ) : null;

  return (
    <>
      <PageHeader title="Menu" subtitle="Categories, dishes and add-ons. Changes reach guests' phones straight away." actions={<MenuTabs active="categories" />} />

      {cats.error ? (
        <div className="panel"><ErrorState message={errorMessage(cats.error)} onRetry={cats.refetch} /></div>
      ) : !cats.isLoading && !categories.length && !creating ? (
        <div className="panel">
          <EmptyState
            icon={BookOpenText}
            title="Start your menu"
            message="Make a category, like Starters or Boba Bar, then add dishes and add-ons inside it."
            action="Add category"
            actionIcon={Plus}
            onAction={() => navigate("/menu/categories/new")}
          />
        </div>
      ) : wide ? (
        <div className="grid grid-cols-[300px_minmax(0,1fr)] items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-6">
            <CategoryList categories={categories} selectedId={creating ? null : categoryId} loading={cats.isLoading} creating={creating} />
          </div>
          {right || <div className="panel skeleton h-[480px]" />}
        </div>
      ) : showDetail ? (
        right
      ) : (
        <CategoryList categories={categories} selectedId={null} loading={cats.isLoading} />
      )}

      {(mode === "dish" || mode === "new-dish") && (
        <DishDrawer
          key={dishId || `new-${presetCategory}`}
          dishId={dishId}
          presetCategory={presetCategory}
          categories={categories}
          onClose={closeDish}
        />
      )}
    </>
  );
}
