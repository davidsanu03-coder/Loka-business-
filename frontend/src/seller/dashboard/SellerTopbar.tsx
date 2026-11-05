
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import ThemeToggle from '../../theme/ThemeToggle';

function SellerTopbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();

    const toggleSidebar = () => {
        const nextState = !menuOpen;

        setMenuOpen(nextState);
        document.body.classList.toggle('seller-sidebar-open', nextState);
    };

    const pageTitles: Record<string, string> = {
        '/dashboard/seller': 'Seller Overview',
        '/seller/products': 'My Products',
        '/seller/inventory': 'Inventory',
        '/seller/orders': 'Orders',
        '/seller/commissions': 'Commissions & Earnings',
        '/seller/analytics': 'Analytics',
        '/seller/profile': 'Store Profile',
    };

    return (
        <header className="seller-topbar">
            <div className="seller-topbar-heading">
                <button
                    type="button"
                    className="seller-menu-toggle"
                    aria-label={menuOpen ? 'Close sidebar' : 'Open sidebar'}
                    aria-expanded={menuOpen}
                    onClick={toggleSidebar}
                >
                    {menuOpen ? '✕' : '☰'}
                </button>

                <div>
                    <h1>{pageTitles[location.pathname] ?? 'Seller Dashboard'}</h1>
                    <p>Manage your store and grow your business.</p>
                </div>
            </div>

            <div className="seller-topbar-actions">
                <ThemeToggle />

                <div className="seller-avatar" aria-label="Seller account">
                    SE
                </div>
            </div>
        </header>
    );
}

export default SellerTopbar;