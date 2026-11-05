import { useState } from "react";
import { NavLink } from "react-router-dom";
import "./styles/customerCart.css";
import Sidebar from "./dashboard/Sidebar";
import ThemeToggle from "../theme/ThemeToggle";

interface CartItem {
  id: number;
  name: string;
  seller: string;
  price: number;
  quantity: number;
  image: string;
}

const initialItems: CartItem[] = [
  {
    id: 1,
    name: "Linen Set",
    seller: "Atelier Nomad",
    price: 48000,
    quantity: 1,
    image: "LS",
  },
  {
    id: 2,
    name: "Studio Sneaker",
    seller: "Kora Goods",
    price: 72000,
    quantity: 1,
    image: "SS",
  },
  {
    id: 3,
    name: "Everyday Bag",
    seller: "Hira Studio",
    price: 35000,
    quantity: 1,
    image: "EB",
  },
];

const formatPrice = (amount: number) =>
  `₦${amount.toLocaleString("en-NG")}`;

const CustomerCart = () => {
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const updateQuantity = (id: number, change: number) => {
    setItems((currentItems) =>
      currentItems
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + change }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: number) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== id)
    );
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    alert("Checkout will be available when payment integration is connected.");
  };

  return (
    <div className="customer-dashboard cart-page">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      <main className="dashboard-main cart-main">
        <header className="customer-topbar cart-topbar">
          <button
            type="button"
            className="topbar-menu-button"
            onClick={() => setIsSidebarOpen((open) => !open)}
            aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isSidebarOpen}
            aria-controls="customer-sidebar"
          >
            <span />
            <span />
            <span />
          </button>

          <div className="topbar-brand cart-brand">LOKA</div>

          <div className="topbar-welcome cart-heading">
            <h2>Your cart</h2>
            <p>Review items before checkout</p>
          </div>

          <div className="topbar-actions cart-header-actions">
            <div className="topbar-theme-control">
              <ThemeToggle />
            </div>

            <div
              className="topbar-avatar"
              title="Customer profile"
              aria-label="Customer profile"
            >
              DA
            </div>
          </div>
        </header>

        <section className="cart-layout" aria-label="Shopping cart">
          <div className="cart-items-section">
            <div className="cart-section-heading">
              <h1>Shopping items</h1>
              <span>{items.length} {items.length === 1 ? "item" : "items"}</span>
            </div>

            {items.length > 0 ? (
              <div className="cart-items-list">
                {items.map((item) => (
                  <article className="cart-item" key={item.id}>
                    <div className="cart-product-image" aria-hidden="true">
                      {item.image}
                    </div>

                    <div className="cart-product-info">
                      <h2>{item.name}</h2>
                      <p>{item.seller}</p>
                      <span className="cart-mobile-price">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>

                    <div className="cart-item-controls">
                      <span className="cart-item-price">
                        {formatPrice(item.price * item.quantity)}
                      </span>

                      <div
                        className="cart-quantity-control"
                        aria-label={`Quantity for ${item.name}`}
                      >
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          aria-label={`Decrease ${item.name} quantity`}
                        >
                          −
                        </button>

                        <span aria-live="polite">{item.quantity}</span>

                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          aria-label={`Increase ${item.name} quantity`}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cart-remove-button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="cart-empty-state">
                <div className="cart-empty-icon">🛍</div>
                <h2>Your cart is empty</h2>
                <p>Discover something you'll love from our independent sellers.</p>
                <NavLink to="/customer/discover" className="cart-continue-button">
                  Continue shopping
                </NavLink>
              </div>
            )}
          </div>

          <aside className="cart-summary">
            <h2>Order summary</h2>

            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <div className="cart-summary-row cart-summary-note">
              <span>Delivery and fees</span>
              <span>Calculated at checkout</span>
            </div>

            <div className="cart-summary-divider" />

            <div className="cart-summary-total">
              <span>Total</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <p className="cart-summary-footnote">
              Delivery fees, if applicable, will be confirmed at checkout.
            </p>

            <button
              type="button"
              className="cart-checkout-button"
              onClick={handleCheckout}
              disabled={items.length === 0}
            >
              Proceed to checkout
            </button>

            <NavLink
              to="/customer/discover"
              className="cart-continue-link"
            >
              Continue shopping
            </NavLink>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default CustomerCart;