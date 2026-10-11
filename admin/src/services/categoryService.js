import { supabase } from "../lib/supabase";

export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*, dishes(count)")
    .order("sort_order");
  if (error) throw error;
  return (data || []).map((c) => ({ ...c, dish_count: c.dishes?.[0]?.count ?? 0 }));
}

export async function setCategoryVisible(id, visible) {
  const { error } = await supabase.from("categories").update({ is_visible: visible }).eq("id", id);
  if (error) throw error;
}

export async function getCategory(id) {
  const { data, error } = await supabase
    .from("categories")
    .select("*, category_groups(*), category_addons(addon_id)")
    .eq("id", id)
    .order("sort_order", { referencedTable: "category_groups" })
    .single();
  if (error) throw error;
  return data;
}

export async function saveCategory(payload) {
  const { data, error } = await supabase.rpc("staff_save_category", {
    p: payload,
  });
  if (error) throw error;
  return data;
}

export async function deleteCategory(id) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderCategories(ids) {
  const { error } = await supabase.rpc("staff_reorder", {
    p_kind: "categories",
    p_ids: ids,
  });
  if (error) throw error;
}
