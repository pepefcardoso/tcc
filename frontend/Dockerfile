# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build Vite SPA
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first to cache npm ci step
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# Build the SPA (output goes to /app/dist)
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Serve with nginx (smallest possible, non-root port 8080)
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Copy custom nginx configuration (server block)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 8080 (matches nginx.conf listen directive)
EXPOSE 8080

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
