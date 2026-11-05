import { useState } from "react";
import "./dashboardWelcome.css";

const DashboardWelcome = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!searchQuery.trim()) {
      return;
    }

    console.log("Searching for:", searchQuery.trim());
  };

  return (
    <section className="dashboard-welcome">
      <h1>Find products from independent sellers</h1>

      <p className="welcome-description">
        Search, compare and buy with confidence.
      </p>

      <form className="dashboard-search" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search products, services or sellers..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          aria-label="Search products, services or sellers"
        />

        <button type="submit">
          Search
        </button>
      </form>
    </section>
  );
};

export default DashboardWelcome;