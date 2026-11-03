import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './auth.css';
import ThemeToggle from '../theme/ThemeToggle';
import { registerAccount } from '../lib/api';

const CustomerSignup: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const formElement = e.currentTarget;
        const form = new FormData(formElement);
        const password = String(form.get('password') ?? '');
        const confirmPassword = String(form.get('confirmPassword') ?? '');
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const result = await registerAccount({
                fullName: String(form.get('fullName') ?? '').trim(),
                email: String(form.get('email') ?? '').trim(),
                phone: String(form.get('phone') ?? '').trim() || undefined,
                password
            });
            formElement.reset();
            if (result.session?.access_token) {
                navigate('/app', { replace: true });
                return;
            }
            setSuccess('Your account has been created. Check your email to confirm your address, then log in.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to create your account. Please try again.');
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
                    <p>A marketplace connecting customers with exceptional sellers.</p>
                </div>
            </section>
            <section className="auth-form-section">
                <div className="auth-theme-control"><ThemeToggle /></div>
                <form className="auth-form" onSubmit={handleSubmit}>
                    <h2>Create your account</h2>
                    <p className="auth-subtitle">Join LOKA and discover something great.</p>
                    <label htmlFor="customer-name">Full name</label>
                    <input id="customer-name" name="fullName" type="text" placeholder="Enter your full name" autoComplete="name" required minLength={2} />
                    <label htmlFor="customer-phone">Phone number (optional)</label>
                    <input id="customer-phone" name="phone" type="tel" placeholder="Enter your phone number" autoComplete="tel" />
                    <label htmlFor="customer-email">Email address</label>
                    <input id="customer-email" name="email" type="email" placeholder="Enter your email" autoComplete="email" required />
                    <label htmlFor="customer-password">Password</label>
                    <input id="customer-password" name="password" type="password" placeholder="Create a password (at least 8 characters)" autoComplete="new-password" required minLength={8} />
                    <label htmlFor="customer-confirm-password">Confirm password</label>
                    <input id="customer-confirm-password" name="confirmPassword" type="password" placeholder="Confirm your password" autoComplete="new-password" required minLength={8} />
                    {error && <p className="auth-feedback auth-feedback-error" role="alert">{error}</p>}
                    {success && <p className="auth-feedback auth-feedback-success" role="status">{success}</p>}
                    <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
                    <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
                    <p className="auth-terms">By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
                </form>
            </section>
        </div>
    );
};

export default CustomerSignup;
