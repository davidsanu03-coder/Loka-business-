import { Link } from "react-router-dom";
import "./recentActivity.css";

type ActivityType = "order" | "message" | "delivery" | "saved";

interface Activity {
    id: number;
    type: ActivityType;
    title: string;
    description: string;
    time: string;
    link: string;
    linkLabel: string;
}

const activities: Activity[] = [
    {
        id: 1,
        type: "order",
        title: "Order is being processed",
        description: "Your Linen Set order is being prepared by Atelier Nomad.",
        time: "Today",
        link: "/customer/orders",
        linkLabel: "View order",
    },
    {
        id: 2,
        type: "message",
        title: "New message",
        description: "You have a new conversation waiting in your inbox.",
        time: "Today",
        link: "/customer/messages",
        linkLabel: "Open messages",
    },
    {
        id: 3,
        type: "delivery",
        title: "Order has been shipped",
        description: "Your Studio Sneaker order is on its way.",
        time: "Yesterday",
        link: "/customer/orders",
        linkLabel: "Track order",
    },
    {
        id: 4,
        type: "saved",
        title: "Your saved items",
        description: "Continue exploring products you have saved.",
        time: "Recently",
        link: "/customer/discover",
        linkLabel: "Discover products",
    },
];

const ActivityIcon = ({ type }: { type: ActivityType }) => {
    switch (type) {
        case "order":
            return (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 7h12l1 14H5L6 7Z" />
                    <path d="M9 7a3 3 0 0 1 6 0" />
                </svg>
            );

        case "message":
            return (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
                </svg>
            );

        case "delivery":
            return (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 7h11v11H3z" />
                    <path d="M14 11h4l3 3v4h-7z" />
                    <circle cx="7.5" cy="18.5" r="1.5" />
                    <circle cx="17.5" cy="18.5" r="1.5" />
                </svg>
            );

        case "saved":
            return (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                </svg>
            );
    }
};

const RecentActivity = () => {
    return (
        <section className="recent-activity">
            <div className="recent-activity-header">
                <div>
                    <h2>Recent activity</h2>
                    <p>Updates and things that need your attention.</p>
                </div>

                <span className="recent-activity-count">
                    {activities.length} updates
                </span>
            </div>

            <div className="recent-activity-list">
                {activities.map((activity) => (
                    <article
                        className="activity-item"
                        key={activity.id}
                    >
                        <div
                            className={`activity-icon activity-icon-${activity.type}`}
                        >
                            <ActivityIcon type={activity.type} />
                        </div>

                        <div className="activity-content">
                            <div className="activity-title-row">
                                <h3>{activity.title}</h3>
                                <span className="activity-time">
                                    {activity.time}
                                </span>
                            </div>

                            <p>{activity.description}</p>

                            <Link
                                to={activity.link}
                                className="activity-link"
                            >
                                {activity.linkLabel}
                                <span aria-hidden="true">→</span>
                            </Link>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default RecentActivity;