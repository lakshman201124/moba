import { supabase } from "../lib/supabase";

export async function getDishesByCategory(categoryId) {
  const { data, error } = await supabase
    .from("dishes")
    .select("*, dish_sizes(*), dish_choice_groups(group_id, sort_order)")
    .eq("category_id", categoryId)
    .order("sort_order")
    .order("sort_order", { referencedTable: "dish_sizes" });
  if (error) throw error;
  return data || [];
}

export async function getDish(id) {
  const { data, error } = await supabase
    .from("dishes")
    .select("*, dish_sizes(*), dish_choice_groups(group_id, sort_order)")
    .eq("id", id)
    .order("sort_order", { referencedTable: "dish_sizes" })
    .order("sort_order", { referencedTable: "dish_choice_groups" })
    .single();
  if (error) throw error;
  return data;
}

export async function saveDish(payload) {
  const { data, error } = await supabase.rpc("staff_save_dish", {
    p: payload,
  });
  if (error) throw error;
  return data;
}

export async function deleteDish(id) {
  const { error } = await supabase.from("dishes").delete().eq("id", id);
  if (error) throw error;
}

export async function setDishAvailable(id, available) {
  const { error } = await supabase
    .from("dishes")
    .update({ is_available: available })
    .eq("id", id);
  if (error) throw error;
}

export async function setDishVisible(id, visible) {
  const { error } = await supabase
    .from("dishes")
    .update({ is_visible: visible })
    .eq("id", id);
  if (error) throw error;
}

export async function reorderDishes(ids) {
  const { error } = await supabase.rpc("staff_reorder", {
    p_kind: "dishes",
    p_ids: ids,
  });
  if (error) throw error;
}
