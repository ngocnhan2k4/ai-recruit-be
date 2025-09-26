FROM oven/bun:latest

WORKDIR /app

COPY package*.json bun.lock* ./

RUN bun install

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "bun push && bun run build && bun start:prod"]