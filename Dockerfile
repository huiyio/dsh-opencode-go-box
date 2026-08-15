FROM node:22-alpine

LABEL org.opencontainers.image.title="OpenCode Go Balance"
LABEL org.opencontainers.image.description="Standalone OpenCode Go quota dashboard"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/huiyio/dsh-opencode-go-box"
LABEL org.opencontainers.image.documentation="https://github.com/huiyio/dsh-opencode-go-box/blob/main/README.md"

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/data

RUN mkdir -p /data && chown node:node /data

COPY --chown=node:node package.json server.js LICENSE NOTICE.md ./
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public

USER node

EXPOSE 3000

VOLUME ["/data"]

HEALTHCHECK CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:3000/healthz"]

CMD ["node", "server.js"]
