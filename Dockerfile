FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS api
WORKDIR /app
COPY --from=base /app /app
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "@bharatpayu/api"]

FROM node:22-alpine AS web
WORKDIR /app
COPY --from=base /app /app
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@bharatpayu/web"]
