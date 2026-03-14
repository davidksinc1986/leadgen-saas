import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import LeadsPage from "./pages/LeadsPage";
import BotFlowPage from "./pages/BotFlowPage";
import RevenueIntelPage from "./pages/RevenueIntelPage";
import { useAuth } from "./auth/AuthProvider";

function Protected({ children }: { children: React.ReactNode }) {
const { token } = useAuth();
if (!token) return <Navigate to="/login" replace />;
return <>{children}</>;
}

export default function App() {
return (
  <Routes>
    <Route path="/login" element={<LoginPage />} />

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

    <Route path="*" element={<Navigate to="/leads" replace />} />
  </Routes>
);
}
