import { supabase } from "../lib/supabase";

export async function getAddons() {
  const { data, error } = await supabase
    .from("addons")
    .select("*, category_addons(category_id)")
    .order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function getAddon(id) {
  const { data, error } = await supabase
    .from("addons")
    .select("*, category_addons(category_id)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createAddon(addon) {
  const { category_ids, ...fields } = addon;
  const { data, error } = await supabase
    .from("addons")
    .insert(fields)
    .select()
    .single();
  if (error) throw error;

  if (category_ids?.length) {
    const rows = category_ids.map((cid) => ({
      category_id: cid,
      addon_id: data.id,
    }));
    const { error: linkErr } = await supabase.from("category_addons").insert(rows);
    if (linkErr) throw linkErr;
  }
  return data;
}

export async function updateAddon(id, addon) {
  const { category_ids, ...fields } = addon;
  const { error } = await supabase
    .from("addons")
    .update(fields)
    .eq("id", id);
  if (error) throw error;

  if (category_ids !== undefined) {
    const { error: delErr } = await supabase.from("category_addons").delete().eq("addon_id", id);
    if (delErr) throw delErr;
    if (category_ids.length) {
      const rows = category_ids.map((cid) => ({
        category_id: cid,
        addon_id: id,
      }));
      const { error: linkErr } = await supabase.from("category_addons").insert(rows);
      if (linkErr) throw linkErr;
    }
  }
}

export async function deleteAddon(id) {
  const { error } = await supabase.from("addons").delete().eq("id", id);
  if (error) throw error;
}

export async function setAddonAvailable(id, available) {
  const { error } = await supabase
    .from("addons")
    .update({ is_available: available })
    .eq("id", id);
  if (error) throw error;
}
