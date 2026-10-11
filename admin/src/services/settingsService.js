import { supabase } from "../lib/supabase";

export async function getSettings() {
  const { data, error } = await supabase
    .from("restaurant_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data;
}

export async function setOrderingOpen(open) {
  const { error } = await supabase
    .from("restaurant_settings")
    .update({ ordering_open: open })
    .eq("id", 1);
  if (error) throw error;
}
