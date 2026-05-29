# xiaozhi-mcphub: MCP tool bridge and console optimized for the Xiaozhi AI platform

[中文版](README.zh.md) | English

**xiaozhi-mcphub** is a second-stage development based on [MCPHub](https://github.com/samanhappy/mcphub). It enhances integration with the Xiaozhi AI platform and provides multi-endpoint management, automatic reconnection, vector-based smart routing, and OpenAPI-compatible access.

![Dashboard Preview](assets/dashboard.png)

## 🚀 Key Features

- **Enhanced Xiaozhi Integration**:
  - **Multi-endpoint management**: Bidirectional WebSocket connections with multiple Xiaozhi endpoints (enable/disable, edit, reconnect, status query).
  - **Smart reconnection**: Fast reconnect mode, exponential backoff, infinite retries with sleep window — all configurable via environment variables.
  - **Tool synchronization**: Xiaozhi endpoints are notified when server tools change to keep tool lists up-to-date.
  - **Grouping and smart routing**: Endpoints can bind to groups or use `$smart` intelligent routing.

- **MCP Management (inherited and enhanced)**:
  - Manage standard MCP servers (stdio / SSE / HTTP modes).
  - Enable/disable servers, tools, and prompts with descriptions and grouping.
  - Unified MCP entry, group entry, and server-specific endpoints.

- **Console & Authentication**:
  - Frontend console (React + Vite + Tailwind) to manage Servers, Groups, Users, Logs, Settings, Xiaozhi Endpoints, and Market.
  - JWT-based authentication with user context middleware and a built-in admin account.

- **OpenAPI & Direct Tool Access**:
  - Expose OpenAPI documentation and statistics endpoints.
  - Call specific server tools via OpenAPI-compatible endpoints.

## 🧩 Main Differences from Upstream

- New Xiaozhi endpoint multi-endpoint management and status (backward compatible, focusing on multi-endpoints).
- New per-endpoint reconnection strategies and global fast-reconnect switch.
- Enhanced `$smart` intelligent routing (optional) with automatic Xiaozhi linkage.
- Persistence uses local **JSON storage** by default, initializing sample servers and admin automatically.

## 🔧 Quick Start

### Method 1: Use DockerHub image (recommended)

```bash
# Pull the image
docker pull huangjunsen/xiaozhi-mcphub:latest

# Run
docker run -d \
  --name xiaozhi-mcphub \
  -p 3000:3000 \
  -e SMART_ROUTING_ENABLED="false" \
  -e JSON_DB_PATH="/app/data/db.json" \
  -v $(pwd)/data:/app/data \
  huangjunsen/xiaozhi-mcphub:latest

# Open the dashboard
# http://localhost:3000
```

Optional environment variables:

- `BASE_PATH`: Deploy under a sub-path (e.g., `/mcphub`).
- `JWT_SECRET`: JWT secret (recommended to set explicitly in production).
- `SMART_ROUTING_ENABLED`: Enable/disable smart routing (default "false").
- `OPENAI_API_KEY`, `OPENAI_API_BASE_URL`, `OPENAI_API_EMBEDDING_MODEL`: Required when enabling smart routing.

Default admin: `admin` / `admin123` (please change after first login).

### Method 2: Docker Compose one-click

This repository ships with `docker-compose.yml`. The app stores runtime data in JSON storage by default:

```bash
docker compose up -d

# View logs (optional)
docker compose logs -f mcphub
```

Key variables (edit in compose if needed):

- `JSON_DB_PATH`: JSON storage file path (default `data/db.json`).
- `SMART_ROUTING_ENABLED`: Enable/disable smart routing (default "false").
- Optional: `BASE_PATH`, `JWT_SECRET`, `OPENAI_API_KEY`, etc. (see above)

### Method 3: Local development

Requirements: Node.js 18+/20+ and pnpm. PostgreSQL is no longer required for local persistence.

```bash
git clone https://github.com/huangjunsen0406/xiaozhi-mcphub.git
cd xiaozhi-mcphub
pnpm install

# Optional: choose where JSON data is stored
export JSON_DB_PATH="./data/db.json"

# Start both backend (:3000) and frontend (Vite :5173)
pnpm dev
```

Access the frontend dev server at `http://localhost:5173` (the frontend proxies to backend `:3000`).

## 🗺️ Smart Routing (optional)

Set `SMART_ROUTING_ENABLED` to `true` and provide `OPENAI_API_KEY` to enable it. Tool embeddings are stored in the JSON data file and searched with in-process cosine similarity.

## 🖥️ Console Features (Frontend)

- Dashboard: Overview and status
- Servers: Server and tool management
- Groups: Grouping and assignment
- Users: User and permissions (admin)
- Logs: Real-time and historical logs
- Settings: System configuration (including smart routing)
- Xiaozhi Endpoints: Xiaozhi endpoint management
- Market: Search and install MCP servers from the community

## 📦 Defaults & Initialization

- Default admin: `admin` / `admin123`
- Default MCP servers: amap / playwright / fetch / slack (can be modified in the console and configured via ENV)

## 📄 License & Attribution (Apache License 2.0)

This project is a derivative work of [MCPHub](https://github.com/samanhappy/mcphub) and follows the **Apache License 2.0**:

- Keep upstream and project license and notice files, including `LICENSE` and `NOTICE`.
- If you modify and redistribute the source or binaries, indicate the changes.
- Include the license and disclaimer in redistribution; do not imply endorsement by original authors.

See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE) for details.

## 🤝 Contributing

Contributions are welcome! Please open issues/PRs for improvements.

## 🔗 Links

- Upstream project: <https://github.com/samanhappy/mcphub>
- Xiaozhi AI Platform: <https://xiaozhi.me>
- Model Context Protocol: <https://modelcontextprotocol.io>
