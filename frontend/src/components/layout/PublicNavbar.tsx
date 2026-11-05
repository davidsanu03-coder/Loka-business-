import { Link, NavLink } from "react-router-dom";
import ThemeToggle from "../../theme/ThemeToggle";
import "./publicNavbar.css";

const PublicNavbar = () => {
    return (
        <header className="public-navbar">
            <div className="public-navbar-inner">
                <Link to="/" className="public-navbar-logo">
                    LOKA
                </Link>

                <nav className="public-navbar-links" aria-label="Main navigation">
                    <NavLink to="/" end>
                        Home
                    </NavLink>

                    <NavLink to="/products">
                        Products
                    </NavLink>

                    <NavLink to="/signup/seller">
                        Sell on LOKA
                    </NavLink>

                    <NavLink to="/community">
                        Community
                    </NavLink>
                </nav>

                <div className="public-navbar-actions">
                    <div className="public-navbar-theme">
                        <ThemeToggle />
                    </div>

                    <Link to="/login" className="public-navbar-login">
                        Log in
                    </Link>

                    <Link
                        to="/signup/customer"
                        className="public-navbar-register"
                    >
                        Register
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default PublicNavbar;