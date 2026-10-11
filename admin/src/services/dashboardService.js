import { supabase } from "../lib/supabase";

export async function getDashboard() {
  const { data, error } = await supabase.rpc("staff_dashboard");
  if (error) throw error;
  return data;
}
