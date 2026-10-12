import React from 'react';
import { Link } from 'react-router-dom';
import './auth.css';
import ThemeToggle from '../theme/ThemeToggle';

const SellerSignup: React.FC = () => {
    return (
        <div className="auth-page">
            <section className="auth-intro">
                <Link to="/" className="auth-logo">
                    LOKA
                </Link>

                <div className="auth-message">
                    <h1>Build. Connect. Grow.</h1>
                    <p>
                        Grow your business and reach more customers with LOKA.
                    </p>
                </div>
            </section>

            <section className="auth-form-section">
                <div className="auth-theme-control">
                    <ThemeToggle />
                </div>

                <form
                    className="auth-form"
                    onSubmit={(e) => e.preventDefault()}
                >
                    <h2>Become a seller</h2>

                    <p className="auth-subtitle">
                        Create your account and start your journey.
                    </p>

                    <label htmlFor="seller-name">
                        Full name
                    </label>

                    <input
                        id="seller-name"
                        name="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        autoComplete="name"
                        required
                    />

                    <label htmlFor="seller-email">
                        Email address
                    </label>

                    <input
                        id="seller-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        autoComplete="email"
                        required
                    />

                    <label htmlFor="seller-password">
                        Password
                    </label>

                    <input
                        id="seller-password"
                        name="password"
                        type="password"
                        placeholder="Create a password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                    />

                    <label htmlFor="seller-confirm-password">
                        Confirm password
                    </label>

                    <input
                        id="seller-confirm-password"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                    />

                    <button type="submit" className="auth-submit">
                        Become a seller
                    </button>

                    <p className="auth-switch">
                        Already have an account?{' '}
                        <Link to="/login">Log in</Link>
                    </p>

                    <p className="auth-terms">
                        By continuing, you agree to our{' '}
                        <Link to="/terms">Terms of Service</Link>
                        {' '}and{' '}
                        <Link to="/privacy">Privacy Policy</Link>.
                    </p>
                </form>
            </section>
        </div>
    );
};

export default SellerSignup;