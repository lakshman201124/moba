import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AppShell from "./components/layout/AppShell";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFoundPage from "./pages/NotFoundPage";

// Each screen loads when first opened.
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const TablesPage = lazy(() => import("./pages/TablesPage"));
const MenuPage = lazy(() => import("./pages/MenuPage"));
const AddonsPage = lazy(() => import("./pages/AddonsPage"));
const ChoicesPage = lazy(() => import("./pages/ChoicesPage"));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage view="floor" />} />
          <Route path="/orders/live" element={<OrdersPage view="live" />} />
          <Route path="/orders/history" element={<OrdersPage view="history" />} />
          <Route path="/orders/:tableId" element={<OrdersPage view="floor" />} />
          <Route path="/tables" element={<TablesPage />} />
          <Route path="/tables/:tableId" element={<TablesPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/menu/categories/new" element={<MenuPage mode="new-category" />} />
          <Route path="/menu/categories/:categoryId" element={<MenuPage />} />
          <Route path="/menu/dishes/new" element={<MenuPage mode="new-dish" />} />
          <Route path="/menu/dishes/:dishId" element={<MenuPage mode="dish" />} />
          <Route path="/menu/addons" element={<AddonsPage />} />
          <Route path="/menu/choices" element={<ChoicesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage standalone />} />
      </Routes>
      <Toaster
        position="top-center"
        gutter={10}
        containerStyle={{ top: 16 }}
        toastOptions={{
          duration: 3500,
          className: "!rounded-[14px] !border !border-line !shadow-pop !text-body !font-semibold !text-ink !px-3.5 !py-2.5",
          success: { iconTheme: { primary: "#1D7A3D", secondary: "#fff" } },
          error: { iconTheme: { primary: "#C42318", secondary: "#fff" }, duration: 5000 },
        }}
      />
    </BrowserRouter>
  );
}
