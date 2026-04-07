# Instructions to Run Ecom Microservices

## 1. Local Development with Docker Compose

1. From the `test-ecom` folder, build and start all services via Docker Compose:

   ```bash
   docker compose up --build
   ```

2. Once all containers are running:
   - Frontend is available at http://localhost:8080
   - Backend API is available at http://localhost:5000
   - PostgreSQL runs on port 5432

## 2. Pushing to Docker Hub

1. Login to Docker Hub:

   ```bash
   docker login
   ```

2. Build and push the frontend image:

   ```bash
   docker build -t YOUR_DOCKERHUB_USERNAME/test-ecom-frontend:latest ./frontend
   docker push YOUR_DOCKERHUB_USERNAME/test-ecom-frontend:latest
   ```

3. Build and push the backend image:

   ```bash
   docker build -t YOUR_DOCKERHUB_USERNAME/test-ecom-backend:latest ./backend
   docker push YOUR_DOCKERHUB_USERNAME/test-ecom-backend:latest
   ```

4. Build and push the database image:

   ```bash
   docker build -t YOUR_DOCKERHUB_USERNAME/test-ecom-postgres:latest ./db
   docker push YOUR_DOCKERHUB_USERNAME/test-ecom-postgres:latest
   ```

_(Note: Replace `YOUR_DOCKERHUB_USERNAME` in the k8s yaml files with your actual username)_

## 3. Kubernetes (k3s) Deployment

### Prerequisites:

Make sure your nodes in Proxmox are labeled correctly as per your requirements:

```bash
kubectl label nodes <your-node-1-name> proxmox=node1
kubectl label nodes <your-node-2-name> proxmox=node2
kubectl label nodes <your-node-3-name> proxmox=node3
```

### Deploying the Application:

Deploy each service located in the `k8s` directory:

1. Deploy the database:

   ```bash
   kubectl apply -f k8s/postgres.yaml
   ```

2. Deploy the backend:

   Wait a few seconds for PostgreSQL to initialize, then:

   ```bash
   kubectl apply -f k8s/backend.yaml
   ```

3. Deploy the frontend:

   ```bash
   kubectl apply -f k8s/frontend.yaml
   ```

### Check your deployment:

```bash
kubectl get pods,svc,deployments -o wide
```

Since the `frontend` service is of type `LoadBalancer` (which k3s handles using its internal load balancer `klipper-lb` or `Traefik`), you can access your user interface using the External-IP given to the `frontend` service on port 80.

To see the load balancer IP:

```bash
kubectl get svc frontend
```

Now, load your frontend. If you have multiple backend replicas up, hitting "Get Info" repeatedly will demonstrate responses hitting different Pods/IPs.

## 4. Architecture Notes

- The backend image contains the Node.js API only.
- The database image contains PostgreSQL plus the schema and demo seed data in `db/init.sql`.
- Runtime database files live on a Docker volume locally and a PersistentVolumeClaim in k3s.
