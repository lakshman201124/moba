import { LayoutDashboard, ClipboardList, Armchair, BookOpenText } from "lucide-react";

export const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/orders", icon: ClipboardList, label: "Orders", badge: "waiting" },
  { to: "/tables", icon: Armchair, label: "Tables" },
  { to: "/menu", icon: BookOpenText, label: "Menu" },
];
