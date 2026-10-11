import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './auth.css';
import ThemeToggle from '../theme/ThemeToggle';

const Login: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
    };

    return (
        <div className="auth-page">
            <section className="auth-intro">
                <Link to="/" className="auth-logo">
                    LOKA
                </Link>

                <div className="auth-message">
                    <h1>Build. Connect. Grow.</h1>
                    <p>
                        Welcome back to LOKA. Discover products,
                        connect with sellers, and grow your business.
                    </p>
                </div>
            </section>

            <section className="auth-form-section">
                <div className="auth-theme-control">
                    <ThemeToggle />
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <h2>Welcome back</h2>

                    <p className="auth-subtitle">
                        Log in to your LOKA account to continue.
                    </p>

                    <label htmlFor="login-email">
                        Email address
                    </label>

                    <input
                        id="login-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        autoComplete="email"
                        required
                    />

                    <div className="auth-password-label">
                        <label htmlFor="login-password">
                            Password
                        </label>

                        <Link to="/forgot-password">
                            Forgot password?
                        </Link>
                    </div>

                    <div className="auth-password-wrapper">
                        <input
                            id="login-password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            required
                        />

                        <button
                            type="button"
                            className="auth-password-toggle"
                            onClick={() => setShowPassword((previous) => !previous)}
                            aria-label={
                                showPassword ? 'Hide password' : 'Show password'
                            }
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    <button type="submit" className="auth-submit">
                        Log in
                    </button>

                    <p className="auth-switch">
                        Don't have an account?{' '}
                        <Link to="/signup/customer">
                            Create an account
                        </Link>
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

export default Login;