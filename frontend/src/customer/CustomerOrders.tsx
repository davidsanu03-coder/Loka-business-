import { useMemo, useState } from "react";
import "./styles/customerOrders.css";
import Sidebar from "./dashboard/Sidebar";
import ThemeToggle from "../theme/ThemeToggle";

type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

interface OrderItem {
  name: string;
  seller: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  deliveryAddress: string;
  trackingNumber: string;
  estimatedDelivery: string;
}

const initialOrders: Order[] = [
  {
    id: "LOK-2026-001",
    date: "October 10, 2026",
    status: "Shipped",
    items: [
      {
        name: "Linen Two-Piece Set",
        seller: "Atelier Nomad",
        quantity: 1,
        price: 48000,
      },
      {
        name: "Everyday Bag",
        seller: "Hira Studio",
        quantity: 1,
        price: 35000,
      },
    ],
    total: 83000,
    deliveryAddress: "Lagos, Nigeria",
    trackingNumber: "LOKA-TRK-10482",
    estimatedDelivery: "October 16, 2026",
  },
  {
    id: "LOK-2026-002",
    date: "October 8, 2026",
    status: "Processing",
    items: [
      {
        name: "Studio Sneakers",
        seller: "Kora Goods",
        quantity: 1,
        price: 72000,
      },
    ],
    total: 72000,
    deliveryAddress: "Lagos, Nigeria",
    trackingNumber: "Not available yet",
    estimatedDelivery: "Awaiting confirmation",
  },
  {
    id: "LOK-2026-003",
    date: "October 4, 2026",
    status: "Delivered",
    items: [
      {
        name: "Classic Everyday Bag",
        seller: "Hira Studio",
        quantity: 1,
        price: 35000,
      },
    ],
    total: 35000,
    deliveryAddress: "Lagos, Nigeria",
    trackingNumber: "LOKA-TRK-10316",
    estimatedDelivery: "October 9, 2026",
  },
  {
    id: "LOK-2026-004",
    date: "October 2, 2026",
    status: "Pending",
    items: [
      {
        name: "Cotton Shirt",
        seller: "Atelier Nomad",
        quantity: 2,
        price: 26000,
      },
    ],
    total: 52000,
    deliveryAddress: "Lagos, Nigeria",
    trackingNumber: "Not available yet",
    estimatedDelivery: "Awaiting confirmation",
  },
  {
    id: "LOK-2026-005",
    date: "September 25, 2026",
    status: "Cancelled",
    items: [
      {
        name: "Minimal Wristwatch",
        seller: "Kora Goods",
        quantity: 1,
        price: 42000,
      },
    ],
    total: 42000,
    deliveryAddress: "Lagos, Nigeria",
    trackingNumber: "Not available",
    estimatedDelivery: "Order cancelled",
  },
];

const filters = [
  "All",
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
] as const;

type OrderFilter = (typeof filters)[number];

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

const CustomerOrders = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("All");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesFilter =
        activeFilter === "All" || order.status === activeFilter;

      const matchesSearch =
        !query ||
        order.id.toLowerCase().includes(query) ||
        order.items.some(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            item.seller.toLowerCase().includes(query),
        );

      return matchesFilter && matchesSearch;
    });
  }, [orders, search, activeFilter]);

  const getStatusClass = (status: OrderStatus) =>
    status.toLowerCase().replace(/\s+/g, "-");

  const getProgress = (status: OrderStatus) => {
    switch (status) {
      case "Pending":
        return 1;
      case "Processing":
        return 2;
      case "Shipped":
        return 3;
      case "Delivered":
        return 4;
      case "Cancelled":
        return 0;
      default:
        return 0;
    }
  };

  const getItemSummary = (order: Order) => {
    const count = order.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );

    return `${count} ${count === 1 ? "item" : "items"}`;
  };

  return (
    <div className="customer-orders">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {isSidebarOpen && (
        <button
          type="button"
          className="orders-sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      <main className="orders-main">
        <header className="orders-topbar">
          <button
            type="button"
            className="orders-menu-button"
            onClick={() => setIsSidebarOpen((current) => !current)}
            aria-label={
              isSidebarOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={isSidebarOpen}
            aria-controls="customer-sidebar"
          >
            <span />
            <span />
            <span />
          </button>

          <div className="orders-brand">LOKA</div>

          <div className="orders-topbar-actions">
            <ThemeToggle />
            <a
              href="/customer/profile"
              className="orders-avatar"
              aria-label="Customer profile"
            >
              DA
            </a>
          </div>
        </header>

        <section className="orders-content">
          <div className="orders-heading">
            <div>
              <p className="orders-eyebrow">YOUR PURCHASES</p>
              <h1>My Orders</h1>
              <p>View your purchases and follow their delivery progress.</p>
            </div>

            <div className="orders-count">
              <span>{orders.length}</span>
              total orders
            </div>
          </div>

          <div className="orders-summary">
            <div className="orders-summary-card">
              <span className="orders-summary-icon">◷</span>
              <div>
                <p>Pending</p>
                <strong>
                  {orders.filter((order) => order.status === "Pending").length}
                </strong>
              </div>
            </div>

            <div className="orders-summary-card">
              <span className="orders-summary-icon">↗</span>
              <div>
                <p>In transit</p>
                <strong>
                  {orders.filter((order) => order.status === "Shipped").length}
                </strong>
              </div>
            </div>

            <div className="orders-summary-card">
              <span className="orders-summary-icon">✓</span>
              <div>
                <p>Delivered</p>
                <strong>
                  {
                    orders.filter((order) => order.status === "Delivered")
                      .length
                  }
                </strong>
              </div>
            </div>
          </div>

          <section className="orders-list-section">
            <div className="orders-toolbar">
              <div>
                <h2>Order history</h2>
                <p>Find and manage your purchases.</p>
              </div>

              <label className="orders-search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search orders or products..."
                  aria-label="Search orders or products"
                />
              </label>
            </div>

            <div className="orders-filters" aria-label="Filter orders">
              {filters.map((filter) => (
                <button
                  type="button"
                  key={filter}
                  className={
                    activeFilter === filter ? "active" : ""
                  }
                  onClick={() => setActiveFilter(filter)}
                  aria-pressed={activeFilter === filter}
                >
                  {filter}
                  {filter === "All" && (
                    <span className="orders-filter-count">
                      {orders.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="orders-list">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <article className="order-card" key={order.id}>
                    <div className="order-card-header">
                      <div>
                        <span className="order-reference">ORDER ID</span>
                        <h3>{order.id}</h3>
                      </div>

                      <span
                        className={`order-status ${getStatusClass(
                          order.status,
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="order-card-info">
                      <div>
                        <span>Order date</span>
                        <strong>{order.date}</strong>
                      </div>
                      <div>
                        <span>Items</span>
                        <strong>{getItemSummary(order)}</strong>
                      </div>
                      <div>
                        <span>Total amount</span>
                        <strong className="order-total">
                          {formatPrice(order.total)}
                        </strong>
                      </div>
                    </div>

                    <div className="order-product-list">
                      {order.items.map((item) => (
                        <div
                          className="order-product"
                          key={`${order.id}-${item.name}`}
                        >
                          <div className="order-product-icon">
                            {item.name.charAt(0)}
                          </div>

                          <div className="order-product-details">
                            <strong>{item.name}</strong>
                            <span>
                              {item.seller} · Qty {item.quantity}
                            </span>
                          </div>

                          <span className="order-product-price">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.status !== "Cancelled" && (
                      <div className="order-progress">
                        {["Ordered", "Processing", "Shipped", "Delivered"].map(
                          (step, index) => {
                            const complete =
                              index < getProgress(order.status);
                            const current =
                              index === getProgress(order.status) - 1;

                            return (
                              <div
                                className={`order-progress-step ${
                                  complete ? "complete" : ""
                                } ${current ? "current" : ""}`}
                                key={step}
                              >
                                <span className="order-progress-dot">
                                  {complete ? "✓" : index + 1}
                                </span>
                                <span>{step}</span>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}

                    <div className="order-card-footer">
                      <span className="order-delivery-note">
                        {order.status === "Delivered"
                          ? "Your order has been delivered."
                          : order.status === "Cancelled"
                            ? "This order was cancelled."
                            : order.trackingNumber === "Not available yet"
                              ? "Tracking details will be available when ready."
                              : `Estimated delivery: ${order.estimatedDelivery}`}
                      </span>

                      <button
                        type="button"
                        className="order-details-button"
                        onClick={() => setSelectedOrder(order)}
                      >
                        {order.status === "Shipped"
                          ? "Track order"
                          : "View details"}
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="orders-empty">
                  <span aria-hidden="true">▤</span>
                  <h3>No orders found</h3>
                  <p>
                    Try a different search term or select another order status.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setActiveFilter("All");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </section>
        </section>
      </main>

      {selectedOrder && (
        <div
          className="order-modal-backdrop"
          onClick={() => setSelectedOrder(null)}
        >
          <section
            className="order-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="order-modal-header">
              <div>
                <p className="orders-eyebrow">ORDER INFORMATION</p>
                <h2 id="order-modal-title">Order details</h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
              >
                ×
              </button>
            </header>

            <div className="order-modal-body">
              <div className="order-modal-reference">
                <span>Order number</span>
                <strong>{selectedOrder.id}</strong>
                <span
                  className={`order-status ${getStatusClass(
                    selectedOrder.status,
                  )}`}
                >
                  {selectedOrder.status}
                </span>
              </div>

              <div className="order-modal-section">
                <h3>Items ordered</h3>

                {selectedOrder.items.map((item) => (
                  <div
                    className="order-modal-item"
                    key={`${selectedOrder.id}-${item.name}`}
                  >
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {item.seller} · Qty {item.quantity}
                      </span>
                    </div>
                    <strong>
                      {formatPrice(item.price * item.quantity)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="order-modal-section">
                <h3>Delivery information</h3>

                <div className="order-modal-info">
                  <span>Delivery address</span>
                  <strong>{selectedOrder.deliveryAddress}</strong>
                </div>

                <div className="order-modal-info">
                  <span>Tracking number</span>
                  <strong>{selectedOrder.trackingNumber}</strong>
                </div>

                <div className="order-modal-info">
                  <span>Estimated delivery</span>
                  <strong>{selectedOrder.estimatedDelivery}</strong>
                </div>
              </div>

              <div className="order-modal-total">
                <span>Total paid / order total</span>
                <strong>{formatPrice(selectedOrder.total)}</strong>
              </div>

              <p className="order-modal-note">
                Demo order information. Live payment and courier tracking
                details will appear when connected to the LOKA backend.
              </p>
            </div>

            <button
              type="button"
              className="order-modal-close"
              onClick={() => setSelectedOrder(null)}
            >
              Close details
            </button>
          </section>
        </div>
      )}
    </div>
  );
};

export default CustomerOrders;