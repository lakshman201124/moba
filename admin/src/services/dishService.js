import { supabase } from "../lib/supabase";
import { pick } from "./pick";

const live = {
  async getDishesByCategory(categoryId) {
    const { data, error } = await supabase
      .from("dishes")
      .select("*, dish_sizes(*), dish_choice_groups(group_id, sort_order)")
      .eq("category_id", categoryId)
      .order("sort_order")
      .order("sort_order", { referencedTable: "dish_sizes" });
    if (error) throw error;
    return data || [];
  },

  // Names and photos only, so order screens can show a thumbnail beside each line.
  async getAllDishes() {
    const { data, error } = await supabase.from("dishes").select("id, name, image_path, category_id");
    if (error) throw error;
    return data || [];
  },

  async getDish(id) {
    const { data, error } = await supabase
      .from("dishes")
      .select("*, dish_sizes(*), dish_choice_groups(group_id, sort_order)")
      .eq("id", id)
      .order("sort_order", { referencedTable: "dish_sizes" })
      .order("sort_order", { referencedTable: "dish_choice_groups" })
      .single();
    if (error) throw error;
    return data;
  },

  async saveDish(payload) {
    const { data, error } = await supabase.rpc("staff_save_dish", { p: payload });
    if (error) throw error;
    return data;
  },

  async deleteDish(id) {
    const { error } = await supabase.from("dishes").delete().eq("id", id);
    if (error) throw error;
  },

  async setDishAvailable(id, available) {
    const { error } = await supabase.from("dishes").update({ is_available: available }).eq("id", id);
    if (error) throw error;
  },

  async setDishVisible(id, visible) {
    const { error } = await supabase.from("dishes").update({ is_visible: visible }).eq("id", id);
    if (error) throw error;
  },

  async reorderDishes(ids) {
    const { error } = await supabase.rpc("staff_reorder", { p_kind: "dishes", p_ids: ids });
    if (error) throw error;
  },
};

export const {
  getDishesByCategory, getAllDishes, getDish, saveDish, deleteDish, setDishAvailable, setDishVisible, reorderDishes,
} = pick("dishes", live);
