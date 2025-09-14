## Prerequisites

- Installed Docker, Nodejs
### Step 1: Install Nest CLI vs Bun
```bash
npm install -g @nestjs/cli
nest --version # check CLI version

npm install -g bun
bun --version
```
### Step 2: Navigate into project directory
```bash
cd ai-recruit
```
### Step 3: Install dependencies:
```bash
bun install
```

### Step 4: Run Docker Compose
```bash
docker compose up -d
```

### Step 5: Run migrations
```bash
bun drizzle-kit push
```

### Step 6: Run the project
```bash
bun run start:dev
```