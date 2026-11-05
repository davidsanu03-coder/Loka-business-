
import './sellerDashboard.css';
import SellerSidebar from './SellerSidebar';
import SellerTopbar from './SellerTopbar';
import SellerDashboardWelcome from './SellerDashboardWelcome';
import SellerStatCard from './SellerStatCard';

function SellerDashboard() {
    const stats = [
        {
            title: 'Total Products',
            value: '24',
            description: 'Products listed',
            icon: '▦',
        },
        {
            title: 'Active Orders',
            value: '8',
            description: 'Orders to manage',
            icon: '□',
        },
        {
            title: 'Commissions',
            value: '₦18,500',
            description: 'Demo commission total',
            icon: '₦',
        },
        {
            title: 'Store Performance',
            value: '76%',
            description: 'Demo performance indicator',
            icon: '↗',
        },
    ];

    return (
        <div className="seller-dashboard">
            <SellerSidebar />

            <main className="seller-dashboard-main">
                <SellerTopbar />

                <div className="seller-dashboard-content">
                    <SellerDashboardWelcome />

                    <section className="seller-dashboard-stats">
                        {stats.map((stat) => (
                            <SellerStatCard
                                key={stat.title}
                                title={stat.title}
                                value={stat.value}
                                description={stat.description}
                                icon={stat.icon}
                            />
                        ))}
                    </section>

                    <section className="seller-dashboard-section">
                        <div className="seller-section-heading">
                            <div>
                                <h2>Get started with your store</h2>
                                <p>
                                    Manage your products, inventory and orders
                                    from one place.
                                </p>
                            </div>
                        </div>

                        <div className="seller-quick-actions">
                            <div className="seller-action-card">
                                <span className="seller-action-icon">▦</span>
                                <h3>Manage products</h3>
                                <p>
                                    Add products and keep your listings up to date.
                                </p>
                                <a href="/seller/products">View products</a>
                            </div>

                            <div className="seller-action-card">
                                <span className="seller-action-icon">□</span>
                                <h3>Manage orders</h3>
                                <p>
                                    Review customer orders and update their status.
                                </p>
                                <a href="/seller/orders">View orders</a>
                            </div>

                            <div className="seller-action-card">
                                <span className="seller-action-icon">◇</span>
                                <h3>Store profile</h3>
                                <p>
                                    Keep your seller and store information updated.
                                </p>
                                <a href="/seller/profile">Manage store</a>
                            </div>
                        </div>
                    </section>

                    <p className="seller-demo-notice">
                        Preview mode: figures and performance indicators are sample
                        data until the seller dashboard is connected to the LOKA API.
                    </p>
                </div>
            </main>
        </div>
    );
}

export default SellerDashboard;