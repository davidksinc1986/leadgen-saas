import { useEffect, useMemo, useState } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import PageNav from "../components/PageNav";
import { api } from "../lib/api";
import { useI18n } from "../i18n/I18nProvider";

type Locale = "es" | "en" | "pt" | "fr" | "zh";
type ChannelKey = "whatsapp" | "instagram" | "messenger" | "facebook" | "tiktok" | "webchat" | "elevenLabs" | "salesforce";

type WeeklyAvailability = {
  dayOfWeek: number;
  enabled: boolean;
  start: string;
  end: string;
};

type CompanySettings = {
  name: string;
  leadGoal: "appointment" | "lead";
  languages: {
    primary: Locale;
    enabled: Locale[];
  };
  calendarSync: {
    enabled: boolean;
    provider: "none" | "google" | "outlook" | "apple";
    calendarEmail: string;
    syncMode: "two_way" | "read_only" | "write_only";
    timezone: string;
    lastSyncAt?: string | null;
  };
  appointmentSettings: {
    enabled: boolean;
    timezone: string;
    slotDurationMin: number;
    bookingNoticeHours: number;
    weeklyAvailability: WeeklyAvailability[];
  };
  integrations: Record<string, any>;
  notifications: {
    email: { enabled: boolean; to: string[] };
    whatsapp: { enabled: boolean; to: string[] };
  };
  branding: {
    appTitle: string;
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    neutralColor: string;
    themePreset: string;
  };
};

const DAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" }
];

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  whatsapp: "WhatsApp / Meta",
  instagram: "Instagram",
  messenger: "Messenger",
  facebook: "Facebook Lead Ads",
  tiktok: "TikTok",
  webchat: "Webchat",
  elevenLabs: "ElevenLabs Voice",
  salesforce: "Salesforce CRM"
};

function defaultWeeklyAvailability() {
  return DAYS.map(({ value }) => ({
    dayOfWeek: value,
    enabled: value >= 1 && value <= 5,
    start: "09:00",
    end: "17:00"
  }));
}

function defaultSettings(): CompanySettings {
  return {
    name: "",
    leadGoal: "appointment",
    languages: { primary: "en", enabled: ["en", "es"] },
    calendarSync: {
      enabled: false,
      provider: "none",
      calendarEmail: "",
      syncMode: "two_way",
      timezone: "UTC"
    },
    appointmentSettings: {
      enabled: false,
      timezone: "UTC",
      slotDurationMin: 30,
      bookingNoticeHours: 2,
      weeklyAvailability: defaultWeeklyAvailability()
    },
    integrations: {
      whatsapp: { enabled: false, provider: "meta", phoneNumberId: "", businessAccountId: "", accessToken: "", verifyToken: "", webhookSecret: "" },
      instagram: { enabled: false, appId: "", accessToken: "", appSecret: "", verifyToken: "" },
      messenger: { enabled: false, pageId: "", pageAccessToken: "", appSecret: "", verifyToken: "" },
      facebook: { enabled: false, pageId: "", accessToken: "", formIds: "" },
      tiktok: { enabled: false, appId: "", accessToken: "", appSecret: "", advertiserId: "" },
      webchat: { enabled: true, allowedDomains: "", welcomeHeadline: "", widgetLabel: "" },
      elevenLabs: { enabled: false, voiceId: "", apiKey: "" },
      salesforce: { enabled: false, instanceUrl: "", clientId: "", clientSecret: "" }
    },
    notifications: {
      email: { enabled: false, to: [] },
      whatsapp: { enabled: false, to: [] }
    },
    branding: {
      appTitle: "",
      logoUrl: "",
      primaryColor: "#2563eb",
      secondaryColor: "#0ea5e9",
      accentColor: "#db2777",
      neutralColor: "#0f172a",
      themePreset: "modern-blue"
    }
  };
}

export default function SettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const enabledLocaleSet = useMemo(() => new Set(settings.languages.enabled), [settings.languages.enabled]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get("/company/me");
      const company = resp.data?.company ?? {};
      setSettings({
        name: company.name ?? "",
        leadGoal: company.leadGoal ?? "appointment",
        languages: {
          primary: company.languages?.primary ?? "en",
          enabled: company.languages?.enabled?.length ? company.languages.enabled : ["en", "es"]
        },
        calendarSync: {
          enabled: company.calendarSync?.enabled ?? false,
          provider: company.calendarSync?.provider ?? "none",
          calendarEmail: company.calendarSync?.calendarEmail ?? "",
          syncMode: company.calendarSync?.syncMode ?? "two_way",
          timezone: company.calendarSync?.timezone ?? "UTC",
          lastSyncAt: company.calendarSync?.lastSyncAt ?? null
        },
        appointmentSettings: {
          enabled: company.appointmentSettings?.enabled ?? false,
          timezone: company.appointmentSettings?.timezone ?? company.calendarSync?.timezone ?? "UTC",
          slotDurationMin: company.appointmentSettings?.slotDurationMin ?? 30,
          bookingNoticeHours: company.appointmentSettings?.bookingNoticeHours ?? 2,
          weeklyAvailability: company.appointmentSettings?.weeklyAvailability?.length ? company.appointmentSettings.weeklyAvailability : defaultWeeklyAvailability()
        },
        integrations: {
          ...defaultSettings().integrations,
          ...company.integrations,
          whatsapp: { ...defaultSettings().integrations.whatsapp, ...company.integrations?.whatsapp, accessToken: "", verifyToken: "", webhookSecret: "" },
          instagram: { ...defaultSettings().integrations.instagram, ...company.integrations?.instagram, accessToken: "", appSecret: "", verifyToken: "" },
          messenger: { ...defaultSettings().integrations.messenger, ...company.integrations?.messenger, pageAccessToken: "", appSecret: "", verifyToken: "" },
          facebook: { ...defaultSettings().integrations.facebook, ...company.integrations?.facebook, accessToken: "" },
          tiktok: { ...defaultSettings().integrations.tiktok, ...company.integrations?.tiktok, accessToken: "", appSecret: "" },
          webchat: { ...defaultSettings().integrations.webchat, ...company.integrations?.webchat },
          elevenLabs: { ...defaultSettings().integrations.elevenLabs, ...company.integrations?.elevenLabs, apiKey: "" },
          salesforce: { ...defaultSettings().integrations.salesforce, ...company.integrations?.salesforce, clientSecret: "" }
        },
        notifications: {
          email: { enabled: company.notifications?.email?.enabled ?? false, to: company.notifications?.email?.to ?? [] },
          whatsapp: { enabled: company.notifications?.whatsapp?.enabled ?? false, to: company.notifications?.whatsapp?.to ?? [] }
        },
        branding: {
          appTitle: company.branding?.appTitle ?? "",
          logoUrl: company.branding?.logoUrl ?? "",
          primaryColor: company.branding?.primaryColor ?? "#2563eb",
          secondaryColor: company.branding?.secondaryColor ?? "#0ea5e9",
          accentColor: company.branding?.accentColor ?? "#db2777",
          neutralColor: company.branding?.neutralColor ?? "#0f172a",
          themePreset: company.branding?.themePreset ?? "modern-blue"
        }
      });
    } catch (err: any) {
      setError(err?.response?.data?.error ?? t("settings.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function patchIntegration(channel: ChannelKey, field: string, value: any) {
    setSettings((prev) => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [channel]: {
          ...(prev.integrations?.[channel] ?? {}),
          [field]: value
        }
      }
    }));
  }

  async function saveBusiness() {
    setSavingSection("business");
    setError(null);
    setSuccess(null);
    try {
      await api.patch("/company/me/business", {
        name: settings.name,
        leadGoal: settings.leadGoal,
        languages: settings.languages,
        integrations: settings.integrations
      });
      await api.patch("/company/me/notifications", settings.notifications);
      setSuccess(t("settings.saved"));
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.details?.join?.("\n") ?? err?.response?.data?.error ?? t("settings.saveError"));
    } finally {
      setSavingSection(null);
    }
  }

  async function saveCalendar() {
    setSavingSection("calendar");
    setError(null);
    setSuccess(null);
    try {
      await api.patch("/company/me/calendar", {
        ...settings.calendarSync,
        appointmentSettings: settings.appointmentSettings
      });
      setSuccess(t("settings.saved"));
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.details?.join?.("\n") ?? err?.response?.data?.error ?? t("settings.saveError"));
    } finally {
      setSavingSection(null);
    }
  }

  async function saveBranding() {
    setSavingSection("branding");
    setError(null);
    setSuccess(null);
    try {
      await api.patch("/company/me/branding", settings.branding);
      setSuccess(t("settings.saved"));
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.details?.join?.("\n") ?? err?.response?.data?.error ?? t("settings.saveError"));
    } finally {
      setSavingSection(null);
    }
  }

  return (
    <div className="page settings-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t("settings.title")}</h2>
          <p className="page-subtitle">{t("settings.subtitle")}</p>
        </div>
        <div className="actions-row">
          <PageNav />
          <LanguageSwitcher />
          <button onClick={load} disabled={loading}>{t("common.refresh")}</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="info-box">{success}</div>}

      <section className="surface panel animated-card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>{t("settings.business.title")}</h3>
        <p className="page-subtitle">{t("settings.business.subtitle")}</p>
        <div className="form-grid settings-grid-2">
          <div>
            <label>{t("settings.business.companyName")}</label>
            <input value={settings.name} onChange={(e) => setSettings((prev) => ({ ...prev, name: e.target.value }))} placeholder="Acme Studio" />
          </div>
          <div>
            <label>{t("settings.business.leadGoal")}</label>
            <select value={settings.leadGoal} onChange={(e) => setSettings((prev) => ({ ...prev, leadGoal: e.target.value as CompanySettings["leadGoal"] }))}>
              <option value="appointment">{t("settings.business.goal.appointment")}</option>
              <option value="lead">{t("settings.business.goal.lead")}</option>
            </select>
          </div>
          <div>
            <label>{t("settings.business.primaryLanguage")}</label>
            <select value={settings.languages.primary} onChange={(e) => setSettings((prev) => ({ ...prev, languages: { ...prev.languages, primary: e.target.value as Locale } }))}>
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
              <option value="fr">Français</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <div>
            <label>{t("settings.business.notifications")}</label>
            <div className="chip-wrap">
              {(["es", "en", "pt", "fr", "zh"] as Locale[]).map((locale) => (
                <label key={locale} className="toggle-chip">
                  <input
                    type="checkbox"
                    checked={enabledLocaleSet.has(locale)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? Array.from(new Set([...settings.languages.enabled, locale]))
                        : settings.languages.enabled.filter((item) => item !== locale);
                      setSettings((prev) => ({
                        ...prev,
                        languages: {
                          ...prev.languages,
                          enabled: next.length ? next : [prev.languages.primary]
                        }
                      }));
                    }}
                  />
                  <span>{locale.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-grid-2" style={{ marginTop: 12 }}>
          <div className="surface panel">
            <h4 style={{ marginTop: 0 }}>{t("settings.notifications.email")}</h4>
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={settings.notifications.email.enabled}
                onChange={(e) => setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, email: { ...prev.notifications.email, enabled: e.target.checked } } }))}
              />
              <span>{t("settings.notifications.enableEmail")}</span>
            </label>
            <textarea
              rows={3}
              placeholder="ops@company.com, manager@company.com"
              value={settings.notifications.email.to.join(", ")}
              onChange={(e) => setSettings((prev) => ({
                ...prev,
                notifications: {
                  ...prev.notifications,
                  email: { ...prev.notifications.email, to: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) }
                }
              }))}
            />
          </div>
          <div className="surface panel">
            <h4 style={{ marginTop: 0 }}>{t("settings.notifications.whatsapp")}</h4>
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={settings.notifications.whatsapp.enabled}
                onChange={(e) => setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, whatsapp: { ...prev.notifications.whatsapp, enabled: e.target.checked } } }))}
              />
              <span>{t("settings.notifications.enableWhatsapp")}</span>
            </label>
            <textarea
              rows={3}
              placeholder="+15551234567, +15557654321"
              value={settings.notifications.whatsapp.to.join(", ")}
              onChange={(e) => setSettings((prev) => ({
                ...prev,
                notifications: {
                  ...prev.notifications,
                  whatsapp: { ...prev.notifications.whatsapp, to: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) }
                }
              }))}
            />
          </div>
        </div>

        <div className="actions-row" style={{ marginTop: 12 }}>
          <button className="btn-primary" onClick={saveBusiness} disabled={savingSection === "business"}>{savingSection === "business" ? t("common.saving") : t("common.save")}</button>
        </div>
      </section>

      <section className="surface panel animated-card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>{t("settings.channels.title")}</h3>
        <p className="page-subtitle">{t("settings.channels.subtitle")}</p>
        <div className="settings-cards">
          {(["whatsapp", "instagram", "messenger", "facebook", "tiktok", "webchat", "elevenLabs", "salesforce"] as ChannelKey[]).map((channel) => {
            const integration = settings.integrations?.[channel] ?? {};
            return (
              <article key={channel} className="surface panel">
                <div className="actions-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0 }}>{CHANNEL_LABELS[channel]}</h4>
                  <label className="inline-toggle">
                    <input type="checkbox" checked={Boolean(integration.enabled)} onChange={(e) => patchIntegration(channel, "enabled", e.target.checked)} />
                    <span>{t("settings.channels.enabled")}</span>
                  </label>
                </div>

                {channel === "whatsapp" && (
                  <div className="form-grid settings-grid-2" style={{ marginTop: 10 }}>
                    <input placeholder="Provider (meta, twilio)" value={integration.provider ?? "meta"} onChange={(e) => patchIntegration(channel, "provider", e.target.value)} />
                    <input placeholder="Phone Number ID" value={integration.phoneNumberId ?? ""} onChange={(e) => patchIntegration(channel, "phoneNumberId", e.target.value)} />
                    <input placeholder="Business Account ID" value={integration.businessAccountId ?? ""} onChange={(e) => patchIntegration(channel, "businessAccountId", e.target.value)} />
                    <input type="password" placeholder="Access token" value={integration.accessToken ?? ""} onChange={(e) => patchIntegration(channel, "accessToken", e.target.value)} />
                    <input type="password" placeholder="Verify token" value={integration.verifyToken ?? ""} onChange={(e) => patchIntegration(channel, "verifyToken", e.target.value)} />
                    <input type="password" placeholder="Webhook secret" value={integration.webhookSecret ?? ""} onChange={(e) => patchIntegration(channel, "webhookSecret", e.target.value)} />
                  </div>
                )}

                {channel === "instagram" && (
                  <div className="form-grid settings-grid-2" style={{ marginTop: 10 }}>
                    <input placeholder="App ID" value={integration.appId ?? ""} onChange={(e) => patchIntegration(channel, "appId", e.target.value)} />
                    <input type="password" placeholder="App secret" value={integration.appSecret ?? ""} onChange={(e) => patchIntegration(channel, "appSecret", e.target.value)} />
                    <input type="password" placeholder="Access token" value={integration.accessToken ?? ""} onChange={(e) => patchIntegration(channel, "accessToken", e.target.value)} />
                    <input type="password" placeholder="Verify token" value={integration.verifyToken ?? ""} onChange={(e) => patchIntegration(channel, "verifyToken", e.target.value)} />
                  </div>
                )}

                {channel === "messenger" && (
                  <div className="form-grid settings-grid-2" style={{ marginTop: 10 }}>
                    <input placeholder="Facebook Page ID" value={integration.pageId ?? ""} onChange={(e) => patchIntegration(channel, "pageId", e.target.value)} />
                    <input type="password" placeholder="Page access token" value={integration.pageAccessToken ?? ""} onChange={(e) => patchIntegration(channel, "pageAccessToken", e.target.value)} />
                    <input type="password" placeholder="App secret" value={integration.appSecret ?? ""} onChange={(e) => patchIntegration(channel, "appSecret", e.target.value)} />
                    <input type="password" placeholder="Verify token" value={integration.verifyToken ?? ""} onChange={(e) => patchIntegration(channel, "verifyToken", e.target.value)} />
                  </div>
                )}

                {channel === "facebook" && (
                  <div className="form-grid settings-grid-2" style={{ marginTop: 10 }}>
                    <input placeholder="Page ID" value={integration.pageId ?? ""} onChange={(e) => patchIntegration(channel, "pageId", e.target.value)} />
                    <input type="password" placeholder="Long-lived access token" value={integration.accessToken ?? ""} onChange={(e) => patchIntegration(channel, "accessToken", e.target.value)} />
                    <input placeholder="Lead form IDs (comma separated)" value={integration.formIds ?? ""} onChange={(e) => patchIntegration(channel, "formIds", e.target.value)} />
                  </div>
                )}

                {channel === "tiktok" && (
                  <div className="form-grid settings-grid-2" style={{ marginTop: 10 }}>
                    <input placeholder="TikTok app ID" value={integration.appId ?? ""} onChange={(e) => patchIntegration(channel, "appId", e.target.value)} />
                    <input placeholder="Advertiser ID" value={integration.advertiserId ?? ""} onChange={(e) => patchIntegration(channel, "advertiserId", e.target.value)} />
                    <input type="password" placeholder="Access token" value={integration.accessToken ?? ""} onChange={(e) => patchIntegration(channel, "accessToken", e.target.value)} />
                    <input type="password" placeholder="App secret" value={integration.appSecret ?? ""} onChange={(e) => patchIntegration(channel, "appSecret", e.target.value)} />
                  </div>
                )}

                {channel === "webchat" && (
                  <div className="form-grid settings-grid-2" style={{ marginTop: 10 }}>
                    <input placeholder="Allowed domains (*.example.com, app.example.com)" value={integration.allowedDomains ?? ""} onChange={(e) => patchIntegration(channel, "allowedDomains", e.target.value)} />
                    <input placeholder="Widget label" value={integration.widgetLabel ?? ""} onChange={(e) => patchIntegration(channel, "widgetLabel", e.target.value)} />
                    <input style={{ gridColumn: "1 / -1" }} placeholder="Welcome headline" value={integration.welcomeHeadline ?? ""} onChange={(e) => patchIntegration(channel, "welcomeHeadline", e.target.value)} />
                  </div>
                )}

                {channel === "elevenLabs" && (
                  <div className="form-grid settings-grid-2" style={{ marginTop: 10 }}>
                    <input placeholder="Voice ID" value={integration.voiceId ?? ""} onChange={(e) => patchIntegration(channel, "voiceId", e.target.value)} />
                    <input type="password" placeholder="API key" value={integration.apiKey ?? ""} onChange={(e) => patchIntegration(channel, "apiKey", e.target.value)} />
                  </div>
                )}

                {channel === "salesforce" && (
                  <div className="form-grid settings-grid-2" style={{ marginTop: 10 }}>
                    <input placeholder="Instance URL" value={integration.instanceUrl ?? ""} onChange={(e) => patchIntegration(channel, "instanceUrl", e.target.value)} />
                    <input placeholder="Client ID" value={integration.clientId ?? ""} onChange={(e) => patchIntegration(channel, "clientId", e.target.value)} />
                    <input type="password" placeholder="Client secret" value={integration.clientSecret ?? ""} onChange={(e) => patchIntegration(channel, "clientSecret", e.target.value)} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <div className="actions-row" style={{ marginTop: 12 }}>
          <button className="btn-primary" onClick={saveBusiness} disabled={savingSection === "business"}>{savingSection === "business" ? t("common.saving") : t("settings.channels.save")}</button>
        </div>
      </section>

      <section className="surface panel animated-card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>{t("settings.calendar.title")}</h3>
        <p className="page-subtitle">{t("settings.calendar.subtitle")}</p>
        <div className="form-grid settings-grid-2">
          <label className="inline-toggle">
            <input type="checkbox" checked={settings.calendarSync.enabled} onChange={(e) => setSettings((prev) => ({ ...prev, calendarSync: { ...prev.calendarSync, enabled: e.target.checked } }))} />
            <span>{t("settings.calendar.syncEnabled")}</span>
          </label>
          <label className="inline-toggle">
            <input type="checkbox" checked={settings.appointmentSettings.enabled} onChange={(e) => setSettings((prev) => ({ ...prev, appointmentSettings: { ...prev.appointmentSettings, enabled: e.target.checked } }))} />
            <span>{t("settings.calendar.bookingEnabled")}</span>
          </label>
          <select value={settings.calendarSync.provider} onChange={(e) => setSettings((prev) => ({ ...prev, calendarSync: { ...prev.calendarSync, provider: e.target.value as CompanySettings["calendarSync"]["provider"] } }))}>
            <option value="none">No sync</option>
            <option value="google">Google Calendar</option>
            <option value="outlook">Outlook</option>
            <option value="apple">Apple Calendar</option>
          </select>
          <input placeholder="calendar@company.com" value={settings.calendarSync.calendarEmail} onChange={(e) => setSettings((prev) => ({ ...prev, calendarSync: { ...prev.calendarSync, calendarEmail: e.target.value } }))} />
          <select value={settings.calendarSync.syncMode} onChange={(e) => setSettings((prev) => ({ ...prev, calendarSync: { ...prev.calendarSync, syncMode: e.target.value as CompanySettings["calendarSync"]["syncMode"] } }))}>
            <option value="two_way">Two-way sync</option>
            <option value="read_only">Read only</option>
            <option value="write_only">Write only</option>
          </select>
          <input placeholder="America/New_York" value={settings.calendarSync.timezone} onChange={(e) => setSettings((prev) => ({
            ...prev,
            calendarSync: { ...prev.calendarSync, timezone: e.target.value },
            appointmentSettings: { ...prev.appointmentSettings, timezone: e.target.value }
          }))} />
          <input type="number" min={15} max={180} placeholder="Slot duration" value={settings.appointmentSettings.slotDurationMin} onChange={(e) => setSettings((prev) => ({ ...prev, appointmentSettings: { ...prev.appointmentSettings, slotDurationMin: Number(e.target.value) } }))} />
          <input type="number" min={0} max={168} placeholder="Booking notice hours" value={settings.appointmentSettings.bookingNoticeHours} onChange={(e) => setSettings((prev) => ({ ...prev, appointmentSettings: { ...prev.appointmentSettings, bookingNoticeHours: Number(e.target.value) } }))} />
        </div>
        <div className="surface panel" style={{ marginTop: 12 }}>
          <h4 style={{ marginTop: 0 }}>{t("settings.calendar.availability")}</h4>
          <div className="settings-cards">
            {settings.appointmentSettings.weeklyAvailability.map((slot, index) => {
              const label = DAYS.find((item) => item.value === slot.dayOfWeek)?.label ?? String(slot.dayOfWeek);
              return (
                <div key={slot.dayOfWeek} className="surface panel">
                  <label className="inline-toggle">
                    <input
                      type="checkbox"
                      checked={slot.enabled}
                      onChange={(e) => setSettings((prev) => ({
                        ...prev,
                        appointmentSettings: {
                          ...prev.appointmentSettings,
                          weeklyAvailability: prev.appointmentSettings.weeklyAvailability.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: e.target.checked } : item)
                        }
                      }))}
                    />
                    <span>{label}</span>
                  </label>
                  <div className="form-grid settings-grid-2" style={{ marginTop: 8 }}>
                    <input type="time" value={slot.start} onChange={(e) => setSettings((prev) => ({
                      ...prev,
                      appointmentSettings: {
                        ...prev.appointmentSettings,
                        weeklyAvailability: prev.appointmentSettings.weeklyAvailability.map((item, itemIndex) => itemIndex === index ? { ...item, start: e.target.value } : item)
                      }
                    }))} />
                    <input type="time" value={slot.end} onChange={(e) => setSettings((prev) => ({
                      ...prev,
                      appointmentSettings: {
                        ...prev.appointmentSettings,
                        weeklyAvailability: prev.appointmentSettings.weeklyAvailability.map((item, itemIndex) => itemIndex === index ? { ...item, end: e.target.value } : item)
                      }
                    }))} />
                  </div>
                </div>
              );
            })}
          </div>
          {settings.calendarSync.lastSyncAt && <p className="page-subtitle" style={{ marginTop: 12 }}>{t("settings.calendar.lastSync")}: {new Date(settings.calendarSync.lastSyncAt).toLocaleString()}</p>}
        </div>
        <div className="actions-row" style={{ marginTop: 12 }}>
          <button className="btn-primary" onClick={saveCalendar} disabled={savingSection === "calendar"}>{savingSection === "calendar" ? t("common.saving") : t("settings.calendar.save")}</button>
        </div>
      </section>

      <section className="surface panel animated-card">
        <h3 style={{ marginTop: 0 }}>{t("settings.branding.title")}</h3>
        <p className="page-subtitle">{t("settings.branding.subtitle")}</p>
        <div className="form-grid settings-grid-2">
          <input placeholder="App title" value={settings.branding.appTitle} onChange={(e) => setSettings((prev) => ({ ...prev, branding: { ...prev.branding, appTitle: e.target.value } }))} />
          <input placeholder="Logo URL" value={settings.branding.logoUrl} onChange={(e) => setSettings((prev) => ({ ...prev, branding: { ...prev.branding, logoUrl: e.target.value } }))} />
          <input type="color" value={settings.branding.primaryColor} onChange={(e) => setSettings((prev) => ({ ...prev, branding: { ...prev.branding, primaryColor: e.target.value } }))} />
          <input type="color" value={settings.branding.secondaryColor} onChange={(e) => setSettings((prev) => ({ ...prev, branding: { ...prev.branding, secondaryColor: e.target.value } }))} />
          <input type="color" value={settings.branding.accentColor} onChange={(e) => setSettings((prev) => ({ ...prev, branding: { ...prev.branding, accentColor: e.target.value } }))} />
          <input type="color" value={settings.branding.neutralColor} onChange={(e) => setSettings((prev) => ({ ...prev, branding: { ...prev.branding, neutralColor: e.target.value } }))} />
          <input style={{ gridColumn: "1 / -1" }} placeholder="Theme preset" value={settings.branding.themePreset} onChange={(e) => setSettings((prev) => ({ ...prev, branding: { ...prev.branding, themePreset: e.target.value } }))} />
        </div>
        <div className="actions-row" style={{ marginTop: 12 }}>
          <button className="btn-primary" onClick={saveBranding} disabled={savingSection === "branding"}>{savingSection === "branding" ? t("common.saving") : t("settings.branding.save")}</button>
        </div>
      </section>
    </div>
  );
}
