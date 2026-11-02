import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutAccount, type CurrentUserResponse } from '../lib/api';
import ThemeToggle from '../theme/ThemeToggle';
import './auth.css';

const AuthHome: React.FC = () => {
    const [current, setCurrent] = useState<CurrentUserResponse | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let active = true;
        getCurrentUser()
            .then((result) => { if (active) setCurrent(result); })
            .catch((err: unknown) => {
                if (active) {
                    setError(err instanceof Error ? err.message : 'Your session could not be verified.');
                    navigate('/login', { replace: true });
                }
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [navigate]);

    const handleLogout = async () => {
        await logoutAccount();
        navigate('/login', { replace: true });
    };

    if (loading) return <main className="auth-home"><p>Checking your LOKA session…</p></main>;
    if (error || !current) return null;

    return (
        <main className="auth-home">
            <div className="auth-home-top"><Link to="/" className="auth-logo">LOKA</Link><ThemeToggle /></div>
            <section className="auth-home-card">
                <h1>You're signed in.</h1>
                <p>Welcome{current.profile && typeof current.profile.full_name === 'string' ? `, ${current.profile.full_name}` : ''}.</p>
                <p className="auth-home-role">Account type: <strong>{current.user.role}</strong></p>
                <p>Your account is connected to the LOKA backend. Marketplace, seller workspace and company dashboard modules will appear here as their frontend integrations are completed.</p>
                <button className="auth-submit" onClick={handleLogout}>Log out</button>
            </section>
        </main>
    );
};

export default AuthHome;
