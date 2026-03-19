import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useI18n } from "../i18n/I18nProvider";

export default function PageNav({ showBack = true }: { showBack?: boolean }) {
  const nav = useNavigate();
  const { role } = useAuth();
  const { t } = useI18n();

  const home = role === "super_admin" ? "/super" : "/admin";

  return (
    <div className="actions-row">
      {showBack && (
        <button onClick={() => nav(-1)}>
          {t("common.back")}
        </button>
      )}
      <button onClick={() => nav(home)}>{t("common.mainMenu")}</button>
    </div>
  );
}
