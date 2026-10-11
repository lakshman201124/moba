import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AppShell from "./components/layout/AppShell";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/OrdersPage";
import OrderTablePage from "./pages/OrderTablePage";
import TablesPage from "./pages/TablesPage";
import TableDetailPage from "./pages/TableDetailPage";
import MenuPage from "./pages/MenuPage";
import ChoicesPage from "./pages/ChoicesPage";
import AddonsPage from "./pages/AddonsPage";
import CategoryPage from "./pages/CategoryPage";
import DishPage from "./pages/DishPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:tableId" element={<OrderTablePage />} />
          <Route path="/tables" element={<TablesPage />} />
          <Route path="/tables/:tableId" element={<TableDetailPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/menu/choices" element={<ChoicesPage />} />
          <Route path="/menu/addons" element={<AddonsPage />} />
          <Route path="/menu/categories/new" element={<CategoryPage />} />
          <Route path="/menu/categories/:categoryId" element={<CategoryPage />} />
          <Route path="/menu/dishes/new" element={<DishPage />} />
          <Route path="/menu/dishes/:dishId" element={<DishPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
