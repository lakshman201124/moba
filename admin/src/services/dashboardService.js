import { supabase } from "../lib/supabase";
import { pick } from "./pick";

const live = {
  async getDashboard() {
    const { data, error } = await supabase.rpc("staff_dashboard");
    if (error) throw error;
    return data;
  },
};

export const { getDashboard } = pick("dashboard", live);
