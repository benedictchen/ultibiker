# UltiBiker Deployment & Infrastructure Guide
**Version:** 1.1.0  
**Last Updated:** August 29, 2025  
**Status:** Active

---

## 🚀 Executive Summary

UltiBiker employs cloud-native deployment architecture with multi-region availability, auto-scaling capabilities, and infrastructure-as-code principles. Our deployment strategy prioritizes high availability, security, and cost optimization while supporting both development and production workloads.

### Infrastructure Pillars
- **🌐 Multi-Cloud**: AWS primary, Azure disaster recovery
- **🚀 Containerized**: Docker + Kubernetes orchestration
- **📊 Observable**: Comprehensive monitoring and alerting
- **🔄 Automated**: GitOps deployment pipelines
- **⚡ Scalable**: Auto-scaling based on demand
- **🛡️ Secure**: Network isolation and encryption

---

## 🏗️ Infrastructure Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     🌐 ULTIBIKER CLOUD ARCHITECTURE                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🌍 GLOBAL LOAD BALANCER (CloudFlare)                              │
│  ┌─────────────────────────────────────────────────────────────────┤
│  │ • DDoS Protection        • SSL Termination                     │
│  │ • Geographic Routing     • Rate Limiting                       │
│  │ • CDN Edge Caching      • WAF Protection                       │
│  └─────────────────────────────────────────────────────────────────┤
│                            ▼                                       │
│  🏢 MULTI-REGION DEPLOYMENT                                        │
│  ┌─────────────────┬─────────────────┬─────────────────────────────┤
│  │ 🇺🇸 US-EAST-1   │ 🇪🇺 EU-WEST-1  │ 🇦🇺 AP-SOUTHEAST-2         │
│  │ (Primary)       │ (Secondary)     │ (Asia Pacific)             │
│  │                 │                 │                            │
│  │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────────────┐ │
│  │ │🚀 K8s Cluster│ │ │🚀 K8s Cluster│ │ │🚀 K8s Cluster (Planned)│ │
│  │ │ • 6 Nodes    │ │ │ • 4 Nodes    │ │ │ • 4 Nodes              │ │
│  │ │ • 3 AZs      │ │ │ • 3 AZs      │ │ │ • 2 AZs                │ │
│  │ └─────────────┘ │ └─────────────┘ │ └─────────────────────────┘ │
│  │                 │                 │                            │
│  │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────────────┐ │
│  │ │💾 PostgreSQL │ │ │💾 PostgreSQL │ │ │💾 PostgreSQL (Replica) │ │
│  │ │ Multi-AZ RDS │ │ │ Multi-AZ RDS │ │ │ Read Replica           │ │
│  │ └─────────────┘ │ └─────────────┘ │ └─────────────────────────┘ │
│  │                 │                 │                            │
│  │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────────────┐ │
│  │ │📊 InfluxDB   │ │ │📊 InfluxDB   │ │ │📊 InfluxDB (Read-Only) │ │
│  │ │ Enterprise   │ │ │ Enterprise   │ │ │ Analytics Only         │ │
│  │ └─────────────┘ │ └─────────────┘ │ └─────────────────────────┘ │
│  └─────────────────┴─────────────────┴─────────────────────────────┤
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Kubernetes Cluster Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ⚓ KUBERNETES CLUSTER LAYOUT                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🎛️ CONTROL PLANE (Managed EKS)                                     │
│  ┌─────────────────────────────────────────────────────────────────┤
│  │ • API Server       • etcd Storage      • Controller Manager     │
│  │ • Scheduler        • Cloud Controller • Add-on Manager          │
│  └─────────────────────────────────────────────────────────────────┤
│                            ▼                                       │
│  👷 WORKER NODES                                                    │
│  ┌─────────────────┬─────────────────┬─────────────────────────────┤
│  │ 🏢 SYSTEM POOL  │ 🚀 APP POOL     │ 📊 ANALYTICS POOL           │
│  │ (c5.large)      │ (c5.xlarge)     │ (m5.2xlarge)               │
│  │ 2-4 nodes       │ 3-10 nodes      │ 2-6 nodes                  │
│  │                 │                 │                            │
│  │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────────────┐ │
│  │ │🎛️ Ingress    │ │ │🌐 API Server │ │ │📈 InfluxDB             │ │
│  │ │📊 Monitoring │ │ │⚡ WebSocket  │ │ │🔍 Analytics Engine      │ │
│  │ │🔒 Vault      │ │ │🏪 Marketplace│ │ │🧠 ML Pipeline          │ │
│  │ │📋 Operators  │ │ │🛡️ Auth Service│ │ │📊 Data Processing      │ │
│  │ └─────────────┘ │ └─────────────┘ │ └─────────────────────────┘ │
│  └─────────────────┴─────────────────┴─────────────────────────────┤
│                                                                     │
│  🔧 NODE CONFIGURATION                                              │
│  ┌─────────────────────────────────────────────────────────────────┤
│  │ • Container Runtime: containerd                                 │
│  │ • CNI Plugin: AWS VPC CNI                                       │
│  │ • CSI Driver: EBS CSI + EFS CSI                                 │
│  │ • Auto Scaling: Cluster Autoscaler + KEDA                       │
│  │ • Service Mesh: Istio (Production)                              │
│  └─────────────────────────────────────────────────────────────────┤
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🐳 Container Strategy

### Docker Configuration

```dockerfile
# Multi-stage build for UltiBiker API
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY src ./src
COPY tsconfig.json ./
RUN npm run build

# Production image
FROM node:20-alpine AS production

# Security: Run as non-root user
RUN addgroup -g 1001 -S ultibiker && \
    adduser -S ultibiker -u 1001

# Install security updates
RUN apk --no-cache add dumb-init && \
    apk --no-cache upgrade

WORKDIR /app

# Copy built application
COPY --from=builder --chown=ultibiker:ultibiker /app/dist ./dist
COPY --from=builder --chown=ultibiker:ultibiker /app/node_modules ./node_modules

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

USER ultibiker

EXPOSE 3000

# Use dumb-init to properly handle signals
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### Container Security Configuration

```yaml
# Security Context for Kubernetes Pods
apiVersion: v1
kind: SecurityContext
spec:
  # Run as non-root user
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  
  # Prevent privilege escalation
  allowPrivilegeEscalation: false
  
  # Drop all capabilities
  capabilities:
    drop: ["ALL"]
    add: ["NET_BIND_SERVICE"]  # Only for port 80/443
  
  # Read-only root filesystem
  readOnlyRootFilesystem: true
  
  # SELinux/AppArmor profile
  seccompProfile:
    type: RuntimeDefault
  
  # Resource limits
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"
```

---

## ☸️ Kubernetes Deployment

### Application Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ultibiker-api
  namespace: ultibiker
  labels:
    app: ultibiker-api
    version: v1.1.0
    component: backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: ultibiker-api
  template:
    metadata:
      labels:
        app: ultibiker-api
        version: v1.1.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: ultibiker-api
      automountServiceAccountToken: false
      
      # Pod Security Context
      securityContext:
        fsGroup: 1001
      
      # Init containers for database migrations
      initContainers:
      - name: migrate
        image: ultibiker/api:v1.1.0
        command: ["npm", "run", "db:migrate"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
      
      containers:
      - name: api
        image: ultibiker/api:v1.1.0
        ports:
        - containerPort: 3000
          protocol: TCP
        
        # Environment Configuration
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        
        # Health checks
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        
        # Resource management
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
            ephemeral-storage: "1Gi"
          limits:
            memory: "512Mi"
            cpu: "500m"
            ephemeral-storage: "2Gi"
        
        # Security context
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          runAsGroup: 1001
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
          readOnlyRootFilesystem: true
        
        # Volume mounts for writable directories
        volumeMounts:
        - name: tmp-volume
          mountPath: /tmp
        - name: cache-volume
          mountPath: /app/.cache
      
      # Volumes
      volumes:
      - name: tmp-volume
        emptyDir: {}
      - name: cache-volume
        emptyDir: {}
      
      # Pod disruption budget
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values: ["ultibiker-api"]
              topologyKey: kubernetes.io/hostname
```

### Service and Ingress Configuration

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: ultibiker-api
  namespace: ultibiker
  labels:
    app: ultibiker-api
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: ultibiker-api

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ultibiker-api
  namespace: ultibiker
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "30"
spec:
  tls:
  - hosts:
    - api.ultibiker.com
    secretName: ultibiker-api-tls
  rules:
  - host: api.ultibiker.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ultibiker-api
            port:
              number: 80
```

---

## 🗄️ Database Deployment

### PostgreSQL Configuration (RDS)

```yaml
# Terraform configuration for RDS PostgreSQL
resource "aws_db_instance" "ultibiker_primary" {
  identifier = "ultibiker-prod-primary"
  
  # Engine configuration
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  
  # Storage configuration
  allocated_storage     = 500
  max_allocated_storage = 2000
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id          = aws_kms_key.database.arn
  
  # Database configuration
  db_name  = "ultibiker"
  username = "ultibiker"
  password = random_password.db_password.result
  
  # Network configuration
  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.database.name
  publicly_accessible    = false
  
  # High availability
  multi_az               = true
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  # Performance insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  # Security
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "ultibiker-prod-final-snapshot"
  
  # Connection pooling via RDS Proxy
  depends_on = [aws_db_proxy.ultibiker_proxy]
  
  tags = {
    Name = "UltiBiker Production Database"
    Environment = "production"
    Backup = "required"
  }
}

# Read replica for analytics workloads
resource "aws_db_instance" "ultibiker_replica" {
  identifier = "ultibiker-prod-replica"
  
  # Replica configuration
  replicate_source_db = aws_db_instance.ultibiker_primary.id
  instance_class     = "db.r6g.large"
  
  # Different AZ for availability
  availability_zone = data.aws_availability_zones.available.names[1]
  
  # Performance optimized for read workloads
  allocated_storage = 500
  storage_type     = "gp3"
  
  tags = {
    Name = "UltiBiker Analytics Replica"
    Environment = "production" 
    Purpose = "analytics"
  }
}
```

### InfluxDB Time-Series Database

```yaml
# InfluxDB deployment on Kubernetes
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: influxdb
  namespace: ultibiker
spec:
  serviceName: influxdb
  replicas: 3
  selector:
    matchLabels:
      app: influxdb
  template:
    metadata:
      labels:
        app: influxdb
    spec:
      containers:
      - name: influxdb
        image: influxdb:2.7
        ports:
        - containerPort: 8086
        env:
        - name: DOCKER_INFLUXDB_INIT_MODE
          value: "setup"
        - name: DOCKER_INFLUXDB_INIT_USERNAME
          value: "admin"
        - name: DOCKER_INFLUXDB_INIT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: influxdb-credentials
              key: password
        - name: DOCKER_INFLUXDB_INIT_ORG
          value: "ultibiker"
        - name: DOCKER_INFLUXDB_INIT_BUCKET
          value: "sensor-data"
        
        volumeMounts:
        - name: influxdb-storage
          mountPath: /var/lib/influxdb2
        
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1"
  
  volumeClaimTemplates:
  - metadata:
      name: influxdb-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3-retain
      resources:
        requests:
          storage: 100Gi
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: ultibiker_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run type-check
    
    - name: Run tests
      run: npm run test:ci
      env:
        DATABASE_URL: postgresql://postgres:test@localhost:5432/ultibiker_test
        REDIS_URL: redis://localhost:6379
    
    - name: Run E2E tests
      run: npm run test:e2e
      env:
        CI: true
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
    
    - name: Run Semgrep security analysis
      uses: returntocorp/semgrep-action@v1
      with:
        publishToken: ${{ secrets.SEMGREP_APP_TOKEN }}

  build:
    needs: [test, security]
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.image.outputs.image }}
      digest: ${{ steps.build.outputs.digest }}
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
    
    - name: Build and push Docker image
      id: build
      uses: docker/build-push-action@v5
      with:
        context: .
        platforms: linux/amd64,linux/arm64
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        
        # Security: Build attestations
        provenance: true
        sbom: true
    
    - name: Generate image reference
      id: image
      run: echo "image=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.meta.outputs.version }}" >> $GITHUB_OUTPUT

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
        aws-region: us-east-1
    
    - name: Update kubeconfig
      run: aws eks update-kubeconfig --name ultibiker-staging-cluster
    
    - name: Deploy to staging
      run: |
        kubectl set image deployment/ultibiker-api \
          api=${{ needs.build.outputs.image }} \
          --namespace=ultibiker-staging
        
        kubectl rollout status deployment/ultibiker-api \
          --namespace=ultibiker-staging \
          --timeout=300s
    
    - name: Run smoke tests
      run: |
        kubectl run smoke-test \
          --image=${{ needs.build.outputs.image }} \
          --restart=Never \
          --command -- npm run test:smoke \
          --namespace=ultibiker-staging
        
        kubectl wait --for=condition=complete job/smoke-test --timeout=120s
        kubectl logs job/smoke-test

  deploy-production:
    needs: [build, deploy-staging]
    runs-on: ubuntu-latest
    environment: production
    if: startsWith(github.ref, 'refs/tags/v')
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: ${{ secrets.AWS_ROLE_ARN_PROD }}
        aws-region: us-east-1
    
    - name: Update kubeconfig
      run: aws eks update-kubeconfig --name ultibiker-prod-cluster
    
    - name: Deploy to production
      run: |
        # Blue-green deployment strategy
        kubectl patch deployment ultibiker-api \
          --patch '{"spec":{"template":{"spec":{"containers":[{"name":"api","image":"'${{ needs.build.outputs.image }}'"}]}}}}' \
          --namespace=ultibiker
        
        kubectl rollout status deployment/ultibiker-api \
          --namespace=ultibiker \
          --timeout=600s
    
    - name: Verify deployment
      run: |
        # Health check
        kubectl run health-check \
          --image=curlimages/curl \
          --restart=Never \
          --command -- curl -f http://ultibiker-api/health \
          --namespace=ultibiker
        
        kubectl wait --for=condition=complete job/health-check --timeout=60s
```

### GitOps with ArgoCD

```yaml
# argocd/application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ultibiker-production
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: ultibiker
  
  source:
    repoURL: https://github.com/ultibiker/infrastructure
    targetRevision: HEAD
    path: k8s/production
    
    # Helm configuration
    helm:
      values: |
        image:
          tag: v1.1.0
        
        replicas: 3
        
        resources:
          requests:
            memory: 256Mi
            cpu: 100m
          limits:
            memory: 512Mi
            cpu: 500m
        
        ingress:
          enabled: true
          hostname: api.ultibiker.com
          tls: true
        
        database:
          host: ultibiker-prod-primary.cluster-abc123.us-east-1.rds.amazonaws.com
          port: 5432
  
  destination:
    server: https://kubernetes.default.svc
    namespace: ultibiker
  
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - PruneLast=true
    
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  
  # Health checks
  ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
    - /spec/replicas
```

---

## 📊 Monitoring & Observability

### Prometheus Configuration

```yaml
# prometheus/scrape-configs.yaml
scrape_configs:
- job_name: 'ultibiker-api'
  kubernetes_sd_configs:
  - role: pod
    namespaces:
      names: ['ultibiker']
  
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
    action: replace
    target_label: __metrics_path__
    regex: (.+)
  - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
    action: replace
    regex: ([^:]+)(?::\d+)?;(\d+)
    replacement: $1:$2
    target_label: __address__
  
  metric_relabel_configs:
  - source_labels: [__name__]
    regex: 'go_.*|process_.*|nodejs_.*'
    action: drop

- job_name: 'postgresql'
  static_configs:
  - targets: ['postgres-exporter:9187']
  
- job_name: 'influxdb'
  static_configs:
  - targets: ['influxdb:8086']
  metrics_path: /metrics
```

### Grafana Dashboards

```json
{
  "dashboard": {
    "title": "UltiBiker Production Overview",
    "tags": ["ultibiker", "production"],
    "timezone": "UTC",
    "panels": [
      {
        "title": "API Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{job=\"ultibiker-api\"}[5m])) by (method, status)",
            "legendFormat": "{{method}} {{status}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec",
            "min": 0
          }
        ]
      },
      {
        "title": "Response Time Percentiles",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{job=\"ultibiker-api\"}[5m]))",
            "legendFormat": "50th percentile"
          },
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"ultibiker-api\"}[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Active WebSocket Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "websocket_connections_active{job=\"ultibiker-api\"}"
          }
        ]
      },
      {
        "title": "Database Connection Pool",
        "type": "graph",
        "targets": [
          {
            "expr": "database_connections_active{job=\"ultibiker-api\"}",
            "legendFormat": "Active"
          },
          {
            "expr": "database_connections_idle{job=\"ultibiker-api\"}",
            "legendFormat": "Idle"
          }
        ]
      }
    ]
  }
}
```

### Alert Rules

```yaml
# prometheus/alert-rules.yaml
groups:
- name: ultibiker.production
  rules:
  - alert: HighErrorRate
    expr: |
      (
        sum(rate(http_requests_total{job="ultibiker-api",status=~"5.."}[5m])) /
        sum(rate(http_requests_total{job="ultibiker-api"}[5m]))
      ) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes"
  
  - alert: HighResponseTime
    expr: |
      histogram_quantile(0.95, 
        sum(rate(http_request_duration_seconds_bucket{job="ultibiker-api"}[5m])) by (le)
      ) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }}s"
  
  - alert: DatabaseConnectionPoolExhausted
    expr: database_connections_active{job="ultibiker-api"} / database_connections_max > 0.9
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool nearly exhausted"
      description: "Connection pool usage is {{ $value | humanizePercentage }}"
  
  - alert: InfluxDBWriteErrors
    expr: increase(influxdb_write_errors_total[5m]) > 10
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "InfluxDB write errors detected"
      description: "{{ $value }} write errors in the last 5 minutes"
  
  - alert: PodCrashLooping
    expr: |
      rate(kube_pod_container_status_restarts_total{namespace="ultibiker"}[15m]) * 60 * 15 > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Pod is crash looping"
      description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} is crash looping"
```

---

## 🔧 Infrastructure as Code

### Terraform Configuration

```hcl
# terraform/main.tf
terraform {
  required_version = ">= 1.5"
  
  backend "s3" {
    bucket         = "ultibiker-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "ultibiker-prod-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = data.aws_availability_zones.available.names
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = false
  enable_dns_hostnames = true
  enable_dns_support = true
  
  # VPC Flow Logs for security monitoring
  enable_flow_log = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role = true
  
  tags = {
    Environment = "production"
    Project = "ultibiker"
  }
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  
  cluster_name    = "ultibiker-prod"
  cluster_version = "1.28"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  # Cluster endpoint configuration
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = true
  cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"]  # Restrict in production
  
  # Cluster encryption
  cluster_encryption_config = [
    {
      provider_key_arn = aws_kms_key.eks.arn
      resources        = ["secrets"]
    }
  ]
  
  # Node groups
  eks_managed_node_groups = {
    system = {
      name = "system-nodes"
      
      instance_types = ["c5.large"]
      min_size      = 2
      max_size      = 4
      desired_size  = 2
      
      # Taints for system workloads
      taints = [
        {
          key    = "CriticalAddonsOnly"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]
    }
    
    application = {
      name = "app-nodes"
      
      instance_types = ["c5.xlarge", "c5.2xlarge"]
      min_size      = 3
      max_size      = 20
      desired_size  = 3
      
      # Capacity type for cost optimization
      capacity_type = "SPOT"
      
      # Instance refresh
      update_config = {
        max_unavailable_percentage = 25
      }
    }
    
    analytics = {
      name = "analytics-nodes"
      
      instance_types = ["m5.2xlarge", "r5.xlarge"]
      min_size      = 2
      max_size      = 10
      desired_size  = 2
      
      # Taints for analytics workloads
      taints = [
        {
          key    = "workload"
          value  = "analytics"
          effect = "NO_SCHEDULE"
        }
      ]
    }
  }
  
  tags = {
    Environment = "production"
    Project = "ultibiker"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "primary" {
  identifier = "ultibiker-prod-primary"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  
  allocated_storage     = 500
  max_allocated_storage = 2000
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id          = aws_kms_key.database.arn
  
  db_name  = "ultibiker"
  username = "ultibiker"
  password = random_password.db_password.result
  
  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.database.name
  publicly_accessible    = false
  
  multi_az               = true
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "ultibiker-prod-final-snapshot"
  
  tags = {
    Name = "UltiBiker Production Database"
    Environment = "production"
    Backup = "required"
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "redis" {
  name       = "ultibiker-redis-subnet-group"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_elasticache_replication_group" "redis" {
  description       = "Redis cluster for UltiBiker"
  replication_group_id = "ultibiker-prod-redis"
  
  node_type         = "cache.r7g.large"
  port              = 6379
  parameter_group_name = "default.redis7"
  
  num_cache_clusters = 3
  
  subnet_group_name = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_password.result
  
  # Automatic failover
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  # Backup configuration
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
  
  tags = {
    Name = "UltiBiker Production Redis"
    Environment = "production"
  }
}
```

### Helm Chart Values

```yaml
# helm/ultibiker/values.yaml
global:
  imageRegistry: ghcr.io
  imageTag: "v1.1.0"
  storageClass: gp3
  
api:
  image:
    repository: ultibiker/api
    pullPolicy: IfNotPresent
  
  replicaCount: 3
  
  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 512Mi
      cpu: 500m
  
  # Auto scaling
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80
  
  # Service configuration
  service:
    type: ClusterIP
    port: 80
    targetPort: 3000
  
  # Health checks
  livenessProbe:
    httpGet:
      path: /health
      port: 3000
    initialDelaySeconds: 30
    periodSeconds: 10
  
  readinessProbe:
    httpGet:
      path: /health/ready
      port: 3000
    initialDelaySeconds: 10
    periodSeconds: 5

websocket:
  image:
    repository: ultibiker/websocket
  
  replicaCount: 2
  
  # Session affinity for WebSocket connections
  service:
    type: ClusterIP
    sessionAffinity: ClientIP
  
  resources:
    requests:
      memory: 128Mi
      cpu: 50m
    limits:
      memory: 256Mi
      cpu: 200m

ingress:
  enabled: true
  className: nginx
  
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "1000"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  
  hosts:
  - host: api.ultibiker.com
    paths:
    - path: /
      pathType: Prefix
      service: api
  - host: ws.ultibiker.com
    paths:
    - path: /socket.io
      pathType: Prefix
      service: websocket
  
  tls:
  - secretName: ultibiker-api-tls
    hosts:
    - api.ultibiker.com
    - ws.ultibiker.com

# External dependencies
postgresql:
  enabled: false  # Using RDS
  
redis:
  enabled: false  # Using ElastiCache

influxdb2:
  enabled: true
  
  persistence:
    enabled: true
    storageClass: gp3-retain
    size: 100Gi
  
  resources:
    requests:
      memory: 1Gi
      cpu: 500m
    limits:
      memory: 2Gi
      cpu: 1
  
  config:
    http-bind-address: ":8086"
    reporting-disabled: false
    
  # High availability setup
  replicaCount: 3
  
  # Security
  adminUser:
    organization: "ultibiker"
    bucket: "sensor-data"
    user: "admin"
    existingSecret: influxdb-credentials
```

---

## 🌍 Multi-Region Deployment

### Region Configuration

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🌍 GLOBAL DEPLOYMENT STRATEGY                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🇺🇸 US-EAST-1 (Primary)          │  🇪🇺 EU-WEST-1 (Secondary)      │
│  ┌─────────────────────────────────┬─────────────────────────────────┤
│  │ • Full application stack       │ • Full application stack       │
│  │ • Master database (RDS)        │ • Read replica (RDS)           │
│  │ • InfluxDB cluster             │ • InfluxDB replica             │
│  │ • Redis cluster                │ • Redis cluster               │
│  │ • User traffic: Americas       │ • User traffic: Europe         │
│  │ • Backup: EU-WEST-1            │ • Backup: US-EAST-1            │
│  └─────────────────────────────────┴─────────────────────────────────┤
│                                                                     │
│  🔄 REPLICATION STRATEGY                                            │
│  ┌─────────────────────────────────────────────────────────────────┤
│  │ 📊 Database: Async replication with < 1 second lag              │
│  │ 🏪 Object Storage: Cross-region replication                     │
│  │ 🔄 Application State: Redis cross-region sync                   │
│  │ 📈 Time Series: InfluxDB enterprise replication                 │
│  └─────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🚨 FAILOVER PROCESS                                                │
│  ┌─────────────────────────────────────────────────────────────────┤
│  │ 1. Health check failure detected (< 30 seconds)                │
│  │ 2. Route53 health check triggers failover (< 60 seconds)       │
│  │ 3. Traffic redirected to secondary region                      │
│  │ 4. Database promoted from replica to master                    │
│  │ 5. Application state synchronized                               │
│  │ 6. Total RTO: < 5 minutes, RPO: < 1 minute                     │
│  └─────────────────────────────────────────────────────────────────┤
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### DNS and Traffic Routing

```yaml
# Route53 configuration for global load balancing
resource "aws_route53_zone" "ultibiker" {
  name = "ultibiker.com"
  
  tags = {
    Environment = "production"
  }
}

# Primary region health check
resource "aws_route53_health_check" "primary" {
  fqdn                            = "api.ultibiker.com"
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/health"
  failure_threshold               = "3"
  request_interval                = "30"
  cloudwatch_alarm_region         = "us-east-1"
  cloudwatch_alarm_name           = "ultibiker-api-health"
  insufficient_data_health_status = "Failure"
  
  tags = {
    Name = "UltiBiker Primary Health Check"
  }
}

# Primary endpoint (US-EAST-1)
resource "aws_route53_record" "api_primary" {
  zone_id = aws_route53_zone.ultibiker.zone_id
  name    = "api"
  type    = "A"
  
  set_identifier = "primary"
  
  # Weighted routing with health check
  weighted_routing_policy {
    weight = 100
  }
  
  health_check_id = aws_route53_health_check.primary.id
  
  alias {
    name                   = data.aws_lb.primary.dns_name
    zone_id               = data.aws_lb.primary.zone_id
    evaluate_target_health = true
  }
}

# Failover endpoint (EU-WEST-1)
resource "aws_route53_record" "api_secondary" {
  zone_id = aws_route53_zone.ultibiker.zone_id
  name    = "api"
  type    = "A"
  
  set_identifier = "secondary"
  
  # Failover routing
  failover_routing_policy {
    type = "SECONDARY"
  }
  
  alias {
    name                   = data.aws_lb.secondary.dns_name
    zone_id               = data.aws_lb.secondary.zone_id
    evaluate_target_health = true
  }
}

# Geolocation routing for WebSocket connections
resource "aws_route53_record" "ws_us" {
  zone_id = aws_route53_zone.ultibiker.zone_id
  name    = "ws"
  type    = "A"
  
  set_identifier = "us-region"
  
  geolocation_routing_policy {
    continent = "NA"  # North America
  }
  
  alias {
    name    = data.aws_lb.primary.dns_name
    zone_id = data.aws_lb.primary.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "ws_eu" {
  zone_id = aws_route53_zone.ultibiker.zone_id
  name    = "ws"
  type    = "A"
  
  set_identifier = "eu-region"
  
  geolocation_routing_policy {
    continent = "EU"  # Europe
  }
  
  alias {
    name    = data.aws_lb.secondary.dns_name
    zone_id = data.aws_lb.secondary.zone_id
    evaluate_target_health = true
  }
}
```

---

## 🔧 Operations Runbooks

### Common Operations Tasks

```bash
#!/bin/bash
# ops/scripts/common-operations.sh

# Database backup
backup_database() {
  echo "🗄️ Creating database backup..."
  
  # Create RDS snapshot
  aws rds create-db-snapshot \
    --db-instance-identifier ultibiker-prod-primary \
    --db-snapshot-identifier "manual-backup-$(date +%Y%m%d-%H%M%S)"
  
  # Export specific database
  kubectl exec -n ultibiker deployment/postgres-client -- \
    pg_dump "$DATABASE_URL" | gzip > "backup-$(date +%Y%m%d).sql.gz"
  
  # Upload to S3
  aws s3 cp "backup-$(date +%Y%m%d).sql.gz" \
    s3://ultibiker-backups/database/
}

# Scale application
scale_application() {
  local replicas=${1:-3}
  echo "📈 Scaling application to $replicas replicas..."
  
  kubectl scale deployment ultibiker-api \
    --replicas="$replicas" \
    --namespace=ultibiker
  
  kubectl rollout status deployment/ultibiker-api \
    --namespace=ultibiker \
    --timeout=300s
}

# Database maintenance
database_maintenance() {
  echo "🔧 Running database maintenance..."
  
  # Update statistics
  kubectl exec -n ultibiker deployment/postgres-client -- \
    psql "$DATABASE_URL" -c "ANALYZE;"
  
  # Vacuum tables
  kubectl exec -n ultibiker deployment/postgres-client -- \
    psql "$DATABASE_URL" -c "VACUUM VERBOSE;"
  
  # Check index usage
  kubectl exec -n ultibiker deployment/postgres-client -- \
    psql "$DATABASE_URL" -f /scripts/check-indexes.sql
}

# Clear cache
clear_cache() {
  echo "🗑️ Clearing application cache..."
  
  # Clear Redis cache
  kubectl exec -n ultibiker deployment/redis-client -- \
    redis-cli -h redis-cluster FLUSHDB
  
  # Restart application to clear in-memory cache
  kubectl rollout restart deployment/ultibiker-api \
    --namespace=ultibiker
}

# Check system health
health_check() {
  echo "🏥 Running system health check..."
  
  # API health
  curl -f https://api.ultibiker.com/health || echo "❌ API unhealthy"
  
  # Database health
  kubectl exec -n ultibiker deployment/postgres-client -- \
    pg_isready -h "$DB_HOST" -p "$DB_PORT" || echo "❌ Database unhealthy"
  
  # Redis health
  kubectl exec -n ultibiker deployment/redis-client -- \
    redis-cli -h redis-cluster ping || echo "❌ Redis unhealthy"
  
  # Kubernetes health
  kubectl get nodes --no-headers | while read node status; do
    if [[ "$status" != "Ready" ]]; then
      echo "❌ Node $node not ready"
    fi
  done
}

# Performance optimization
optimize_performance() {
  echo "⚡ Running performance optimizations..."
  
  # Analyze slow queries
  kubectl exec -n ultibiker deployment/postgres-client -- \
    psql "$DATABASE_URL" -c "
      SELECT query, calls, total_time, mean_time
      FROM pg_stat_statements
      WHERE mean_time > 100
      ORDER BY mean_time DESC
      LIMIT 10;"
  
  # Check connection pool usage
  kubectl exec -n ultibiker deployment/ultibiker-api -- \
    curl -s http://localhost:3000/metrics | grep pool_
  
  # Monitor memory usage
  kubectl top pods -n ultibiker --sort-by=memory
}
```

### Emergency Response Procedures

```markdown
# 🚨 Emergency Response Procedures

## Incident Response Checklist

### 1. Service Outage
- [ ] Check AWS Service Health Dashboard
- [ ] Verify DNS resolution: `nslookup api.ultibiker.com`
- [ ] Check load balancer health: `kubectl get ingress -n ultibiker`
- [ ] Review recent deployments: `kubectl rollout history deployment/ultibiker-api -n ultibiker`
- [ ] Scale up if needed: `kubectl scale deployment ultibiker-api --replicas=6 -n ultibiker`
- [ ] Activate incident management: Page SRE team

### 2. Database Performance Issues
- [ ] Check connection pool: `kubectl logs -f deployment/ultibiker-api -n ultibiker | grep "pool"`
- [ ] Monitor slow queries: Run `analyze_slow_queries.sql`
- [ ] Check disk space: AWS RDS Console → Storage
- [ ] Consider read replica promotion if master is struggling
- [ ] Scale database instance if needed

### 3. High Memory Usage
- [ ] Identify memory-consuming pods: `kubectl top pods -n ultibiker --sort-by=memory`
- [ ] Check for memory leaks: Review application logs
- [ ] Restart high-memory pods: `kubectl delete pod <pod-name> -n ultibiker`
- [ ] Scale horizontally: `kubectl scale deployment ultibiker-api --replicas=8 -n ultibiker`
- [ ] Investigate root cause: Profile application memory usage

### 4. Security Incident
- [ ] Isolate affected systems: Update security groups
- [ ] Preserve evidence: Create EBS snapshots
- [ ] Rotate credentials: Update secrets in Kubernetes
- [ ] Check audit logs: Review CloudTrail and application logs
- [ ] Notify security team: Follow security incident procedure
- [ ] Update WAF rules if needed

### 5. Data Corruption
- [ ] Stop writes to prevent further corruption
- [ ] Identify scope: Check data integrity
- [ ] Restore from backup: Use latest clean backup
- [ ] Validate restoration: Run data integrity checks
- [ ] Resume operations: Gradually restore traffic
- [ ] Post-incident review: Analyze root cause
```

---

## 💰 Cost Optimization

### Resource Cost Analysis

```
┌─────────────────────────────────────────────────────────────────────┐
│                     💰 MONTHLY COST BREAKDOWN                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ☸️ COMPUTE (EKS + EC2)                           $2,847/month      │
│  ┌─────────────────────────────────────────────────────────────────┤
│  │ • EKS Control Plane (2 regions): $144                          │
│  │ • Worker Nodes (c5.xlarge × 6): $1,260                         │
│  │ • Analytics Nodes (m5.2xlarge × 4): $1,152                     │
│  │ • System Nodes (c5.large × 4): $291                            │
│  └─────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🗄️ DATABASE (RDS + ElastiCache)                  $1,523/month      │
│  ┌─────────────────────────────────────────────────────────────────┤
│  │ • PostgreSQL (db.r6g.xlarge): $876                             │
│  │ • Read Replicas (×2): $438                                      │
│  │ • ElastiCache Redis (cache.r7g.large × 3): $209                │
│  └─────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📊 STORAGE & NETWORKING                          $456/month       │
│  ┌─────────────────────────────────────────────────────────────────┤
│  │ • EBS Storage (2TB): $200                                       │
│  │ • S3 Storage (500GB): $12                                       │
│  │ • Data Transfer: $189                                           │
│  │ • Load Balancers: $55                                           │
│  └─────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🛡️ SECURITY & MONITORING                        $234/month       │
│  ┌─────────────────────────────────────────────────────────────────┤
│  │ • AWS Config + CloudTrail: $89                                  │
│  │ • VPC Flow Logs: $34                                            │
│  │ • CloudWatch + X-Ray: $67                                       │
│  │ • AWS WAF: $44                                                  │
│  └─────────────────────────────────────────────────────────────────┤
│                                                                     │
│  💳 TOTAL MONTHLY COST: $5,060                                     │
│  📊 Cost per User (10K users): $0.51                               │
│  📈 YoY Growth Budget: 35% increase expected                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Cost Optimization Strategies

```yaml
# Spot instances for non-critical workloads
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: spot-provisioner
  namespace: karpenter
spec:
  # Use spot instances for cost savings
  requirements:
    - key: "karpenter.sh/capacity-type"
      operator: In
      values: ["spot"]
    - key: "node.kubernetes.io/instance-type"
      operator: In
      values: ["c5.large", "c5.xlarge", "m5.large", "m5.xlarge"]
  
  # Taints for spot instances
  taints:
    - key: spot-instance
      value: "true"
      effect: NoSchedule
  
  # Limits
  limits:
    resources:
      cpu: 1000
      memory: 2000Gi
  
  # Consolidation for cost efficiency
  consolidation:
    enabled: true
  
  # Node termination handling
  ttlSecondsAfterEmpty: 30
```

### Reserved Instance Strategy

```hcl
# terraform/reserved-instances.tf
resource "aws_ec2_capacity_reservation" "database" {
  instance_type     = "db.r6g.xlarge"
  instance_platform = "Linux/UNIX"
  availability_zone = "us-east-1a"
  instance_count    = 2
  
  # 1-year term, all upfront for maximum savings
  end_date_type = "limited"
  end_date      = "2026-08-29T23:59:59.000Z"
  
  tags = {
    Name = "UltiBiker Database Reserved Capacity"
    CostCenter = "infrastructure"
  }
}

# Savings Plan for compute
resource "aws_savingsplans_plan" "compute" {
  savings_plan_type = "Compute"
  term             = "1"
  payment_option   = "All Upfront"
  commitment       = "1500"  # $1500/month commitment
  
  tags = {
    Environment = "production"
    Project = "ultibiker"
  }
}
```

---

## 📋 Compliance & Auditing

### Compliance Monitoring

```yaml
# AWS Config Rules for compliance
AWSConfigRules:
  - RuleName: "encrypted-volumes"
    Source:
      Owner: "AWS"
      SourceIdentifier: "ENCRYPTED_VOLUMES"
    Description: "Ensure all EBS volumes are encrypted"
    
  - RuleName: "rds-encrypted"
    Source:
      Owner: "AWS" 
      SourceIdentifier: "RDS_STORAGE_ENCRYPTED"
    Description: "Ensure RDS instances are encrypted"
    
  - RuleName: "s3-bucket-public-access-prohibited"
    Source:
      Owner: "AWS"
      SourceIdentifier: "S3_BUCKET_PUBLIC_ACCESS_PROHIBITED"
    Description: "Ensure S3 buckets don't allow public access"
    
  - RuleName: "root-access-key-check"
    Source:
      Owner: "AWS"
      SourceIdentifier: "ROOT_ACCESS_KEY_CHECK" 
    Description: "Ensure root account doesn't have access keys"
```

### Audit Trail Configuration

```json
{
  "CloudTrail": {
    "TrailName": "ultibiker-audit-trail",
    "S3BucketName": "ultibiker-audit-logs",
    "IncludeGlobalServiceEvents": true,
    "IsMultiRegionTrail": true,
    "EnableLogFileValidation": true,
    "KMSKeyId": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
    "EventSelectors": [
      {
        "ReadWriteType": "All",
        "IncludeManagementEvents": true,
        "DataResources": [
          {
            "Type": "AWS::S3::Object",
            "Values": ["arn:aws:s3:::ultibiker-data/*"]
          },
          {
            "Type": "AWS::Lambda::Function",
            "Values": ["*"]
          }
        ]
      }
    ],
    "InsightSelectors": [
      {
        "InsightType": "ApiCallRateInsight"
      }
    ]
  }
}
```

---

## 🔮 Future Roadmap

### 2025-2026 Infrastructure Evolution

| **Quarter** | **Initiative** | **Technology** | **Impact** |
|-------------|----------------|----------------|------------|
| **Q4 2025** | 🌏 Asia Pacific Region | AWS AP-SOUTHEAST-2 | Global latency reduction |
| **Q1 2026** | 🤖 ML/AI Pipeline | SageMaker + Kubeflow | Advanced analytics |
| **Q2 2026** | 📱 Edge Computing | AWS Wavelength | Real-time processing |
| **Q3 2026** | 🔋 Green Computing | Graviton3 processors | 60% energy reduction |
| **Q4 2026** | 🌐 Multi-Cloud | Azure integration | Vendor resilience |
| **Q1 2027** | 🚀 Serverless Migration | Lambda + Fargate | Cost optimization |

---

**📋 Document Control**
- **Classification**: Internal Use
- **Owner**: Infrastructure Team
- **Review Cycle**: Quarterly
- **Next Review**: November 2025
- **Distribution**: SRE Team, DevOps Engineers, Security Team

---

*This document contains infrastructure specifications and deployment procedures. Handle with appropriate security measures.*