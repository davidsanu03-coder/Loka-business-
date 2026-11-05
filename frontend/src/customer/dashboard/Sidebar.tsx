import { NavLink } from "react-router-dom";
import "./Sidebar.css";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const closeSidebar = () => {
    onClose();
  };

  return (
    <aside
      id="customer-sidebar"
      className={`customer-sidebar ${isOpen ? "is-open" : ""}`}
      aria-label="Customer navigation"
    >
      <div className="sidebar-mobile-header">
        <div className="sidebar-logo">LOKA</div>

        <button
          type="button"
          className="sidebar-close-button"
          onClick={closeSidebar}
          aria-label="Close navigation menu"
        >
          &times;
        </button>
      </div>

      <nav className="sidebar-navigation">
        <NavLink
          to="/dashboard/customer"
          end
          onClick={closeSidebar}
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          Overview
        </NavLink>

        <NavLink
          to="/customer/discover"
          onClick={closeSidebar}
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          Discover
        </NavLink>

        <NavLink
          to="/customer/messages"
          onClick={closeSidebar}
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          Messages
        </NavLink>

        <NavLink
          to="/customer/oders"
          onClick={closeSidebar}
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          Orders
        </NavLink>

        <NavLink
          to="/customer/cart"
          onClick={closeSidebar}
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          Cart
        </NavLink>
      </nav>

      <div className="sidebar-account">
        <p className="sidebar-section-title">ACCOUNT</p>

        <nav className="sidebar-navigation">
          <NavLink
            to="/customer/profile"
            onClick={closeSidebar}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            Profile
          </NavLink>

          <NavLink
            to="/customer/settings"
            onClick={closeSidebar}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            Settings
          </NavLink>

          <NavLink
            to="/customer/help"
            onClick={closeSidebar}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            Help
          </NavLink>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;