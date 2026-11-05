// import "./Topbar.css";
// import ThemeToggle from "../../theme/ThemeToggle";

// interface TopbarProps {
//   onMenuClick: () => void;
//   isSidebarOpen: boolean;
// }

// const Topbar = ({ onMenuClick, isSidebarOpen }: TopbarProps) => {
//   return (
//     <header className="customer-topbar">
//       <button
//         type="button"
//         className="topbar-menu-button"
//         onClick={onMenuClick}
//         aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
//         aria-expanded={isSidebarOpen}
//         aria-controls="customer-sidebar"
//       >
//         <span></span>
//         <span></span>
//         <span></span>
//       </button>

//       <div className="topbar-brand">
//         LOKA
//       </div>

//       <div className="topbar-welcome">
//         <h2>Good morning</h2>
//         <p>Discover products, messages and orders</p>
//       </div>

//       <div className="topbar-actions">
//         <div className="topbar-theme-control">
//           <ThemeToggle />
//         </div>

//         <div
//           className="topbar-avatar"
//           title="Customer profile"
//           aria-label="Customer profile"
//         >
//           DA
//         </div>
//       </div>
//     </header>
//   );
// };

// export default Topbar;


import { useEffect, useState } from "react";
import "./Topbar.css";
import ThemeToggle from "../../theme/ThemeToggle";

interface TopbarProps {
    onMenuClick: () => void;
    isSidebarOpen: boolean;
}

const getGreeting = (): string => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
        return "Good morning";
    }

    if (hour >= 12 && hour < 17) {
        return "Good afternoon";
    }

    return "Good evening";
};

const Topbar = ({ onMenuClick, isSidebarOpen }: TopbarProps) => {
    const [greeting, setGreeting] = useState(getGreeting);

    useEffect(() => {
        const updateGreeting = () => {
            setGreeting(getGreeting());
        };

        updateGreeting();

        const intervalId = window.setInterval(updateGreeting, 60_000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    return (
        <header className="customer-topbar">
            <button
                type="button"
                className="topbar-menu-button"
                onClick={onMenuClick}
                aria-label={
                    isSidebarOpen
                        ? "Close navigation menu"
                        : "Open navigation menu"
                }
                aria-expanded={isSidebarOpen}
                aria-controls="customer-sidebar"
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            <div className="topbar-brand">
                LOKA
            </div>

            <div className="topbar-welcome">
                <h2>{greeting}</h2>
                <p>Discover products, messages and orders</p>
            </div>

            <div className="topbar-actions">
                <div className="topbar-theme-control">
                    <ThemeToggle />
                </div>

                <div
                    className="topbar-avatar"
                    title="Customer profile"
                    aria-label="Customer profile"
                >
                    DA
                </div>
            </div>
        </header>
    );
};

export default Topbar;