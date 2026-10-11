import { supabase } from "../lib/supabase";
import { pick } from "./pick";

async function nextLinkOrder(categoryId) {
  const { data, error } = await supabase
    .from("category_addons")
    .select("sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.sort_order ?? 0) + 1;
}

const live = {
  async getAddons() {
    const { data, error } = await supabase
      .from("addons")
      .select("*, category_addons(category_id)")
      .order("sort_order");
    if (error) throw error;
    return data || [];
  },

  async getAddon(id) {
    const { data, error } = await supabase
      .from("addons")
      .select("*, category_addons(category_id)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async createAddon(addon) {
    const { category_ids, ...fields } = addon;
    const { data, error } = await supabase.from("addons").insert(fields).select().single();
    if (error) throw error;
    if (category_ids?.length) {
      const rows = category_ids.map((cid) => ({ category_id: cid, addon_id: data.id }));
      const { error: linkErr } = await supabase.from("category_addons").insert(rows);
      if (linkErr) throw linkErr;
    }
    return data;
  },

  async updateAddon(id, addon) {
    const { category_ids, ...fields } = addon;
    const { error } = await supabase.from("addons").update(fields).eq("id", id);
    if (error) throw error;
    if (category_ids !== undefined) {
      const { error: delErr } = await supabase.from("category_addons").delete().eq("addon_id", id);
      if (delErr) throw delErr;
      if (category_ids.length) {
        const rows = category_ids.map((cid) => ({ category_id: cid, addon_id: id }));
        const { error: linkErr } = await supabase.from("category_addons").insert(rows);
        if (linkErr) throw linkErr;
      }
    }
  },

  async deleteAddon(id) {
    const { error } = await supabase.from("addons").delete().eq("id", id);
    if (error) throw error;
  },

  async setAddonAvailable(id, available) {
    const { error } = await supabase.from("addons").update({ is_available: available }).eq("id", id);
    if (error) throw error;
  },

  // Offer one add-on in one category, or stop offering it there, without touching other links.
  async linkAddon(categoryId, addonId) {
    const { error } = await supabase
      .from("category_addons")
      .upsert(
        { category_id: categoryId, addon_id: addonId, sort_order: await nextLinkOrder(categoryId) },
        { onConflict: "category_id,addon_id", ignoreDuplicates: true },
      );
    if (error) throw error;
  },

  async unlinkAddon(categoryId, addonId) {
    const { error } = await supabase
      .from("category_addons")
      .delete()
      .eq("category_id", categoryId)
      .eq("addon_id", addonId);
    if (error) throw error;
  },
};

export const {
  getAddons, getAddon, createAddon, updateAddon, deleteAddon, setAddonAvailable, linkAddon, unlinkAddon,
} = pick("addons", live);
