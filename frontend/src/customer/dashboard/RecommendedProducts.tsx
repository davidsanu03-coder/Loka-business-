import { Link } from "react-router-dom";
import "./recommendedProducts.css";

interface Product {
    id: number;
    name: string;
    seller: string;
    price: string;
    category: string;
    image: string;
}

const recommendedProducts: Product[] = [
    {
        id: 1,
        name: "Linen Co-ord Set",
        seller: "Atelier Nomad",
        price: "₦48,000",
        category: "Fashion",
        image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=80",
    },
    {
        id: 2,
        name: "Everyday Sneakers",
        seller: "Kora Goods",
        price: "₦72,000",
        category: "Footwear",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    },
    {
        id: 3,
        name: "Classic Everyday Bag",
        seller: "Hira Studio",
        price: "₦35,000",
        category: "Accessories",
        image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80",
    },
    {
        id: 4,
        name: "Minimal Wristwatch",
        seller: "North & Co.",
        price: "₦55,000",
        category: "Accessories",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
    },
];

const RecommendedProducts = () => {
    return (
        <section className="recommended-products">
            <div className="recommended-products-header">
                <div>
                    <h2>Recommended for you</h2>
                    <p>Discover products worth adding to your collection.</p>
                </div>

                <Link
                    to="/customer/discover"
                    className="recommended-view-all"
                >
                    Discover more
                    <span aria-hidden="true">→</span>
                </Link>
            </div>

            <div className="recommended-products-grid">
                {recommendedProducts.map((product) => (
                    <article
                        className="recommended-product-card"
                        key={product.id}
                    >
                        <Link
                            to="/customer/discover"
                            className="recommended-product-image-link"
                            aria-label={`Explore ${product.name}`}
                        >
                            <img
                                className="recommended-product-image"
                                src={product.image}
                                alt={product.name}
                                loading="lazy"
                            />
                            <span className="recommended-product-category">
                                {product.category}
                            </span>
                        </Link>

                        <div className="recommended-product-details">
                            <p className="recommended-product-seller">
                                {product.seller}
                            </p>

                            <h3>{product.name}</h3>

                            <div className="recommended-product-footer">
                                <strong>{product.price}</strong>

                                <Link
                                    to="/customer/discover"
                                    className="recommended-product-action"
                                    aria-label={`Discover ${product.name}`}
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M5 12h14" />
                                        <path d="m12 5 7 7-7 7" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default RecommendedProducts;