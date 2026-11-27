// Fixed test data. IDs come from supabase/seed.sql (deterministic) and tests/support/fixtures.sql.
import { createHash } from "node:crypto";

/** QR token printed on table n (fixtures.sql): md5('moba-test-' || n). */
export const qrFor = (n) => createHash("md5").update(`moba-test-${n}`).digest("hex");
export const TABLE = { count: 50, inactive: 49 };

export const DISH = {
  brownie: { id: "367d445d-e7c9-4e77-8ab3-49d0d2f4d575", name: "Brownie", price: 89, category: "desserts" },
  lemonIceTea: { id: "dfa2aece-5dfa-4bb4-8187-18493f618f96", name: "Lemon Ice Tea", price: 139, category: "boba" },
  earlGrey: { id: "fda69144-40e8-46d7-8f2a-4ca6d6c33e5c", name: "Earl Grey Ice Tea", price: 159, category: "boba" },
  // Has sizes: the size is required and sets the price.
  wings: {
    id: "f115cbac-187e-439d-ac5a-592845c65ace", name: "Korean Fried Chicken Wings", category: "crispy",
    sizes: { small: { id: "15ae890b-995a-4689-ae00-8fc906e883b8", label: "Small · 4 pcs", price: 229 },
             large: { id: "6ba9f262-9aac-4b1f-a986-ce890e4c9857", label: "Large · 6 pcs", price: 289 } },
  },
  // One required choice group, pick exactly 1.
  singleScoop: {
    id: "2df7cedb-30c2-4569-8cf3-585e37985af0", name: "Single Scoop", price: 89, category: "desserts",
    group: "aa20d510-4e72-4587-94b8-dae76043484d",
    options: { vanilla: "bb47d32a-1c72-41b2-b015-1630a5682d22", strawberry: "e52cf6ff-04f1-4a79-9998-a3278b1fe121", chocolate: "1809f421-e228-4ca0-8e19-2dd3ed0658d4" },
  },
  // One choice group, pick 1 or 2.
  doubleScoop: {
    id: "438dd009-8ad9-4a7c-bec5-7cd32881485c", name: "Double Scoop", price: 169, category: "desserts",
    group: "9f91a2b3-6f3d-4c0f-b448-8e9353f273a3",
    options: { vanilla: "65c575ef-4201-4ce9-9700-ff76f74c5921", strawberry: "1967d149-b1cc-4d6a-b593-56d067a6018c", chocolate: "d5a30c63-4f74-4b04-ab20-c627683a0d33" },
  },
};

/** Add-ons offered on a category (category_addons). */
export const ADDON = {
  extraBoba: { id: "7e0b06a0-4814-4a67-88d3-a7dd4883dd99", name: "Extra boba", price: 30, category: "boba" },
  coconutJelly: { id: "0e2ed519-8062-46b8-adb7-39c311eccd57", name: "Coconut jelly", price: 30, category: "boba" },
  friedEgg: { id: "2019f20f-4e6b-4b2a-b43c-d9115a277c4e", name: "Fried egg", price: 25, category: "gimbap" },
};

export const CATEGORIES = ["signatures", "starters", "crispy", "street", "mandu", "salads", "gimbap", "rameyon", "ricenoodle", "toast", "boba", "desserts"];

/** Error codes the public API can return (supabase/migrations). */
export const ERR = ["INVALID_TABLE", "INVALID_VISIT", "BAD_REQUEST", "VISIT_EXPIRED", "ORDERING_CLOSED", "TABLE_INACTIVE",
  "RATE_LIMITED", "TABLE_BUSY", "DISH_UNAVAILABLE", "INVALID_ITEM", "OPTION_UNAVAILABLE", "ADDON_UNAVAILABLE", "TOO_MANY_ITEMS", "PRICE_CHANGED"];

export const uuid = () => crypto.randomUUID();
