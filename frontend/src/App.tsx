import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import LeadsPage from "./pages/LeadsPage";
import BotFlowPage from "./pages/BotFlowPage";
import RevenueIntelPage from "./pages/RevenueIntelPage";
import SettingsPage from "./pages/SettingsPage";
import { useAuth } from "./auth/AuthProvider";
import SuperDashboardPage from "./pages/SuperDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import type { AuthRole } from "./lib/storage";

function Protected({ children, roles }: { children: React.ReactNode; roles?: AuthRole[] }) {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && (!role || !roles.includes(role))) {
    return role === "super_admin" ? <Navigate to="/super" replace /> : <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

function RoleBasedHome() {
  const { role } = useAuth();
  if (role === "super_admin") return <Navigate to="/super" replace />;
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/admin" element={<AdminLoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <RoleBasedHome />
          </Protected>
        }
      />
      <Route
        path="/super"
        element={
          <Protected roles={["super_admin"]}>
            <SuperDashboardPage />
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected roles={["company_admin", "admin", "agent"]}>
            <AdminDashboardPage />
          </Protected>
        }
      />
      <Route
        path="/leads"
        element={
          <Protected roles={["company_admin", "admin", "agent"]}>
            <LeadsPage />
          </Protected>
        }
      />
      <Route
        path="/botflow"
        element={
          <Protected roles={["company_admin", "admin", "agent"]}>
            <BotFlowPage />
          </Protected>
        }
      />
      <Route
        path="/intelligence"
        element={
          <Protected roles={["company_admin", "admin", "agent"]}>
            <RevenueIntelPage />
          </Protected>
        }
      />

      <Route
        path="/settings"
        element={
          <Protected roles={["company_admin", "admin"]}>
            <SettingsPage />
          </Protected>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
