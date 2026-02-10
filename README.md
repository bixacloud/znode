# ZNode

A modern free hosting management panel built with React + Node.js. Integrates with [MyOwnFreeHost (MOFH)](https://myownfreehost.net) API for automated hosting provisioning.

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

## Features

**For Users**
- 🌐 Free hosting accounts with custom or subdomain
- 🔒 Free SSL certificates (Let's Encrypt & Google Trust)
- 📊 Dashboard with real-time stats
- 🎫 Support ticket system
- 📚 Knowledge base
- 🔐 Two-factor authentication (TOTP)
- 🌍 Multilingual (English, Tiếng Việt, 中文, Filipino)

**For Admins**
- 👥 User & hosting management
- 📧 Email system (SMTP, templates, logs)
- 💾 Backup & restore (local, FTP, SFTP, Google Drive)
- 🎨 Landing page builder (GrapesJS)
- 📦 Data import from Bixa (PHP)
- ⚙️ OAuth, SSL, domain, and site settings

**Developer Tools** — CDN search, code beautifier, Base64, color tools, CSS grid generator

## Requirements

- **VPS** with Ubuntu 22+ or Debian 12+
- **CloudPanel 2.x** (manages Nginx, SSL, Node.js)
- **MySQL/MariaDB** 8.0+
- **Node.js** 22+ (auto-installed by CloudPanel)

## Installation

### Quick Start (Recommended)

**1. Create a Node.js site on CloudPanel**

- Add Site → Node.js → enter your domain
- Add a MySQL database under Databases

**2. Run the installer**

```bash
cd ~/htdocs/yourdomain.com
bash <(curl -fsSL https://raw.githubusercontent.com/bixacloud/znode/main/install.sh)
```

The script will:
- Ask your preferred language
- Download the latest release from GitHub
- Find an available port (3002–3100)
- Install dependencies & build frontend + backend
- Configure PM2 and start the server

**3. Update the port on CloudPanel**

Set the site's port to match the one shown by the installer.

**4. Complete setup in your browser**

Open `https://yourdomain.com` — the setup wizard will guide you through:
- Database connection
- Admin account creation
- Site name & settings

### Manual Installation

<details>
<summary>Click to expand</summary>

```bash
cd ~/htdocs/yourdomain.com

# Download latest release
curl -fsSL https://api.github.com/repos/bixacloud/znode/releases/latest \
  | grep "browser_download_url.*tar.gz" | cut -d '"' -f 4 \
  | xargs curl -fsSL -o /tmp/znode.tar.gz
tar xzf /tmp/znode.tar.gz -C .

# Frontend
npm install
VITE_API_URL=https://yourdomain.com npx vite build

# Backend
cd backend
npm install
cat > .env <<EOF
PORT=3002
NODE_ENV=production
FRONTEND_URL="https://yourdomain.com"
API_URL="https://yourdomain.com"
EOF
npx prisma generate
npx tsc

# Start
pm2 start ecosystem.config.cjs
pm2 save
```

Open `https://yourdomain.com` to complete setup.

</details>

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, shadcn/ui |
| Backend | Node.js 22, Express 4, Prisma 6, MySQL |
| Auth | JWT, Passport (Google, GitHub, Discord, Facebook, Microsoft) |
| Infra | PM2, Nginx (CloudPanel), Let's Encrypt |

## Project Structure

```
znode/
├── src/                    # Frontend (React)
│   ├── components/         # UI components
│   ├── contexts/           # Auth, Language, Site contexts
│   ├── i18n/locales/       # Translation files
│   ├── pages/              # Pages + admin pages
│   └── services/           # API client
├── backend/                # Backend (Express)
│   ├── src/routes/         # API routes
│   ├── src/lib/            # Utilities (email, SSL, backup)
│   ├── src/strategies/     # OAuth strategies
│   └── prisma/schema.prisma
├── install.sh              # Automated installer
└── public/                 # Static assets
```

## Commands

```bash
pm2 restart znode-backend                                   # Restart
pm2 logs znode-backend                                      # View logs
VITE_API_URL=https://yourdomain.com npx vite build          # Rebuild frontend
cd backend && npx tsc && pm2 restart znode-backend          # Rebuild backend
cd backend && npx prisma db push                            # Update DB schema
```

## Environment Variables

The setup wizard creates `.env` automatically. Key variables:

| Variable | Description |
|----------|-------------|
| `PORT` | Backend server port |
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | JWT signing key (auto-generated) |
| `SESSION_SECRET` | Session key (auto-generated) |
| `FRONTEND_URL` | Your domain URL |
| `API_URL` | API base URL (same as frontend) |

## Releases

When a version tag is pushed, GitHub Actions automatically creates a release:

```bash
git tag v1.0.1
git push origin v1.0.1
# → Release "ZNode v1.0.1" created with downloadable .tar.gz
```

## License

MIT
