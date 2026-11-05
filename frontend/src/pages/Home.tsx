import { useState } from "react";
import { Link } from "react-router-dom";
import PublicNavbar from "../components/layout/PublicNavbar";
import "./home.css";

const Home = () => {

    const [brandMessageIndex, setBrandMessageIndex] = useState(0);

    const brandMessages = [
        "BUILD. CONNECT. GROW.",
        "YOUR BUSINESS. YOUR FUTURE.",
        "MAKE YOUR NEXT MOVE.",
    ];

    return (
        <div className="loka-home">
            <PublicNavbar />

            <main>
                <section className="home-hero-section">
                    <div className="home-hero">
                        <div className="home-hero-content">
                            <span className="home-hero-label">
                                <span className="home-label-dot"></span>
                                Currently building with our community
                            </span>

                            <h1>
                                Building a simpler future for small businesses.
                            </h1>

                            <p className="home-hero-description">
                                LOKA is building a simple business ecosystem
                                that helps entrepreneurs establish an online
                                presence, connect with customers, and grow.
                            </p>

                            <div className="home-hero-actions">
                                <Link
                                    to="/customer/signup"
                                    className="home-primary-button"
                                >
                                    Join the waitlist
                                    <span aria-hidden="true">→</span>
                                </Link>

                                <Link
                                    to="/products"
                                    className="home-secondary-link"
                                >
                                    Discover LOKA
                                </Link>
                            </div>
                        </div>

                        {/* <div className="home-brand-panel">
                            <div className="home-brand-content">
                                <span className="home-brand-name">LOKA</span>
                                <span className="home-brand-tagline">
                                    BUILD. CONNECT. GROW.
                                </span>
                            </div>
                            <div className="home-brand-decoration"></div>
                        </div> */}
                        
                        <div
                            className="home-brand-panel"
                            role="button"
                            tabIndex={0}
                            aria-label="Explore LOKA brand messages"
                            onClick={() =>
                                setBrandMessageIndex(
                                    (current) => (current + 1) % brandMessages.length
                                )
                            }
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    setBrandMessageIndex(
                                        (current) => (current + 1) % brandMessages.length
                                    );
                                }
                            }}
                        >
                            <div className="home-brand-glow"></div>

                            <div className="home-brand-content">
                                <span className="home-brand-name">LOKA</span>

                                <span
                                    className="home-brand-tagline"
                                    key={brandMessageIndex}
                                >
                                    {brandMessages[brandMessageIndex]}
                                </span>

                                <span className="home-brand-hint">
                                    CLICK TO EXPLORE
                                </span>
                            </div>

                            <div className="home-brand-decoration">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>

                    </div>
                </section>

                <section className="home-vision-section">
                    <span className="home-section-eyebrow">OUR VISION</span>

                    <p>
                        Empowering entrepreneurs to start, grow, and create
                        impact.
                    </p>
                </section>

                <section className="home-products-section">
                    <div className="home-section-heading">
                        <div>
                            <span className="home-section-eyebrow">
                                EXPLORE THE MARKETPLACE
                            </span>

                            <h2>Discover what LOKA has to offer</h2>

                            <p>
                                Explore products from independent sellers and
                                discover something you'll love.
                            </p>
                        </div>

                        <Link
                            to="/products"
                            className="home-explore-link"
                        >
                            Explore products
                            <span aria-hidden="true">→</span>
                        </Link>
                    </div>

                    <div className="home-product-placeholders">
                        <article className="home-product-placeholder">
                            <div className="home-placeholder-art home-art-fashion">
                                <span>FASHION</span>
                            </div>
                            <h3>Fashion and clothing</h3>
                            <p>Discover independent fashion brands.</p>
                        </article>

                        <article className="home-product-placeholder">
                            <div className="home-placeholder-art home-art-lifestyle">
                                <span>LIFESTYLE</span>
                            </div>
                            <h3>Lifestyle and accessories</h3>
                            <p>Find useful pieces for everyday living.</p>
                        </article>

                        <article className="home-product-placeholder">
                            <div className="home-placeholder-art home-art-creatives">
                                <span>CREATIVES</span>
                            </div>
                            <h3>Creative businesses</h3>
                            <p>Explore the work of independent creators.</p>
                        </article>
                    </div>
                </section>

                <section className="home-seller-cta">
                    <div>
                        <span className="home-section-eyebrow">
                            SELL ON LOKA
                        </span>

                        <h2>Have a business? Let's help it grow.</h2>

                        <p>
                            Build your presence, reach new customers, and
                            connect with a growing business community.
                        </p>
                    </div>

                    <Link
                        to="/signup/seller"
                        className="home-primary-button"
                    >
                        Join as a seller
                        <span aria-hidden="true">→</span>
                    </Link>
                </section>
            </main>

            <footer className="home-footer">
                <Link to="/" className="home-footer-logo">
                    LOKA
                </Link>

                <p>Build. Connect. Grow.</p>

                <span>
                    © {new Date().getFullYear()} LOKA. All rights reserved.
                </span>
            </footer>
        </div>
    );
};

export default Home;