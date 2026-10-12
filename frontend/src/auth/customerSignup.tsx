import React from 'react';
import { Link } from 'react-router-dom';
import './auth.css';
import ThemeToggle from '../theme/ThemeToggle';

const customerSignup: React.FC = () => {
    return (
        <div className="auth-page">
            <section className="auth-intro">
                <Link to="/" className="auth-logo">
                    LOKA
                </Link>

                <div className="auth-message">
                    <h1>Build. Connect. Grow.</h1>
                    <p>
                        A marketplace connecting customers with exceptional sellers.
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
                    <h2>Create your account</h2>

                    <p className="auth-subtitle">
                        Join LOKA and discover something great.
                    </p>

                    <label htmlFor="customer-name">Full name</label>
                    <input
                        id="customer-name"
                        name="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        autoComplete="name"
                        required
                    />

                    <label htmlFor="customer-email">Email address</label>
                    <input
                        id="customer-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        autoComplete="email"
                        required
                    />

                    <label htmlFor="customer-password">Password</label>
                    <input
                        id="customer-password"
                        name="password"
                        type="password"
                        placeholder="Create a password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                    />

                    <label htmlFor="customer-confirm-password">
                        Confirm password
                    </label>
                    <input
                        id="customer-confirm-password"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                    />

                    <button type="submit" className="auth-submit">
                        Create account
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

export default customerSignup;