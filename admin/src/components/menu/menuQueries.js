import { queryClient } from "../../lib/queryClient";

export const MENU_KEYS = ["categories", "category", "dishes", "dish", "addons", "choice-groups", "choice-usage", "dishes-all"];

export function invalidateMenu(...keys) {
  for (const key of keys.length ? keys : MENU_KEYS) queryClient.invalidateQueries({ queryKey: [key] });
}

export const ARTS = ["pot", "soup", "wok", "chicken", "corndog", "dimsum", "gimbap", "noodles", "rice", "burger", "boba", "sundae"];
export const ART_LABELS = {
  pot: "Hot pot", soup: "Soup bowl", wok: "Wok", chicken: "Fried chicken", corndog: "Corn dog", dimsum: "Dumplings",
  gimbap: "Gimbap", noodles: "Noodles", rice: "Rice bowl", burger: "Burger", boba: "Boba", sundae: "Sundae",
};

export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export function priceText(d) {
  const sizes = d.dish_sizes || [];
  return sizes.length ? `from ₹${Math.min(...sizes.map((s) => s.price)).toLocaleString("en-IN")}` : `₹${Number(d.price).toLocaleString("en-IN")}`;
}

export const ruleText = (g) =>
  g.min_select === 0
    ? `Optional, up to ${g.max_select}`
    : g.min_select === g.max_select
      ? `Pick ${g.min_select}`
      : `Pick ${g.min_select} to ${g.max_select}`;
