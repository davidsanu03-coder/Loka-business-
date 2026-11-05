import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./dashboard/Sidebar";
import ThemeToggle from "../theme/ThemeToggle";
import "./styles/customerSettings.css";

interface SettingsState {
    orderUpdates: boolean;
    promotionalEmails: boolean;
    messageNotifications: boolean;
    productRecommendations: boolean;
    showProfile: boolean;
    savePreferences: boolean;
}

const initialSettings: SettingsState = {
    orderUpdates: true,
    promotionalEmails: false,
    messageNotifications: true,
    productRecommendations: true,
    showProfile: true,
    savePreferences: true,
};

const CustomerSettings = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [settings, setSettings] =
        useState<SettingsState>(initialSettings);
    const [savedSettings, setSavedSettings] =
        useState<SettingsState>(initialSettings);
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    const updateSetting = (
        key: keyof SettingsState,
        value: boolean
    ) => {
        setSettings((current) => ({
            ...current,
            [key]: value,
        }));

        setMessage("");
    };

    const handleSave = () => {
        setSavedSettings(settings);
        setMessage("Your preferences have been saved for this session.");
    };

    const handleReset = () => {
        setSettings(savedSettings);
        setMessage("");
    };

    return (
        <div className="customer-settings">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {isSidebarOpen && (
                <button
                    type="button"
                    className="settings-sidebar-backdrop"
                    aria-label="Close navigation menu"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <main className="settings-main">
                <header className="settings-topbar">
                    <button
                        type="button"
                        className="settings-menu-button"
                        aria-label="Open navigation menu"
                        aria-controls="customer-sidebar"
                        aria-expanded={isSidebarOpen}
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <span />
                        <span />
                        <span />
                    </button>

                    <div className="settings-topbar-heading">
                        <h1>Settings</h1>
                        <p>Manage your preferences and privacy.</p>
                    </div>

                    <div className="settings-topbar-actions">
                        <ThemeToggle />
                        <div className="settings-avatar">DA</div>
                    </div>
                </header>

                <div className="settings-content">
                    <section className="settings-intro">
                        <span className="settings-eyebrow">
                            ACCOUNT PREFERENCES
                        </span>
                        <h2>Settings</h2>
                        <p>
                            Personalize your LOKA experience by managing
                            notifications, privacy, and account preferences.
                        </p>
                    </section>

                    {message && (
                        <div className="settings-message" role="status">
                            {message}
                        </div>
                    )}

                    <section className="settings-section">
                        <div className="settings-section-heading">
                            <div className="settings-section-icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M10 21h4"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3>Notifications</h3>
                                <p>
                                    Choose the updates you want to receive.
                                </p>
                            </div>
                        </div>

                        <div className="settings-options">
                            <SettingToggle
                                title="Order updates"
                                description="Receive updates about your purchases and deliveries."
                                checked={settings.orderUpdates}
                                onChange={(value) =>
                                    updateSetting("orderUpdates", value)
                                }
                            />

                            <SettingToggle
                                title="Messages"
                                description="Get notified when sellers send you messages."
                                checked={settings.messageNotifications}
                                onChange={(value) =>
                                    updateSetting(
                                        "messageNotifications",
                                        value
                                    )
                                }
                            />

                            <SettingToggle
                                title="Promotional emails"
                                description="Receive news about offers and marketplace promotions."
                                checked={settings.promotionalEmails}
                                onChange={(value) =>
                                    updateSetting(
                                        "promotionalEmails",
                                        value
                                    )
                                }
                            />

                            <SettingToggle
                                title="Product recommendations"
                                description="Get suggestions based on products you may like."
                                checked={settings.productRecommendations}
                                onChange={(value) =>
                                    updateSetting(
                                        "productRecommendations",
                                        value
                                    )
                                }
                            />
                        </div>
                    </section>

                    <section className="settings-section">
                        <div className="settings-section-heading">
                            <div className="settings-section-icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    aria-hidden="true"
                                >
                                    <rect
                                        x="3"
                                        y="4"
                                        width="18"
                                        height="16"
                                        rx="3"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                    />
                                    <circle
                                        cx="9"
                                        cy="10"
                                        r="2"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                    />
                                    <path
                                        d="M5 17c.7-2 2-3 4-3s3.3 1 4 3m2-6h3m-3 3h3"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3>Privacy</h3>
                                <p>
                                    Manage how your information is used.
                                </p>
                            </div>
                        </div>

                        <div className="settings-options">
                            <SettingToggle
                                title="Public seller-facing profile"
                                description="Allow sellers to see your basic customer profile when relevant to your interactions."
                                checked={settings.showProfile}
                                onChange={(value) =>
                                    updateSetting("showProfile", value)
                                }
                            />

                            <SettingToggle
                                title="Save preferences"
                                description="Keep your selected preferences available during this session."
                                checked={settings.savePreferences}
                                onChange={(value) =>
                                    updateSetting("savePreferences", value)
                                }
                            />
                        </div>
                    </section>

                    <section className="settings-section">
                        <div className="settings-section-heading">
                            <div className="settings-section-icon">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    aria-hidden="true"
                                >
                                    <rect
                                        x="4"
                                        y="10"
                                        width="16"
                                        height="11"
                                        rx="2"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                    />
                                    <path
                                        d="M8 10V7a4 4 0 0 1 8 0v3"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3>Account and security</h3>
                                <p>
                                    Access your profile and get help with
                                    your account.
                                </p>
                            </div>
                        </div>

                        <div className="settings-links">
                            <button
                                type="button"
                                className="settings-link"
                                onClick={() =>
                                    navigate("/customer/profile")
                                }
                            >
                                <span>
                                    <strong>Personal information</strong>
                                    <small>
                                        Review your profile details.
                                    </small>
                                </span>
                                <span className="settings-link-arrow">
                                    →
                                </span>
                            </button>

                            <button
                                type="button"
                                className="settings-link"
                                onClick={() => navigate("/customer/help")}
                            >
                                <span>
                                    <strong>Help and support</strong>
                                    <small>
                                        Get assistance with your account.
                                    </small>
                                </span>
                                <span className="settings-link-arrow">
                                    →
                                </span>
                            </button>
                        </div>
                    </section>

                    <div className="settings-actions">
                        <button
                            type="button"
                            className="settings-reset-button"
                            onClick={handleReset}
                        >
                            Undo unsaved changes
                        </button>

                        <button
                            type="button"
                            className="settings-save-button"
                            onClick={handleSave}
                        >
                            Save preferences
                        </button>
                    </div>

                    <footer className="settings-footer">
                        <span>LOKA</span>
                        <p>Your marketplace, all in one place.</p>
                    </footer>
                </div>
            </main>
        </div>
    );
};

interface SettingToggleProps {
    title: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const SettingToggle = ({
    title,
    description,
    checked,
    onChange,
}: SettingToggleProps) => {
    const id = `setting-${title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`;

    return (
        <div className="settings-option">
            <div className="settings-option-text">
                <label htmlFor={id}>{title}</label>
                <p>{description}</p>
            </div>

            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={title}
                className={`settings-switch ${checked ? "is-on" : ""}`}
                onClick={() => onChange(!checked)}
            >
                <span />
            </button>
        </div>
    );
};

export default CustomerSettings;