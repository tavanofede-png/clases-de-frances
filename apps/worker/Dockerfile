FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN npm install --workspace=apps/worker --workspace=packages/db --workspace=packages/shared

COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/worker/ apps/worker/

RUN cd packages/db && npx prisma generate
RUN cd packages/shared && npx tsc || true
RUN cd apps/worker && npx tsc || true

CMD ["node", "apps/worker/dist/index.js"]
