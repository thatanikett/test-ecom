import { useState, useEffect } from "react";
import "./index.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

function App() {
  const [products, setProducts] = useState([]);
  const [deployInfo, setDeployInfo] = useState(null);
  const [lastRequestInfo, setLastRequestInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = () => {
    setLoading(true);
    fetch(`${BACKEND_URL}/products`)
      .then((res) => {
        if (!res.ok) throw new Error("Backend not available");
        return res.json();
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setLoading(false);
      });
  };

  const getDeploymentInfo = () => {
    setLoading(true);
    fetch(`${BACKEND_URL}/info`)
      .then((res) => res.json())
      .then((data) => {
        setDeployInfo(data);
        setLastRequestInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching info:", err);
        setLoading(false);
      });
  };

  return (
    <div className="layout">
      {/* Modern High-Efficiency Header */}
      <header>
        <a href="/" className="brand">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="32" height="32" rx="8" fill="#4f46e5" />
            <path
              d="M10 10L22 22M22 10L10 22"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          ClusterStore
        </a>

        <div className="search-bar">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search infrastructure, books, and nodes..."
          />
        </div>

        <nav className="nav-links">
          <span className="nav-link">Orders</span>
          <span className="nav-link">Account</span>
          <div
            className="nav-link"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            onClick={getDeploymentInfo}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Status
          </div>
        </nav>
      </header>

      {/* Categories Bar */}
      <div className="categories">
        <span className="category-item">All Depts</span>
        <span className="category-item">Hardware</span>
        <span className="category-item">Books</span>
        <span className="category-item">Net Tools</span>
        <span className="category-item">Observability</span>
        <span className="category-item">Bundles</span>
        <span className="category-item" style={{ color: "#4f46e5" }}>
          Black Friday Deals
        </span>
      </div>

      <main className="container">
        {/* Dynamic Hero Banner */}
        <div className="hero">
          <h1>
            Modern Stack. <br /> Scaled Daily.
          </h1>
          <p>
            The ultimate destination for platform engineers and homelab
            enthusiasts.
          </p>
        </div>

        {/* Product Grid */}
        <div className="product-grid">
          {products.map((product) => (
            <div key={product.id || product.sku} className="product-card">
              <div className="image-wrapper">
                <img src={product.image} alt={product.name} />
              </div>
              <span className="product-tag">{product.category}</span>
              <h3 className="product-name">{product.name}</h3>
              <p className="product-desc">{product.description}</p>
              <div className="price-row">
                <span className="price">${product.price}</span>
                <button className="add-btn">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 && !loading && (
            <div
              style={{
                textAlign: "center",
                gridColumn: "1 / -1",
                padding: "4rem",
              }}
            >
              <h2 style={{ color: "#64748b" }}>Postgres not connected.</h2>
              <p style={{ color: "#94a3b8" }}>
                Start the database to view the catalog.
              </p>
              <button
                className="add-btn"
                onClick={fetchProducts}
                style={{
                  width: "auto",
                  padding: "0 2rem",
                  margin: "2rem auto",
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Real-time Cluster Monitor Sticker */}
      {lastRequestInfo && (
        <div className="monitor-sticker">
          <div className="monitor-header">
            <div className="node-chip">CLUSTER MONITOR</div>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 10px #10b981",
              }}
            ></div>
          </div>
          <div className="status-row">
            <span className="status-label">Environment:</span>
            <span className="status-value">K3s Production</span>
          </div>
          <div className="status-row">
            <span className="status-label">Active Node:</span>
            <span className="status-value">{lastRequestInfo.nodeName}</span>
          </div>
          <div className="status-row">
            <span className="status-label">Active Pod:</span>
            <span className="status-value" style={{ fontSize: "0.7rem" }}>
              {lastRequestInfo.podName}
            </span>
          </div>
          <div className="status-row">
            <span className="status-label">Pod IP:</span>
            <span className="status-value">{lastRequestInfo.podIp}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
