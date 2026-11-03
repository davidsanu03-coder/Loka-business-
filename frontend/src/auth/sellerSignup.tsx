import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './auth.css';
import ThemeToggle from '../theme/ThemeToggle';
import { registerAccount, savePendingSellerApplication, submitSellerApplication } from '../lib/api';

const SellerSignup: React.FC = () => {
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

        const application = {
            storeName: String(form.get('storeName') ?? '').trim(),
            description: String(form.get('description') ?? '').trim() || undefined
        };

        setLoading(true);
        try {
            const result = await registerAccount({
                fullName: String(form.get('fullName') ?? '').trim(),
                email: String(form.get('email') ?? '').trim(),
                phone: String(form.get('phone') ?? '').trim() || undefined,
                password
            });

            if (result.session?.access_token) {
                try {
                    await submitSellerApplication(application);
                    formElement.reset();
                    navigate('/app', { replace: true });
                    return;
                } catch (applicationError) {
                    savePendingSellerApplication(application);
                    setSuccess('Your account was created, but the seller application could not be submitted yet. Sign in later and we will retry it.');
                    setError(applicationError instanceof Error ? applicationError.message : 'Seller application submission failed.');
                }
            } else {
                savePendingSellerApplication(application);
                setSuccess('Your account was created. Confirm your email, then log in to submit your saved seller application.');
            }
            formElement.reset();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to create your seller account. Please try again.');
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
                    <p>Grow your business and reach more customers with LOKA.</p>
                </div>
            </section>
            <section className="auth-form-section">
                <div className="auth-theme-control"><ThemeToggle /></div>
                <form className="auth-form" onSubmit={handleSubmit}>
                    <h2>Become a seller</h2>
                    <p className="auth-subtitle">Create your account and apply to sell on LOKA.</p>
                    <label htmlFor="seller-name">Full name</label>
                    <input id="seller-name" name="fullName" type="text" placeholder="Enter your full name" autoComplete="name" required minLength={2} />
                    <label htmlFor="seller-phone">Phone number (optional)</label>
                    <input id="seller-phone" name="phone" type="tel" placeholder="Enter your phone number" autoComplete="tel" />
                    <label htmlFor="seller-store">Store name</label>
                    <input id="seller-store" name="storeName" type="text" placeholder="Enter your store name" required minLength={2} />
                    <label htmlFor="seller-description">About your store (optional)</label>
                    <textarea id="seller-description" name="description" placeholder="Tell customers and LOKA about your business" rows={3} />
                    <label htmlFor="seller-email">Email address</label>
                    <input id="seller-email" name="email" type="email" placeholder="Enter your email" autoComplete="email" required />
                    <label htmlFor="seller-password">Password</label>
                    <input id="seller-password" name="password" type="password" placeholder="Create a password (at least 8 characters)" autoComplete="new-password" required minLength={8} />
                    <label htmlFor="seller-confirm-password">Confirm password</label>
                    <input id="seller-confirm-password" name="confirmPassword" type="password" placeholder="Confirm your password" autoComplete="new-password" required minLength={8} />
                    {error && <p className="auth-feedback auth-feedback-error" role="alert">{error}</p>}
                    {success && <p className="auth-feedback auth-feedback-success" role="status">{success}</p>}
                    <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Submitting…' : 'Create seller account'}</button>
                    <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
                    <p className="auth-terms">By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
                </form>
            </section>
        </div>
    );
};

export default SellerSignup;
