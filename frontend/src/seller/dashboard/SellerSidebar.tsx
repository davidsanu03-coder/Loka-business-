
import { NavLink } from 'react-router-dom';

function SellerSidebar() {
    const closeMobileSidebar = () => {
        document.body.classList.remove('seller-sidebar-open');
    };

    const navClass = ({ isActive }: { isActive: boolean }) =>
        `seller-nav-link${isActive ? ' active' : ''}`;

    return (
        <>
            <button
                className="seller-sidebar-backdrop"
                aria-label="Close navigation menu"
                onClick={closeMobileSidebar}
            />

            <aside className="seller-sidebar">
                <div className="seller-sidebar-brand">
                    <NavLink to="/dashboard/seller">LOKA</NavLink>
                    <span>SELLER</span>
                </div>

                <nav className="seller-sidebar-nav">
                    <NavLink
                        to="/dashboard/seller"
                        end
                        className={navClass}
                        onClick={closeMobileSidebar}
                    >
                        <span>⌂</span>
                        Overview
                    </NavLink>

                    <p className="seller-nav-label">MANAGE STORE</p>

                    <NavLink
                        to="/seller/products"
                        className={navClass}
                        onClick={closeMobileSidebar}
                    >
                        <span>▦</span>
                        My Products
                    </NavLink>

                    <NavLink
                        to="/seller/inventory"
                        className={navClass}
                        onClick={closeMobileSidebar}
                    >
                        <span>▤</span>
                        Inventory
                    </NavLink>

                    <NavLink
                        to="/seller/orders"
                        className={navClass}
                        onClick={closeMobileSidebar}
                    >
                        <span>□</span>
                        Orders
                    </NavLink>

                    <NavLink
                        to="/seller/commissions"
                        className={navClass}
                        onClick={closeMobileSidebar}
                    >
                        <span>₦</span>
                        Commissions & Earnings
                    </NavLink>

                    <NavLink
                        to="/seller/analytics"
                        className={navClass}
                        onClick={closeMobileSidebar}
                    >
                        <span>↗</span>
                        Analytics
                    </NavLink>

                    <p className="seller-nav-label">ACCOUNT</p>

                    <NavLink
                        to="/seller/profile"
                        className={navClass}
                        onClick={closeMobileSidebar}
                    >
                        <span>◎</span>
                        Store Profile
                    </NavLink>
                </nav>
            </aside>
        </>
    );
}

export default SellerSidebar;