import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import LeadsPage from "./pages/LeadsPage";
import BotFlowPage from "./pages/BotFlowPage";
import RevenueIntelPage from "./pages/RevenueIntelPage";
import { useAuth } from "./auth/AuthProvider";
import SuperDashboardPage from "./pages/SuperDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
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
          <Protected>
            <SuperDashboardPage />
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected>
            <AdminDashboardPage />
          </Protected>
        }
      />
      <Route
        path="/leads"
        element={
          <Protected>
            <LeadsPage />
          </Protected>
        }
      />
      <Route
        path="/botflow"
        element={
          <Protected>
            <BotFlowPage />
          </Protected>
        }
      />
      <Route
        path="/intelligence"
        element={
          <Protected>
            <RevenueIntelPage />
          </Protected>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
