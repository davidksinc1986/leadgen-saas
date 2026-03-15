import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function AdminDashboardPage() {
  const nav = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Company Admin Dashboard</h2>
          <p className="page-subtitle">Professional cockpit for salon and manicure businesses to manage leads, campaigns, and operations.</p>
        </div>
        <div className="actions-row">
          <button onClick={() => nav("/leads")}>Leads Workspace</button>
          <button onClick={() => nav("/intelligence")}>Revenue Intelligence</button>
          <button onClick={() => nav("/botflow")}>Bot Flow Studio</button>
          <button className="btn-danger" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="panel-grid">
        <div className="surface panel animated-card">
          <h3 style={{ marginTop: 0 }}>Form completion standards</h3>
          <p>Use clear examples in every required field to avoid incomplete contacts and reduce back-and-forth messages.</p>
          <ul>
            <li><b>Client name:</b> Example: "Sofia Martinez".</li>
            <li><b>Preferred service:</b> Example: "Acrylic full set + gel color".</li>
            <li><b>Budget:</b> Example: "$45 - $65".</li>
            <li><b>Preferred date/time:</b> Example: "Friday after 4 PM".</li>
          </ul>
        </div>

        <div className="surface panel animated-card">
          <h3 style={{ marginTop: 0 }}>Beauty-focused campaign themes</h3>
          <p>Seasonal creative ideas that position your business as the perfect style partner for your customers.</p>
          <ul>
            <li>Spring glow renewal package.</li>
            <li>Summer vacation nail designs bundle.</li>
            <li>Back-to-school self-care sessions.</li>
            <li>Holiday party glam and express manicure offers.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
