import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './auth.css';
import ThemeToggle from '../theme/ThemeToggle';
import { loginAccount } from '../lib/api';

const Login: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const form = new FormData(e.currentTarget);
        try {
            await loginAccount(String(form.get('email') ?? '').trim(), String(form.get('password') ?? ''));
            navigate('/app', { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to log in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <section className="auth-intro">
                <Link to="/" className="auth-logo">LOKA</Link>
                <div className="auth-message">
                    <h1>Build. Connect. Grow.</h1>
                    <p>Welcome back to LOKA. Discover products, connect with sellers, and grow your business.</p>
                </div>
            </section>

            <section className="auth-form-section">
                <div className="auth-theme-control"><ThemeToggle /></div>
                <form className="auth-form" onSubmit={handleSubmit}>
                    <h2>Welcome back</h2>
                    <p className="auth-subtitle">Log in to your LOKA account to continue.</p>

                    <label htmlFor="login-email">Email address</label>
                    <input id="login-email" name="email" type="email" placeholder="Enter your email" autoComplete="email" required />

                    <div className="auth-password-label">
                        <label htmlFor="login-password">Password</label>
                        <Link to="/forgot-password">Forgot password?</Link>
                    </div>

                    <div className="auth-password-wrapper">
                        <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" required />
                        <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    {error && <p className="auth-feedback auth-feedback-error" role="alert">{error}</p>}
                    <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>

                    <p className="auth-switch">Don't have an account? <Link to="/signup/customer">Create an account</Link></p>
                    <p className="auth-terms">By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
                </form>
            </section>
        </div>
    );
};

export default Login;
