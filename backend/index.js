const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://ecom_user:ecom_pass@localhost:5432/ecom";

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function ensureConnection(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      console.log("Postgres connected");
      return;
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }

      console.log(
        `Postgres not ready yet (attempt ${attempt}/${retries}). Retrying in ${delayMs}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

app.get("/products", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, sku, name, price, category, image, description
       FROM products
       ORDER BY category ASC, name ASC`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/info", (req, res) => {
  res.json({
    podName: process.env.POD_NAME || "local-pod",
    nodeName: process.env.NODE_NAME || "local-vm",
    podIp: process.env.POD_IP || "127.0.0.1",
    hostname: require("os").hostname() || "localhost",
  });
});

async function start() {
  try {
    await ensureConnection();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Postgres startup error:", err);
    process.exit(1);
  }
}

start();
