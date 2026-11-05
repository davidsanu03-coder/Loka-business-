import { useState } from "react";
import Sidebar from "./dashboard/Sidebar";
import ThemeToggle from "../theme/ThemeToggle";
import "./styles/customerProfile.css";

interface ProfileForm {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
}

const initialProfile: ProfileForm = {
    fullName: "David Adewale",
    email: "david@example.com",
    phone: "",
    address: "",
    city: "Lagos",
    state: "Lagos State",
};

const CustomerProfile = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [profile, setProfile] = useState<ProfileForm>(initialProfile);
    const [savedProfile, setSavedProfile] =
        useState<ProfileForm>(initialProfile);
    const [message, setMessage] = useState("");

    const initials = savedProfile.fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");

    const handleChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value } = event.target;

        setProfile((current) => ({
            ...current,
            [name]: value,
        }));

        setMessage("");
    };

    const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSavedProfile(profile);
        setIsEditing(false);
        setMessage("Your changes have been saved in this session.");
    };

    const handleCancel = () => {
        setProfile(savedProfile);
        setIsEditing(false);
        setMessage("");
    };

    return (
        <div className="customer-profile">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {isSidebarOpen && (
                <button
                    type="button"
                    className="profile-sidebar-backdrop"
                    aria-label="Close navigation menu"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <main className="profile-main">
                <header className="profile-topbar">
                    <button
                        type="button"
                        className="profile-menu-button"
                        aria-label="Open navigation menu"
                        aria-controls="customer-sidebar"
                        aria-expanded={isSidebarOpen}
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <span />
                        <span />
                        <span />
                    </button>

                    <div className="profile-topbar-heading">
                        <h1>My Profile</h1>
                        <p>Manage your personal information.</p>
                    </div>

                    <div className="profile-topbar-actions">
                        <ThemeToggle />

                        <div className="profile-topbar-avatar">
                            {initials || "CU"}
                        </div>
                    </div>
                </header>

                <div className="profile-content">
                    <section className="profile-page-heading">
                        <div>
                            <span className="profile-eyebrow">
                                ACCOUNT
                            </span>
                            <h2>Personal profile</h2>
                            <p>
                                View and manage the information associated
                                with your LOKA customer account.
                            </p>
                        </div>
                    </section>

                    {message && (
                        <div
                            className="profile-message"
                            role="status"
                        >
                            {message}
                        </div>
                    )}

                    <section className="profile-card">
                        <div className="profile-card-heading">
                            <div>
                                <h3>Profile information</h3>
                                <p>
                                    Your personal details and contact
                                    information.
                                </p>
                            </div>

                            {!isEditing && (
                                <button
                                    type="button"
                                    className="profile-edit-button"
                                    onClick={() => {
                                        setProfile(savedProfile);
                                        setIsEditing(true);
                                        setMessage("");
                                    }}
                                >
                                    Edit profile
                                </button>
                            )}
                        </div>

                        <div className="profile-identity">
                            <div className="profile-large-avatar">
                                {initials || "CU"}
                            </div>

                            <div className="profile-identity-details">
                                <h3>
                                    {savedProfile.fullName || "Your name"}
                                </h3>
                                <p>{savedProfile.email}</p>
                                <span className="profile-customer-badge">
                                    Customer
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleSave}>
                            <div className="profile-form-grid">
                                <div className="profile-field">
                                    <label htmlFor="profile-fullName">
                                        Full name
                                    </label>
                                    <input
                                        id="profile-fullName"
                                        name="fullName"
                                        type="text"
                                        value={profile.fullName}
                                        onChange={handleChange}
                                        placeholder="Enter your full name"
                                        autoComplete="name"
                                        disabled={!isEditing}
                                        required
                                    />
                                </div>

                                <div className="profile-field">
                                    <label htmlFor="profile-email">
                                        Email address
                                    </label>
                                    <input
                                        id="profile-email"
                                        name="email"
                                        type="email"
                                        value={profile.email}
                                        onChange={handleChange}
                                        placeholder="Enter your email"
                                        autoComplete="email"
                                        disabled={!isEditing}
                                        required
                                    />
                                </div>

                                <div className="profile-field">
                                    <label htmlFor="profile-phone">
                                        Phone number
                                    </label>
                                    <input
                                        id="profile-phone"
                                        name="phone"
                                        type="tel"
                                        value={profile.phone}
                                        onChange={handleChange}
                                        placeholder="Enter your phone number"
                                        autoComplete="tel"
                                        disabled={!isEditing}
                                    />
                                </div>

                                <div className="profile-field">
                                    <label htmlFor="profile-address">
                                        Delivery address
                                    </label>
                                    <input
                                        id="profile-address"
                                        name="address"
                                        type="text"
                                        value={profile.address}
                                        onChange={handleChange}
                                        placeholder="Enter your street address"
                                        autoComplete="street-address"
                                        disabled={!isEditing}
                                    />
                                </div>

                                <div className="profile-field">
                                    <label htmlFor="profile-city">
                                        City
                                    </label>
                                    <input
                                        id="profile-city"
                                        name="city"
                                        type="text"
                                        value={profile.city}
                                        onChange={handleChange}
                                        placeholder="Enter your city"
                                        autoComplete="address-level2"
                                        disabled={!isEditing}
                                    />
                                </div>

                                <div className="profile-field">
                                    <label htmlFor="profile-state">
                                        State
                                    </label>
                                    <input
                                        id="profile-state"
                                        name="state"
                                        type="text"
                                        value={profile.state}
                                        onChange={handleChange}
                                        placeholder="Enter your state"
                                        autoComplete="address-level1"
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>

                            {isEditing && (
                                <div className="profile-form-actions">
                                    <button
                                        type="button"
                                        className="profile-cancel-button"
                                        onClick={handleCancel}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="profile-save-button"
                                    >
                                        Save changes
                                    </button>
                                </div>
                            )}
                        </form>
                    </section>

                    <section className="profile-note-card">
                        <div className="profile-note-icon">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="9"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                />
                                <path
                                    d="M12 11v5m0-8h.01"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>

                        <div>
                            <h3>Keep your details up to date</h3>
                            <p>
                                Accurate contact and delivery information
                                helps you receive order updates and deliveries.
                            </p>
                        </div>
                    </section>

                    <footer className="profile-footer">
                        <span>LOKA</span>
                        <p>Your marketplace, all in one place.</p>
                    </footer>
                </div>
            </main>
        </div>
    );
};

export default CustomerProfile;