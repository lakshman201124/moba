import { supabase } from "../lib/supabase";
import { pick } from "./pick";

const live = {
  async getCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("*, dishes(count)")
      .order("sort_order");
    if (error) throw error;
    return (data || []).map((c) => ({ ...c, dish_count: c.dishes?.[0]?.count ?? 0 }));
  },

  async setCategoryVisible(id, visible) {
    const { error } = await supabase.from("categories").update({ is_visible: visible }).eq("id", id);
    if (error) throw error;
  },

  async getCategory(id) {
    const { data, error } = await supabase
      .from("categories")
      .select("*, category_groups(*), category_addons(addon_id)")
      .eq("id", id)
      .order("sort_order", { referencedTable: "category_groups" })
      .single();
    if (error) throw error;
    return data;
  },

  async saveCategory(payload) {
    const { data, error } = await supabase.rpc("staff_save_category", { p: payload });
    if (error) throw error;
    return data;
  },

  async deleteCategory(id) {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
  },

  async reorderCategories(ids) {
    const { error } = await supabase.rpc("staff_reorder", { p_kind: "categories", p_ids: ids });
    if (error) throw error;
  },
};

export const {
  getCategories, setCategoryVisible, getCategory, saveCategory, deleteCategory, reorderCategories,
} = pick("categories", live);
