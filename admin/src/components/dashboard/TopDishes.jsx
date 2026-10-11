import { Link } from "react-router-dom";
import { ArrowRight, UtensilsCrossed } from "lucide-react";
import DishThumb from "../ui/DishThumb";
import EmptyState from "../ui/EmptyState";
import { rupee, plural } from "../../lib/format";

export default function TopDishes({ dishes, images, loading, rangeLabel }) {
  const max = Math.max(1, ...(dishes || []).map((d) => d.qty));
  return (
    <section className="panel p-5 h-full flex flex-col" aria-labelledby="top-dishes-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="top-dishes-title" className="panel-title">Top dishes</h2>
          <p className="text-cap text-ink-3 mt-0.5">Most ordered · {rangeLabel.toLowerCase()}</p>
        </div>
        <Link to="/menu" className="inline-flex items-center gap-1 text-meta font-semibold text-ink-2 hover:text-ink">
          Menu <ArrowRight size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton h-10 w-10 !rounded-[10px]" />
              <div className="flex-1 space-y-1.5"><div className="skeleton h-3.5 w-2/3" /><div className="skeleton h-2 w-full" /></div>
            </div>
          ))}
        </div>
      ) : !dishes?.length ? (
        <EmptyState icon={UtensilsCrossed} compact title="No dishes sold yet" message="Your best sellers show up here once orders come in." />
      ) : (
        <ol className="mt-3 flex-1 divide-line">
          {dishes.map((d, i) => (
            <li key={d.key} className="flex items-center gap-3 py-2.5">
              <DishThumb path={images?.[d.dish_id]} size={40} radius={10} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-body font-semibold">
                    <span className="text-ink-3 tnum mr-1.5">{i + 1}</span>
                    {d.name}
                  </p>
                  <p className="text-body font-bold tnum shrink-0">{rupee(d.revenue)}</p>
                </div>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <div className="h-1.5 flex-1 rounded-full bg-cobalt-soft overflow-hidden">
                    <div className="h-full rounded-full bg-chart" style={{ width: `${(d.qty / max) * 100}%` }} />
                  </div>
                  <span className="w-[52px] text-right text-cap text-ink-3 tnum">{plural(d.qty, "sold", "sold")}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
