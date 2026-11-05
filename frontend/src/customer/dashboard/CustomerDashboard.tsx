import { useState } from "react";
import "./customerDashboard.css";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import DashboardWelcome from "./DashboardWelcome";
import StatCard from "./StatCard";

import RecentOrders from "./RecentOrders";
import RecentActivity from "./RecentActivity";
import RecommendedProducts from "./RecommendedProducts";

const CustomerDashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="customer-dashboard">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />

      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-label="Close navigation menu"
        />
      )}

      <main className="dashboard-main">
        <Topbar
          onMenuClick={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />

        <div className="dashboard-content">
          <DashboardWelcome />

          <div className="dashboard-stats">
            <StatCard
              title="Orders"
              value="3 active"
            />

            <StatCard
              title="Messages"
              value="5 unread"
            />

            <StatCard
              title="Saved"
              value="12 items"
            />

            <StatCard
              title="Wallet"
              value="₦42,500"
            />
          </div>
        </div>

        <div className="dashboard-sections">
          <RecentOrders />
          <RecentActivity />
          <RecommendedProducts />
      </div>
      </main>
    </div>
  );
};

export default CustomerDashboard;