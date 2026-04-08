# Test Ecom Microservices

This repository contains a small e-commerce application split into 3 services:

- `frontend`: React app served by Nginx
- `backend`: Node.js + Express API
- `postgres`: PostgreSQL database seeded from `db/init.sql`

The project can run in 2 modes:

- Local development with Docker Compose
- Cluster deployment on k3s

## Architecture

### Services

- Frontend serves the UI on port `80` inside the container
- Backend serves the API on port `5000`
- Postgres serves the database on port `5432`

### Request Flow

In local Docker Compose:

1. Browser opens the frontend on `http://localhost:8080`
2. Frontend sends API calls to `/api`
3. Nginx inside the frontend container proxies `/api` to `backend:5000`
4. Backend reads/writes data in Postgres at `postgres:5432`

In k3s:

1. User reaches the `frontend` Service
2. Frontend container proxies `/api` to the Kubernetes Service named `backend`
3. Backend connects to the headless Service named `postgres`

## Repository Structure

- `frontend/`: React + Vite app and Nginx config
- `backend/`: Express API
- `db/`: Postgres Docker image and seed SQL
- `k8s/`: Kubernetes manifests

## Prerequisites

### Local

- Docker installed
- Docker Compose available as either `docker compose` or `docker-compose`

### Cluster

- A working k3s cluster
- `kubectl` configured to talk to that cluster
- Nodes labeled with the values expected by the manifests
- Access to Docker Hub to pull the pushed images

## Assumed k3s / Proxmox Layout

This repo assumes you already have a k3s cluster running on infrastructure created with Proxmox.

From your current setup description, the high-level understanding is:

- There are 3 systems / nodes
- Each system has 2 VMs
- Pods run inside the k3s cluster on those VMs

This README does not try to recreate the full Proxmox or k3s installation from scratch. It only explains how to deploy this application into an already working cluster.

The Kubernetes manifests in this repo use these node labels:

- `proxmox=node1` for `frontend`
- `proxmox=node2` for `backend`
- `proxmox=node3` for `postgres`

That means your k3s nodes must be labeled to match those selectors. Note that the deployments and statefulset no longer hard pin to those selectors; instead they rely on anti-affinity rules to spread pods while keeping the labels for operational visibility.

## 1. Run Locally with Docker Compose

### Important Note About Local PostgreSQL

If your host machine already has PostgreSQL running on port `5432`, this project publishes the Compose database on host port `5433` instead.

Current mapping:

- Host: `5433`
- Container: `5432`

This does not affect internal container communication. The backend still connects to `postgres:5432`.

### Start the Stack

From the repo root:

```bash
docker compose up --build
```

If your machine uses the older command:

```bash
docker-compose up --build
```

### Services After Startup

- Frontend: `http://localhost:8080`
- Backend products API: `http://localhost:5000/products`
- Backend info API: `http://localhost:5000/info`
- PostgreSQL from host: `localhost:5433`

### Expected First Startup Behavior

On the first run:

- Postgres initializes the database
- `db/init.sql` creates the `products` table
- Seed data is inserted automatically
- Backend may retry for a few seconds until Postgres becomes ready

### Stop the Stack

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

## 2. Build and Push Images to Docker Hub

Log in first:

```bash
docker login
```

Build and push all 3 images:

```bash
docker build -t thatanikett/test-ecom-frontend:latest ./frontend
docker push thatanikett/test-ecom-frontend:latest

docker build -t thatanikett/test-ecom-backend:latest ./backend
docker push thatanikett/test-ecom-backend:latest

docker build -t thatanikett/test-ecom-postgres:latest ./db
docker push thatanikett/test-ecom-postgres:latest
```

## 3. Prepare the k3s Cluster

### Verify Nodes

Check the nodes visible to the cluster:

```bash
kubectl get nodes -o wide
```

### Apply Required Labels

The manifests require these labels:

```bash
kubectl label nodes <node-name-for-frontend> proxmox=node1
kubectl label nodes <node-name-for-backend> proxmox=node2
kubectl label nodes <node-name-for-postgres> proxmox=node3
```

If a label already exists and you need to overwrite it:

```bash
kubectl label nodes <node-name> proxmox=node1 --overwrite
```

Use the same pattern for `node2` and `node3`.

### Why Labels Matter

The manifests annotate pods with these labels so it is easy to see where each service landed in monitoring output, though the deployments themselves no longer pin to a specific label. Anti-affinity encourages scheduler spreading, and as long as the nodes have the labels, the pods will drift across different VMs rather than stacking up on a single host.

## 4. Deploy to k3s

Apply the manifests in this order:

```bash
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

### Anti-affinity and replica behavior

- Frontend and backend now run 3 replicas and declare hostname-based pod anti-affinity (`preferredDuringSchedulingIgnoredDuringExecution`) so Kubernetes spreads them across different VMs when capacity exists.
- There is no `nodeSelector` anymore, so the scheduler can reschedule pods anywhere; the proxmox labels help you trace where they run but are not required for scheduling.

### Why This Order

- Postgres must exist before backend can connect
- Backend should be ready before frontend traffic reaches it

## 5. Verify the Deployment

### Check Pods, Services, and Workloads

```bash
kubectl get pods -o wide
kubectl get svc -o wide
kubectl get deployments
kubectl get statefulsets
```

### What You Should Expect

- 1 Postgres Pod
- 3 Backend Pods
- 3 Frontend Pods

### Inspect Detailed Status

```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

For backend logs:

```bash
kubectl logs deploy/backend
```

For frontend logs:

```bash
kubectl logs deploy/frontend
```

For Postgres logs:

```bash
kubectl logs statefulset/postgres
```

## 6. Access the Application in k3s

The frontend Service is of type `LoadBalancer`.

If your k3s installation does not expose external IPs automatically, install MetalLB (layer 2 mode) or another load-balancer so the `frontend` service can receive an IP.

Check it with:

```bash
kubectl get svc frontend
```

Look for the external IP and open:

```text
http://<EXTERNAL-IP>
```

If your environment does not provide an external IP immediately, you can still test using port-forward:

```bash
kubectl port-forward svc/frontend 8080:80
```

Then open:

```text
http://localhost:8080
```

## 7. Useful Test URLs

Local backend:

- `http://localhost:5000/products`
- `http://localhost:5000/info`

If port-forwarding backend in k3s:

```bash
kubectl port-forward svc/backend 5000:5000
```

Then test:

- `http://localhost:5000/products`
- `http://localhost:5000/info`

## 8. What the `/info` Endpoint Shows

The backend exposes `/info` to help verify where traffic is landing.

It includes values such as:

- deployment name
- namespace
- service name
- pod name
- node name
- pod IP
- hostname
- request metadata

This is useful when:

- you have multiple backend replicas
- you want to confirm traffic is hitting different Pods
- you want to verify node placement in k3s

## 9. Current Kubernetes Placement

Based on the manifests in this repo:

- [frontend.yaml](/home/aniket/Desktop/k8s-dev-group/test-ecom/k8s/frontend.yaml) deploys 3 frontend replicas with hostname-level pod anti-affinity so Kubernetes spreads them across VMs rather than stacking on a single host.
- [backend.yaml](/home/aniket/Desktop/k8s-dev-group/test-ecom/k8s/backend.yaml) deploys 3 backend replicas with the same anti-affinity guidance.
- [postgres.yaml](/home/aniket/Desktop/k8s-dev-group/test-ecom/k8s/postgres.yaml) still runs a single-stateful Postgres pod, but the node selector has been removed so k3s can reschedule it on any available node during maintenance.

## 10. Troubleshooting

### Backend Cannot Reach Postgres in Compose

If backend fails during startup:

```text
getaddrinfo ENOTFOUND postgres
```

Run a clean recreate:

```bash
docker compose down -v --remove-orphans
docker compose up --build
```

### Port `5432` Already in Use

If Compose fails with:

```text
failed to bind host port 0.0.0.0:5432
```

It means your machine already has PostgreSQL running locally. This repo already uses `5433:5432` in Compose to avoid that conflict.

### Pods Stuck in `Pending`

Most likely causes:

- missing `proxmox=node1/node2/node3` labels
- insufficient cluster resources
- storage provisioning issue for the Postgres PVC

Check:

```bash
kubectl get nodes --show-labels
kubectl describe pod <pod-name>
kubectl get pvc
```

### Frontend Loads but API Fails

Check backend Pods and Service:

```bash
kubectl get pods -l app=backend -o wide
kubectl get svc backend
kubectl logs deploy/backend
```

## 11. Notes

- Database seed data is stored in `db/init.sql`
- Postgres data persists locally in a Docker volume
- Postgres data persists in k3s through a PersistentVolumeClaim
- Frontend proxies API traffic through Nginx using `/api`

## 12. High Availability Considerations

- **Database:** The current setup runs a single Postgres instance. For higher availability you will need a replicated Postgres solution (Patroni, PgBouncer with replica, etc.) plus storage that survives node failover so the database can fail over transparently.
- **Frontend/backend replicas:** Anti-affinity plus 3 replicas each keeps the application online even if a VM or node is drained; Kubernetes will reschedule any pod evicted from a host automatically across the remaining nodes.
- **Load balancer:** Make sure your k3s deployment offers a load balancer (MetalLB is the lightweight choice for bare-metal) so the frontend service gains an external IP rather than depending on a single VM’s networking stack.
