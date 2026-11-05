import { useMemo, useState } from "react";
import "./styles/customerDiscover.css";
import { NavLink } from "react-router-dom";
import Sidebar from "./dashboard/Sidebar";
import ThemeToggle from "../theme/ThemeToggle";

interface Product {
  id: number;
  name: string;
  category: string;
  seller: string;
  price: number;
  description: string;
  image: string;
}

const products: Product[] = [
  {
    id: 1,
    name: "Linen Two-Piece Set",
    category: "Fashion",
    seller: "Atelier Nomad",
    price: 48000,
    description:
      "A comfortable two-piece linen outfit designed for everyday wear and relaxed occasions.",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 2,
    name: "Everyday Sneakers",
    category: "Shoes",
    seller: "Kora Goods",
    price: 72000,
    description:
      "Versatile everyday sneakers with a clean design that pairs easily with casual outfits.",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 3,
    name: "Classic Everyday Bag",
    category: "Accessories",
    seller: "Hira Studio",
    price: 35000,
    description:
      "A simple, practical bag for carrying your daily essentials.",
    image:
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 4,
    name: "Minimal Wristwatch",
    category: "Accessories",
    seller: "Timecraft",
    price: 56000,
    description:
      "A minimalist wristwatch with a timeless look for everyday use.",
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 5,
    name: "Wireless Headphones",
    category: "Electronics",
    seller: "Sound District",
    price: 95000,
    description:
      "Wireless headphones for listening to music, watching videos, and working on the go.",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 6,
    name: "Ceramic Coffee Mug",
    category: "Home",
    seller: "Clay Corner",
    price: 12000,
    description:
      "A simple ceramic mug for your coffee, tea, and other favourite drinks.",
    image:
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=700&q=80",
  },
];

const categories = [
  "All",
  "Fashion",
  "Shoes",
  "Accessories",
  "Electronics",
  "Home",
];

const formatPrice = (price: number) =>
  `₦${price.toLocaleString("en-NG")}`;

const CustomerDiscover = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("featured");
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);
  const [notice, setNotice] = useState("");

  const closeSidebar = () => setIsSidebarOpen(false);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        product.seller.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);

      const matchesCategory =
        category === "All" || product.category === category;

      return matchesSearch && matchesCategory;
    });

    if (sortBy === "price-low") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [search, category, sortBy]);

  const toggleWishlist = (productId: number) => {
    const isSaved = wishlist.includes(productId);

    setWishlist((current) =>
      isSaved
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );

    setNotice(
      isSaved
        ? "Product removed from your saved items."
        : "Product added to your saved items.",
    );
  };

  const addToCart = (product: Product) => {
    setCart((current) => ({
      ...current,
      [product.id]: (current[product.id] || 0) + 1,
    }));

    setNotice(`${product.name} added to your demo cart.`);
  };

  const cartCount = Object.values(cart).reduce(
    (total, quantity) => total + quantity,
    0,
  );

  return (
    <div className="customer-discover">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {isSidebarOpen && (
        <button
          type="button"
          className="discover-backdrop"
          onClick={closeSidebar}
          aria-label="Close navigation menu"
        />
      )}

      <main className="discover-main">
        <header className="discover-topbar">
          <button
            type="button"
            className="discover-menu-button"
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

          <div className="discover-brand">LOKA</div>

          <div className="discover-topbar-actions">
            <NavLink
              to="/customer/cart"
              className="discover-cart-link"
              aria-label={`Shopping cart, ${cartCount} demo items`}
            >
              Cart <span>{cartCount}</span>
            </NavLink>

            <ThemeToggle />

            <NavLink
              to="/customer/profile"
              className="discover-avatar"
              aria-label="Customer profile"
            >
              DA
            </NavLink>
          </div>
        </header>

        <section className="discover-content">
          <div className="discover-heading">
            <div>
              <p className="discover-eyebrow">THE LOKA MARKETPLACE</p>
              <h1>Discover products</h1>
              <p className="discover-subtitle">
                Find something you love from independent sellers.
              </p>
            </div>

            <div className="discover-saved-count">
              <span aria-hidden="true">♡</span>
              {wishlist.length} saved
            </div>
          </div>

          <div className="discover-search-row">
            <label className="discover-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search products, categories or sellers..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search products, categories or sellers"
              />
            </label>

            <label className="discover-sort">
              <span>Sort by</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </label>
          </div>

          <div className="discover-categories" aria-label="Product categories">
            {categories.map((item) => (
              <button
                type="button"
                key={item}
                className={
                  category === item
                    ? "discover-category active"
                    : "discover-category"
                }
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="discover-results-heading">
            <div>
              <h2>
                {category === "All" ? "Explore products" : category}
              </h2>
              <p>
                {visibleProducts.length}{" "}
                {visibleProducts.length === 1 ? "product" : "products"} found
              </p>
            </div>
          </div>

          {notice && (
            <div className="discover-notice" role="status">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                &times;
              </button>
            </div>
          )}

          {visibleProducts.length > 0 ? (
            <div className="discover-product-grid">
              {visibleProducts.map((product) => {
                const isSaved = wishlist.includes(product.id);

                return (
                  <article
                    className="discover-product-card"
                    key={product.id}
                  >
                    <div className="discover-product-image">
                      <img src={product.image} alt={product.name} />

                      <button
                        type="button"
                        className={
                          isSaved
                            ? "discover-wishlist-button saved"
                            : "discover-wishlist-button"
                        }
                        onClick={() => toggleWishlist(product.id)}
                        aria-label={
                          isSaved
                            ? `Remove ${product.name} from saved items`
                            : `Save ${product.name}`
                        }
                        aria-pressed={isSaved}
                      >
                        {isSaved ? "♥" : "♡"}
                      </button>

                      <span className="discover-product-category">
                        {product.category}
                      </span>
                    </div>

                    <div className="discover-product-info">
                      <p className="discover-seller">{product.seller}</p>
                      <h3>{product.name}</h3>
                      <p className="discover-product-price">
                        {formatPrice(product.price)}
                      </p>

                      <div className="discover-product-actions">
                        <button
                          type="button"
                          className="discover-add-button"
                          onClick={() => addToCart(product)}
                        >
                          Add to cart
                        </button>

                        <button
                          type="button"
                          className="discover-details-button"
                          onClick={() => setSelectedProduct(product)}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="discover-empty">
              <span aria-hidden="true">⌕</span>
              <h3>No products found</h3>
              <p>
                Try another search term or choose a different category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
      </main>

      {selectedProduct && (
        <div
          className="discover-modal-backdrop"
          onClick={() => setSelectedProduct(null)}
        >
          <section
            className="discover-product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="discover-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="discover-modal-close"
              onClick={() => setSelectedProduct(null)}
              aria-label="Close product details"
            >
              &times;
            </button>

            <img
              src={selectedProduct.image}
              alt={selectedProduct.name}
            />

            <div className="discover-modal-info">
              <p className="discover-eyebrow">
                {selectedProduct.category}
              </p>
              <h2 id="discover-modal-title">
                {selectedProduct.name}
              </h2>
              <p className="discover-seller">
                Sold by {selectedProduct.seller}
              </p>
              <p className="discover-modal-price">
                {formatPrice(selectedProduct.price)}
              </p>
              <p className="discover-modal-description">
                {selectedProduct.description}
              </p>

              <button
                type="button"
                className="discover-add-button"
                onClick={() => addToCart(selectedProduct)}
              >
                Add to cart
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default CustomerDiscover;