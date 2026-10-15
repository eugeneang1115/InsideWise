# Builds the API server and the web app into one image. The server serves the web app.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci
COPY . .
RUN npm run build -w server && npm run build -w web && npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8787 WEB_DIST=/app/web/dist
WORKDIR /app
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/server/package.json server/
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/migrations server/migrations
COPY --from=build /app/server/seed server/seed
COPY --from=build /app/web/dist web/dist
USER node
EXPOSE 8787
CMD ["node", "server/dist/index.js"]
