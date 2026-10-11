import { useNavigate } from "react-router-dom";
import { Plus, LayoutList, CirclePlus, ListChecks } from "lucide-react";
import { SegmentedLinks } from "../ui/Segmented";

export default function MenuTabs({ active, showAdd = true }) {
  const navigate = useNavigate();
  return (
    <>
      <SegmentedLinks
        label="Menu sections"
        items={[
          { to: "/menu", label: "Categories", icon: LayoutList, active: active === "categories" },
          { to: "/menu/addons", label: "Add-ons", icon: CirclePlus, active: active === "addons" },
          { to: "/menu/choices", label: "Choice lists", icon: ListChecks, active: active === "choices" },
        ]}
      />
      {showAdd && (
        <button onClick={() => navigate("/menu/categories/new")} className="btn btn-primary">
          <Plus size={16} /> Add category
        </button>
      )}
    </>
  );
}
