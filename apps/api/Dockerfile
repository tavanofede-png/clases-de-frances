FROM node:20-alpine AS base
WORKDIR /app

# Install deps
COPY package.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN npm install --workspace=apps/api --workspace=packages/db --workspace=packages/shared

# Copy source
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/

# Generate Prisma client
RUN cd packages/db && npx prisma generate

# Build shared + api
RUN cd packages/shared && npx tsc || true
RUN cd apps/api && npx tsc || true

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
