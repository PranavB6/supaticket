# ---------- Build stage ----------
# Compile TypeScript with dev dependencies
FROM node:22-slim AS build

WORKDIR /app

# Install dependencies (cached unless package.json changes)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build


# ---------- Runtime stage ----------
# Lightweight production image
FROM node:22-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN useradd -m nodeuser

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled app
COPY --from=build /app/dist ./dist

# Drop privileges
RUN chown -R nodeuser:nodeuser /app
USER nodeuser

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/server.js"]
