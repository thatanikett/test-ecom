# Monitoring Stack Setup for the PVE/k3s Cluster

This document walks through deploying the Prometheus + Grafana stack in your existing k3s cluster (the same cluster that spans the three Proxmox hosts PVE1/PVE2/PVE3 with two VMs each). It also explains how to collect Proxmox metrics, build dashboards, and surface the visual data inside your frontend.

## 1. Assumptions

- k3s is already running across six VMs (vm2, vm3 on PVE1; vm4, vm5 on PVE2; vm5, vm6 on PVE3) and kubectl points at the cluster.
- You manage the Proxmox VE API credentials (username/password or API token) for the three hosts.
- The cluster already runs the ecommerce stack described in this repo.

## 2. Deploy Prometheus + Grafana

1. Add the Helm repo and update:

   ```bash
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm repo add grafana https://grafana.github.io/helm-charts
   helm repo update
   ```

2. Install the kube-prometheus-stack (Prometheus Operator + Grafana + ServiceMonitors):

   ```bash
   helm install monitoring prometheus-community/kube-prometheus-stack \
     --namespace monitoring --create-namespace \
     --set grafana.persistence.enabled=true \
     --set grafana.adminPassword=<your-secret> \
     --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
   ```

3. Wait for pods to become ready and port-forward Grafana (or use a LoadBalancer Service):

   ```bash
   kubectl get pods -n monitoring
   kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring
   ```

   Grafana is now at `http://localhost:3000` (user `admin`, password from the Helm values).

## 3. Install a Proxmox Exporter

1. Choose an exporter such as `prometheus-pve-exporter` (https://github.com/prometheus-pve-exporter/prometheus-pve-exporter).
2. Create a secret with your Proxmox credentials (repeat for each host if needed):

   ```bash
   kubectl create secret generic proxmox-credentials \
     --from-literal=username=root@pam \
     --from-literal=password=<PVE_PASSWORD> \
     -n monitoring
   ```

3. Deploy the exporter as a Deployment/Service that points at all three hosts (or side-run one per host). Example manifest snippet:

   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: proxmox-exporter
     namespace: monitoring
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: proxmox-exporter
     template:
       metadata:
         labels:
           app: proxmox-exporter
       spec:
         containers:
           - name: exporter
             image: prometheus-pve-exporter:latest
             args:
               - "--host=pve1.yourdomain.com"
               - "--host=pve2.yourdomain.com"
               - "--host=pve3.yourdomain.com"
             envFrom:
               - secretRef:
                   name: proxmox-credentials
   ---
   apiVersion: v1
   kind: Service
   metadata:
     name: proxmox-exporter
     namespace: monitoring
   spec:
     selector:
       app: proxmox-exporter
     ports:
       - port: 9130
         targetPort: 9130
   ```

4. Create a ServiceMonitor so Prometheus scrapes the exporter:

   ```yaml
   apiVersion: monitoring.coreos.com/v1
   kind: ServiceMonitor
   metadata:
     name: proxmox-exporter
     namespace: monitoring
     labels:
       release: monitoring
   spec:
     selector:
       matchLabels:
         app: proxmox-exporter
     endpoints:
       - port: 9130
         interval: 30s
   ```

5. Reload the exporter pods and confirm Prometheus picks up metrics (`kubectl get servicemonitors -n monitoring`).

## 4. Dashboards

1. Login to Grafana and add Prometheus (should already be set up by the chart).
2. Import community dashboards:
   - Kubernetes cluster monitoring (ID 6417 or similar)
   - Proxmox VE metrics (custom dashboard referencing `pve_memory`, `pve_cpu`, `pve_disk`)
3. Pin the important panels you want to embed later (latency heatmaps, node CPU, VM I/O).

## 5. Frontend Integration

You have two options:

- **Embed Grafana panels**: Use Grafana snapshots or signed URLs, then add `<iframe>` blocks inside your React UI. Secure them via Grafana user auth or reverse proxy ACLs.
- **Proxy Prometheus / custom endpoint**: Add a backend route (e.g., `/api/monitoring`) that forwards Prometheus queries (via `curl` or `node-fetch` inside the backend service) and returns JSON. Your React UI can poll that route and render charts using Chart.js/Recharts.

If you prefer the proxy, implement it like this:

1. Backend route example:

   ```js
   app.get("/api/monitoring", async (req, res) => {
     const promRes = await fetch("http://monitoring-prometheus.monitoring:9090/api/v1/query", {
       method: "POST",
       body: new URLSearchParams({ query: "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))" }),
       headers: { "Content-Type": "application/x-www-form-urlencoded" },
     });
     const data = await promRes.json();
     res.json(data);
   });
   ```

2. Frontend fetches `/api/monitoring`, extracts the value, and feeds it to your chart components.

## 6. Security and HA

- Protect Grafana with strong credentials and optionally restrict access through an Ingress with TLS.
- Rotate the Proxmox credentials regularly and store them in Kubernetes secrets.
- If Proxmox or k3s nodes fail, Grafana/Prometheus should continue to display the remaining metrics; make sure Grafana Persistence has sufficient storage in the Helm values.

