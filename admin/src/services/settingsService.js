import { supabase } from "../lib/supabase";
import { pick } from "./pick";

const live = {
  async getSettings() {
    const { data, error } = await supabase.from("restaurant_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data;
  },

  async setOrderingOpen(open) {
    const { error } = await supabase.from("restaurant_settings").update({ ordering_open: open }).eq("id", 1);
    if (error) throw error;
  },

  async updateSettings(fields) {
    const { error } = await supabase.from("restaurant_settings").update(fields).eq("id", 1);
    if (error) throw error;
  },
};

export const { getSettings, setOrderingOpen, updateSettings } = pick("settings", live);
