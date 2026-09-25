# ── AKUMA API — Render/any-Docker production image ───────
FROM node:20-slim

WORKDIR /app

# Install dependencies first so Docker caches this layer
# unless the lockfile changes. --omit=dev skips the heavy
# mongodb-memory-server devDependency entirely.
COPY package*.json ./
RUN npm ci --omit=dev

# App source
COPY . .

ENV NODE_ENV=production

# Render injects the real PORT at runtime; this is documentation only.
EXPOSE 8000

CMD ["npm", "start"]
