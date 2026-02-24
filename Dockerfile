FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

# Install all dependencies
RUN npm install --production=false

# Copy all source files
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# Build the API
COPY tsconfig.base.json ./
RUN cd apps/api && npx tsc

# Expose port
EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

# Start the API
CMD ["node", "apps/api/dist/index.js"]
