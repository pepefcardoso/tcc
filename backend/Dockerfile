# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Install production dependencies only
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Runtime image (smallest possible, non-root)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# The official node:alpine image ships a pre-created 'node' user (UID 1000)
USER node
WORKDIR /app

# Copy only what the running process needs
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

# Ensure the default upload temp dir exists and is writable by the non-root user
# (overridable at runtime via UPLOAD_TMP_DIR env var)
RUN mkdir -p /tmp/uploads

EXPOSE 3000

# Exec form: signals go directly to node, not a shell — required for graceful SIGTERM
CMD ["node", "src/server.js"]
