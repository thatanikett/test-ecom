CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  image TEXT NOT NULL,
  description TEXT NOT NULL
);

INSERT INTO products (sku, name, category, price, image, description)
VALUES
  (
    'K8S-OPS-001',
    'Kubernetes Operations Playbook',
    'Books',
    39.99,
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    'A practical guide to running production workloads across k3s, Kubernetes, and Proxmox-based clusters.'
  ),
  (
    'LAB-HW-002',
    'Homelab Mini Server',
    'Hardware',
    649.00,
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80',
    'Low-noise mini server tuned for container workloads, local CI, and lightweight virtualization.'
  ),
  (
    'NET-SEC-003',
    'Zero Trust Gateway',
    'Networking',
    129.00,
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=900&q=80',
    'Secure edge gateway for private service exposure, lab segmentation, and internal API access control.'
  ),
  (
    'OBS-MON-004',
    'Cluster Monitoring Kit',
    'Observability',
    89.50,
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80',
    'Starter bundle for logs, metrics, and uptime tracking across your frontend, backend, and database services.'
  ),
  (
    'DEV-AI-005',
    'Platform Engineer Starter Pack',
    'Bundles',
    59.00,
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
    'A curated set of deployment templates, environment examples, and workflow docs for shipping faster.'
  ),
  (
    'DB-BKP-006',
    'Postgres Backup Vault',
    'Data',
    24.99,
    'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=900&q=80',
    'Automated backup storage with restore-ready snapshots for your local development and demo databases.'
  )
ON CONFLICT (sku) DO NOTHING;
