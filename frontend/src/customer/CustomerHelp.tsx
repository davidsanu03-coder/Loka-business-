import { useMemo, useState } from "react";
import Sidebar from "./dashboard/Sidebar";
import ThemeToggle from "../theme/ThemeToggle";
import "./styles/customerHelp.css";

interface FAQ {
    question: string;
    answer: string;
    category: string;
}

const faqs: FAQ[] = [
    {
        question: "How can I track my order?",
        answer:
            "Open Orders from your customer dashboard to review your purchases and check the latest available order status.",
        category: "Orders",
    },
    {
        question: "Can I cancel an order?",
        answer:
            "Cancellation depends on the order status and marketplace policies. Review your order details or contact support for assistance.",
        category: "Orders",
    },
    {
        question: "How do I contact a seller?",
        answer:
            "Visit Messages in your dashboard to view your conversations with sellers. You can use the available conversation options to follow up about a product or order.",
        category: "Orders",
    },
    {
        question: "How can I update my profile?",
        answer:
            "Open Profile under the Account section of the sidebar. You can edit your personal information and delivery details there.",
        category: "Account",
    },
    {
        question: "How do I change my settings?",
        answer:
            "Open Settings under Account to review the preference controls currently available in your dashboard.",
        category: "Account",
    },
    {
        question: "What should I do if I have a payment issue?",
        answer:
            "Keep your order details and any available payment reference handy, then contact the marketplace support team through its official support channel.",
        category: "Payments",
    },
    {
        question: "What if my order arrives damaged?",
        answer:
            "Keep the packaging and take photos of the issue if possible. Contact the seller through Messages and request assistance according to the applicable return policy.",
        category: "Orders",
    },
    {
        question: "How can I keep my account secure?",
        answer:
            "Use a strong, unique password and avoid sharing your login details. Contact support if you notice activity you do not recognize.",
        category: "Account",
    },
];

const categories = ["All", "Orders", "Account", "Payments"];

const CustomerHelp = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const [openFAQ, setOpenFAQ] = useState<string | null>(faqs[0].question);
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactSubject, setContactSubject] = useState("");
    const [contactMessage, setContactMessage] = useState("");
    const [formNotice, setFormNotice] = useState("");

    const filteredFAQs = useMemo(() => {
        const term = search.trim().toLowerCase();

        return faqs.filter((faq) => {
            const matchesCategory =
                activeCategory === "All" ||
                faq.category === activeCategory;

            const matchesSearch =
                !term ||
                faq.question.toLowerCase().includes(term) ||
                faq.answer.toLowerCase().includes(term) ||
                faq.category.toLowerCase().includes(term);

            return matchesCategory && matchesSearch;
        });
    }, [search, activeCategory]);

    const handleContactSubmit = (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        setFormNotice(
            "Your form is ready, but support submission has not been connected yet. Please use the marketplace's official support channel."
        );
    };

    return (
        <div className="customer-help">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {isSidebarOpen && (
                <button
                    type="button"
                    className="help-sidebar-backdrop"
                    aria-label="Close navigation menu"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <main className="help-main">
                <header className="help-topbar">
                    <button
                        type="button"
                        className="help-menu-button"
                        aria-label="Open navigation menu"
                        aria-controls="customer-sidebar"
                        aria-expanded={isSidebarOpen}
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <span />
                        <span />
                        <span />
                    </button>

                    <div className="help-topbar-heading">
                        <h1>Help & Support</h1>
                        <p>Find answers and get help with LOKA.</p>
                    </div>

                    <div className="help-topbar-actions">
                        <ThemeToggle />
                        <div className="help-avatar">DA</div>
                    </div>
                </header>

                <div className="help-content">
                    <section className="help-hero">
                        <span className="help-eyebrow">
                            WE ARE HERE TO HELP
                        </span>
                        <h2>How can we help you?</h2>
                        <p>
                            Search for answers to common questions about
                            orders, your account, and payments.
                        </p>

                        <div className="help-search">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                            >
                                <circle
                                    cx="10.8"
                                    cy="10.8"
                                    r="6.8"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                />
                                <path
                                    d="m16 16 4.5 4.5"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                />
                            </svg>

                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search for answers..."
                                aria-label="Search frequently asked questions"
                            />

                            {search && (
                                <button
                                    type="button"
                                    className="help-clear-search"
                                    onClick={() => setSearch("")}
                                    aria-label="Clear search"
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    </section>

                    <section className="help-categories">
                        <div className="help-section-heading">
                            <h2>Browse by topic</h2>
                            <p>
                                Choose a category to find relevant answers.
                            </p>
                        </div>

                        <div className="help-category-grid">
                            <button
                                type="button"
                                className={`help-category-card ${
                                    activeCategory === "Orders"
                                        ? "is-active"
                                        : ""
                                }`}
                                onClick={() =>
                                    setActiveCategory(
                                        activeCategory === "Orders"
                                            ? "All"
                                            : "Orders"
                                    )
                                }
                            >
                                <span className="help-category-icon">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 8H6"
                                            stroke="currentColor"
                                            strokeWidth="1.7"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <circle
                                            cx="10"
                                            cy="20"
                                            r="1"
                                            fill="currentColor"
                                        />
                                        <circle
                                            cx="18"
                                            cy="20"
                                            r="1"
                                            fill="currentColor"
                                        />
                                    </svg>
                                </span>
                                <strong>Orders & Delivery</strong>
                                <small>Tracking, cancellations and returns</small>
                            </button>

                            <button
                                type="button"
                                className={`help-category-card ${
                                    activeCategory === "Account"
                                        ? "is-active"
                                        : ""
                                }`}
                                onClick={() =>
                                    setActiveCategory(
                                        activeCategory === "Account"
                                            ? "All"
                                            : "Account"
                                    )
                                }
                            >
                                <span className="help-category-icon">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <circle
                                            cx="12"
                                            cy="8"
                                            r="4"
                                            stroke="currentColor"
                                            strokeWidth="1.7"
                                        />
                                        <path
                                            d="M4 21a8 8 0 0 1 16 0"
                                            stroke="currentColor"
                                            strokeWidth="1.7"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </span>
                                <strong>Account & Profile</strong>
                                <small>Personal details and settings</small>
                            </button>

                            <button
                                type="button"
                                className={`help-category-card ${
                                    activeCategory === "Payments"
                                        ? "is-active"
                                        : ""
                                }`}
                                onClick={() =>
                                    setActiveCategory(
                                        activeCategory === "Payments"
                                            ? "All"
                                            : "Payments"
                                    )
                                }
                            >
                                <span className="help-category-icon">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <rect
                                            x="2.5"
                                            y="5"
                                            width="19"
                                            height="14"
                                            rx="2.5"
                                            stroke="currentColor"
                                            strokeWidth="1.7"
                                        />
                                        <path
                                            d="M3 10h18"
                                            stroke="currentColor"
                                            strokeWidth="1.7"
                                        />
                                        <path
                                            d="M7 15h4"
                                            stroke="currentColor"
                                            strokeWidth="1.7"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </span>
                                <strong>Payments</strong>
                                <small>Payment issues and transactions</small>
                            </button>
                        </div>
                    </section>

                    <section className="help-faq-section">
                        <div className="help-section-heading">
                            <h2>Frequently asked questions</h2>
                            <p>
                                Answers to some common customer questions.
                            </p>
                        </div>

                        <div className="help-faq-filters">
                            {categories.map((category) => (
                                <button
                                    type="button"
                                    key={category}
                                    className={`help-filter-button ${
                                        activeCategory === category
                                            ? "is-active"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        setActiveCategory(category)
                                    }
                                >
                                    {category}
                                </button>
                            ))}
                        </div>

                        <div className="help-faq-list">
                            {filteredFAQs.length > 0 ? (
                                filteredFAQs.map((faq) => {
                                    const isOpen =
                                        openFAQ === faq.question;

                                    return (
                                        <article
                                            className={`help-faq-item ${
                                                isOpen ? "is-open" : ""
                                            }`}
                                            key={faq.question}
                                        >
                                            <button
                                                type="button"
                                                className="help-faq-question"
                                                aria-expanded={isOpen}
                                                onClick={() =>
                                                    setOpenFAQ(
                                                        isOpen
                                                            ? null
                                                            : faq.question
                                                    )
                                                }
                                            >
                                                <span>{faq.question}</span>
                                                <span className="help-faq-chevron">
                                                    {isOpen ? "−" : "+"}
                                                </span>
                                            </button>

                                            {isOpen && (
                                                <div className="help-faq-answer">
                                                    <p>{faq.answer}</p>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })
                            ) : (
                                <div className="help-empty-state">
                                    <h3>No answers found</h3>
                                    <p>
                                        Try another search term or choose
                                        a different category.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch("");
                                            setActiveCategory("All");
                                        }}
                                    >
                                        Clear filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="help-contact-section">
                        <div className="help-contact-intro">
                            <span className="help-eyebrow">
                                NEED MORE HELP?
                            </span>
                            <h2>Contact support</h2>
                            <p>
                                Tell us what you need help with. This form
                                is a frontend preview until connected to
                                the LOKA support service.
                            </p>

                            <div className="help-contact-tip">
                                <span aria-hidden="true">i</span>
                                <p>
                                    Never include your password or full
                                    payment card details in a support message.
                                </p>
                            </div>
                        </div>

                        <form
                            className="help-contact-form"
                            onSubmit={handleContactSubmit}
                        >
                            <div className="help-form-field">
                                <label htmlFor="help-name">Full name</label>
                                <input
                                    id="help-name"
                                    type="text"
                                    value={contactName}
                                    onChange={(event) =>
                                        setContactName(event.target.value)
                                    }
                                    placeholder="Enter your name"
                                    autoComplete="name"
                                    required
                                />
                            </div>

                            <div className="help-form-field">
                                <label htmlFor="help-email">
                                    Email address
                                </label>
                                <input
                                    id="help-email"
                                    type="email"
                                    value={contactEmail}
                                    onChange={(event) =>
                                        setContactEmail(event.target.value)
                                    }
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    required
                                />
                            </div>

                            <div className="help-form-field">
                                <label htmlFor="help-subject">Subject</label>
                                <select
                                    id="help-subject"
                                    value={contactSubject}
                                    onChange={(event) =>
                                        setContactSubject(event.target.value)
                                    }
                                    required
                                >
                                    <option value="" disabled>
                                        Choose a topic
                                    </option>
                                    <option value="order">
                                        Order or delivery
                                    </option>
                                    <option value="account">
                                        Account or profile
                                    </option>
                                    <option value="payment">
                                        Payment issue
                                    </option>
                                    <option value="seller">
                                        Seller communication
                                    </option>
                                    <option value="other">
                                        Something else
                                    </option>
                                </select>
                            </div>

                            <div className="help-form-field">
                                <label htmlFor="help-message">
                                    How can we help?
                                </label>
                                <textarea
                                    id="help-message"
                                    value={contactMessage}
                                    onChange={(event) =>
                                        setContactMessage(event.target.value)
                                    }
                                    placeholder="Describe the issue you're experiencing..."
                                    rows={5}
                                    required
                                />
                            </div>

                            {formNotice && (
                                <div
                                    className="help-form-notice"
                                    role="status"
                                >
                                    {formNotice}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="help-submit-button"
                            >
                                Prepare support request
                                <span aria-hidden="true">→</span>
                            </button>
                        </form>
                    </section>

                    <footer className="help-footer">
                        <span>LOKA</span>
                        <p>Your marketplace, all in one place.</p>
                    </footer>
                </div>
            </main>
        </div>
    );
};

export default CustomerHelp;