import { supabase } from "../lib/supabase";
import { pick } from "./pick";

const live = {
  async getChoiceGroups() {
    const { data, error } = await supabase
      .from("choice_groups")
      .select("*, choice_options(*)")
      .order("name")
      .order("sort_order", { referencedTable: "choice_options" });
    if (error) throw error;
    return data || [];
  },

  async getChoiceGroup(id) {
    const { data, error } = await supabase
      .from("choice_groups")
      .select("*, choice_options(*)")
      .eq("id", id)
      .order("sort_order", { referencedTable: "choice_options" })
      .single();
    if (error) throw error;
    return data;
  },

  async saveChoiceGroup(payload) {
    const { data, error } = await supabase.rpc("staff_save_choice_group", { p: payload });
    if (error) throw error;
    return data;
  },

  async deleteChoiceGroup(id) {
    const { error } = await supabase.from("choice_groups").delete().eq("id", id);
    if (error) throw error;
  },

  async setOptionAvailable(id, available) {
    const { error } = await supabase.from("choice_options").update({ is_available: available }).eq("id", id);
    if (error) throw error;
  },

  async getChoiceUsage() {
    const { data, error } = await supabase.from("dish_choice_groups").select("group_id");
    if (error) throw error;
    const usage = {};
    for (const r of data || []) usage[r.group_id] = (usage[r.group_id] || 0) + 1;
    return usage;
  },
};

export const {
  getChoiceGroups, getChoiceGroup, saveChoiceGroup, deleteChoiceGroup, setOptionAvailable, getChoiceUsage,
} = pick("choices", live);
