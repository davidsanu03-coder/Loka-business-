import { Link } from "react-router-dom";
import "./recentOrders.css";

interface Order {
    id: string;
    product: string;
    seller: string;
    date: string;
    amount: string;
    status: "Processing" | "Shipped" | "Delivered" | "Cancelled";
}

const recentOrders: Order[] = [
    {
        id: "LKA-1001",
        product: "Linen Set",
        seller: "Atelier Nomad",
        date: "12 Oct 2026",
        amount: "₦48,000",
        status: "Processing",
    },
    {
        id: "LKA-1002",
        product: "Studio Sneaker",
        seller: "Kora Goods",
        date: "10 Oct 2026",
        amount: "₦72,000",
        status: "Shipped",
    },
    {
        id: "LKA-1003",
        product: "Everyday Bag",
        seller: "Hira Studio",
        date: "8 Oct 2026",
        amount: "₦35,000",
        status: "Delivered",
    },
];

const RecentOrders = () => {
    return (
        <section className="recent-orders">
            <div className="recent-orders-header">
                <div>
                    <h2>Recent orders</h2>
                    <p>Keep track of your latest purchases.</p>
                </div>

                <Link to="/customer/orders" className="recent-orders-link">
                    View all
                    <span aria-hidden="true">→</span>
                </Link>
            </div>

            <div className="recent-orders-list">
                {recentOrders.map((order) => (
                    <article className="recent-order-card" key={order.id}>
                        <div className="recent-order-info">
                            <div className="recent-order-icon" aria-hidden="true">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M6 7h12l1 14H5L6 7Z" />
                                    <path d="M9 7a3 3 0 0 1 6 0" />
                                </svg>
                            </div>

                            <div className="recent-order-details">
                                <h3>{order.product}</h3>
                                <p>{order.seller}</p>
                                <span>{order.date}</span>
                            </div>
                        </div>

                        <div className="recent-order-summary">
                            <strong>{order.amount}</strong>

                            <span
                                className={`recent-order-status status-${order.status.toLowerCase()}`}
                            >
                                {order.status}
                            </span>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default RecentOrders;