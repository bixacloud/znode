# Changelog

## [1.0.1] - 2026-02-10

### ✨ New Features

- **Community Forum**: Full-featured discussion forum inspired by Waterhole, including:
  - **Channels & Tags**: Organize discussions with customizable channels (icon, color, description, translations) and per-channel tags.
  - **Posts**: Create, edit, delete posts with rich text (TipTap editor), channel selection, and tag filtering.
  - **Comments & Replies**: Threaded comments with 1-level nesting, inline reply indicator, edit/delete support.
  - **Reactions & Upvotes**: Emoji reactions (👍❤️🎉🤔👀🚀💯😄) on posts and comments; upvote system for posts.
  - **Subscriptions & Notifications**: Auto-subscribe on post/comment; notify subscribers of new replies.
  - **Post Moderation**: Admin can pin, lock, mark answered, delete posts and comments.
  - **Pinned Posts**: Pinned posts displayed in a separate section at the top of the feed.
  - **Answer System**: Admin can mark a comment as the accepted answer; answered badge on post cards and answer summary box on post detail.
  - **Search & Sort**: Full-text search across posts; sort by Latest, Newest, Trending, Top.
  - **Pagination**: Server-side pagination for posts feed.
  - **Schema.org Structured Data**: `DiscussionForumPosting` JSON-LD on post detail pages for SEO.
  - **Waterhole-style UI**: Avatar-left PostCard layout, 2-column ForumPost page, collapsible composer comment form, channel sidebar with tooltips.
- **Forum Admin Panel**: Two dedicated admin pages:
  - **Channels Manager** (`/admin/forum/channels`): CRUD channels with icon, color, slug, active/read-only toggles; expandable tag management per channel.
  - **Posts Manager** (`/admin/forum/posts`): Search, filter by channel, pin/unpin, lock/unlock, delete posts with pagination.
- **Forum Service Layer** (`src/services/forum.ts`): Complete typed API client covering all public + admin forum endpoints.
- **Forum Seed Auto-Integration**: Fresh installations via the setup wizard now automatically seed 6 default forum channels and 21 tags with translations in 4 languages.
- **2FA Recovery Codes**: Users now receive 8 one-time recovery codes when enabling 2FA. Codes can be copied or downloaded as a text file.
- **2FA Support Ticket System**: Users locked out of 2FA can submit a support ticket directly from the login flow without needing full authentication (`/support/2fa`). Persistent ticket access via `supportToken` stored in localStorage; conversation-style UI with polling for replies.
- **Recovery Code Login**: Added option to sign in using a recovery code when the authenticator app is unavailable.
- **YouTube Embed in Editor**: TipTap rich text editor now supports inserting YouTube videos via URL.
- **Image Paste Upload (ImgBB)**: Users can paste screenshots (Ctrl+V) or drag-and-drop images into the text editor; images are automatically uploaded to ImgBB.
- **ImgBB Integration Settings**: New "Integrations" tab in Admin General Settings to configure the ImgBB API key.
- **Public Stats API**: New `/api/settings/public-stats` endpoint returning total user count (displayed on login page).
- **Knowledge Base Expand/Collapse**: The "+X more articles" link in each category is now clickable, allowing users to expand and view all articles or collapse back to 5.

### 🔧 Improvements

- **Admin/Support Colored Names in Forum**: Admin users display with primary-colored name and "Admin" badge; Support users with blue-colored name and "Support" badge — in post cards, post detail, comments, and replies.
- **Admin/Support Signatures**: Admin and Support users can have an `adminSignature` (HTML) displayed below their posts and comments in the forum.
- **Admin User Manager Fixes**:
  - Fixed OAuth column showing "-" for all users — now correctly displays OAuth provider names from the `accounts` relation.
  - Added **2FA Status** column to user list (desktop table ✅/✗ and mobile badge).
  - Admin can **disable 2FA** for any user via the Edit User sheet (clears secret and recovery codes).
  - Fixed duplicate imports (`CheckCircle2`, `XCircle`) in AdminUsers component.
  - Fixed `emailVerified` type comparison (Date → boolean conversion).
- **Forum Seed Data Refactored**: Extracted seed data into `backend/src/data/forum-seed.json` as a single source of truth, used by both `prisma/seed.ts` and the install wizard.
- **Last Activity in Post Cards**: Post cards show the last commenter's name and time ("replied X ago") or original poster info if no comments.
- **Channel Translations**: Channel names and descriptions are translatable per locale (vi, en, zh, fil), rendered based on user language preference.
- **Dynamic Site Branding**: Login, Register, and Dashboard sidebar now display the site logo and name from admin settings instead of hardcoded values.
- **Login Page User Count**: The login page shows a live user count fetched from the API instead of a static "100K+".
- **SEO Auto-Regeneration**: Saving SEO settings now automatically regenerates static `robots.txt` and `sitemap.xml` in the dist folder.
- **SEO Meta Applied on Load**: SEO meta tags (title, description, OG tags) are now applied immediately when settings are fetched, not just on language change.
- **Language Auto-Detection**: Browser language detection now supports all available languages dynamically, not just Vietnamese and English.
- **2FA Authenticator App Name**: The authenticator app now shows the site name from database settings instead of a hardcoded value.
- **Simplified Installer**: The install script no longer asks for database credentials during CLI setup; all configuration is handled through the web-based setup wizard.
- **Ticket Security**: Support tokens are cleared when tickets are closed.
- **Removed Static robots.txt**: The `public/robots.txt` file is removed; robots.txt is now managed dynamically through SEO settings.

### 🗃️ Database

- **Forum Schema** (Prisma): Added models `ForumChannel`, `ForumTag`, `ForumPost`, `ForumPostTag`, `ForumComment`, `ForumReaction`, `ForumUpvote`, `ForumSubscription` with full relations, indexes, and cascade deletes.

### 🌐 Internationalization

- Added comprehensive forum translations in all 4 languages (EN, VI, ZH, FIL): 60+ keys covering channels, posts, comments, reactions, moderation, admin panels, and validation messages.
- Added admin user management keys: `supportRole`, `newPassword`, `optional`, `leaveBlank`, `editUserDesc`, `userUpdated`, `emailVerified`, `emailVerifiedCol`, `twoFactorStatus`, `twoFactorActiveNote`, `keep2FAEnabled`.
- Added translations for `moreArticles`, `showLess`, and `article` keys in all 4 languages (EN, VI, ZH, FIL).
- Added translations for 2FA recovery codes UI (`recoveryCodesTitle`, `recoveryCodesDesc`, `copyAll`, `download`, etc.).
- Added translations for 2FA recovery code login (`useRecoveryCode`, `recoveryCode`, `recoveryCodeHint`, etc.).
- Added translations for Support2FA page in all languages.
- Added translations for ImgBB integration settings.
- Added translations for new admin general settings fields (`siteInfo`, `siteInfoDesc`, `siteNameHint`, `siteSloganHint`, `maintenance`, `security`, etc.).

### 🐛 Bug Fixes

- Fixed admin user list OAuth column always showing "-" instead of actual OAuth providers.
- Fixed admin user list duplicate icon imports causing build warnings.
- Fixed `emailVerified` type mismatch in admin edit user form (Date|null vs boolean).
- Fixed admin ticket notification hook using incorrect API endpoint (`/api/admin/tickets` → `/api/tickets/admin/all`).
- Fixed `t.kb.article` TypeScript error by adding the missing `article` key to locale files.

---

## [1.0.0] - 2026-02-01

> 🎉 Initial release of **ZNode** — a full-featured free web hosting management platform.

### 🏗️ Architecture

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui component library
- **Backend**: Express.js + TypeScript, Prisma ORM (MySQL/MariaDB), JWT authentication
- **19 database models**, **20 API route modules**, **50+ pages**
- Dark/Light theme with system preference detection
- Fully responsive design (desktop + mobile with collapsible sidebar)

### 🔐 Authentication & Security

- Email + password registration and login with Zod validation
- **OAuth social login** — Google, Facebook, Microsoft, Discord, GitHub (link/unlink accounts)
- **Two-Factor Authentication (TOTP)** — QR code setup, manual secret key, authenticator app verification, disable with password + code
- **Email verification** — OTP code + magic link dual-mode, resend verification
- **Forgot/Reset password** flow with token-based email
- **JWT auth** with access token + refresh token rotation
- **Cloudflare Turnstile CAPTCHA** — configurable per service (email verify, create hosting, hosting settings, create SSL, create ticket, reply ticket)
- **Maintenance mode** — blocks non-admin users, IP whitelist bypass
- Role-based access control: `USER`, `SUPPORT`, `ADMIN`

### 🖥️ Hosting Management (MOFH Integration)

- Create up to **3 free hosting accounts** per user
- **Subdomain mode** — choose from admin-configured allowed domains (e.g., `yoursite.example.com`)
- **Custom domain mode** — nameserver verification via DNS lookup before account creation
- Domain availability check and subdomain validation
- MOFH JSON & XML API integration for account provisioning
- **6 hosting states**: `ACTIVE`, `PENDING`, `SUSPENDING`, `REACTIVATING`, `SUSPENDED`, `DELETED` with auto-polling for transitional states
- Account credentials display (domain, package, username, password with show/hide, SQL server) with copy-to-clipboard
- **Usage statistics**: disk space, bandwidth, inodes — with progress bars
- **Database management**: create/delete MySQL databases (prefixed format), phpMyAdmin auto-login per database, sync with VistaPanel
- **Quick actions**: File Manager, cPanel Login, Softaculous auto-login, Website Builder
- cPanel auto-login with first-access approval flow
- Password change (alphanumeric-only for MOFH compatibility)
- User-initiated suspend/unsuspend (rate-limited: 2/day), admin suspend blocks user unsuspend
- Hosting label editing, deactivate/delete with reason
- **MOFH webhook callbacks** — handles ACTIVATED, SUSPENDED, REACTIVATE, DELETE events with debug logging

### 🔒 SSL Certificate Management

- Request free SSL certificates for hosting domains
- **Two ACME providers**: Let's Encrypt and Google Trust Services
- ACME DNS-01 challenge verification via Cloudflare DNS API
- Cloudflare + VistaPanel CNAME chain for subdomain SSL
- Auto-verification for service domains
- **Real-time issuance logs** streamed to frontend during certificate generation
- Certificate display: copy certificate, private key, CA bundle
- Download certificates as files
- Delete/cancel SSL requests (cleans up DNS records)
- **Admin SSL settings**: Cloudflare API token, intermediate domain, ACME email, staging toggle, Google Trust service account JSON, EAB key management
- Admin: list all certificates, trigger issuance, retry failed certificates

### 🎫 Support Ticket System

- Create tickets with optional service attachment (hosting account or SSL certificate)
- **Knowledge Base suggestions** — auto-suggests relevant KB articles when typing ticket subject
- **Rich text editor** (TipTap) for ticket messages and replies
- **Chat-style conversation** view with HTML content rendering and image lightbox
- Status-based filtering: `OPEN`, `REPLIED`, `CLOSED`
- User can close and reopen tickets
- **Reply rating system** — 1–5 stars with optional comment for support agent replies
- Admin/Support: reply with signature, close/reopen, view linked hosting info
- **Admin ticket dashboard**: stats (open/replied/closed counts), search, filter, pagination
- **Support ratings analytics**: per-agent breakdown (average rating, distribution), recent ratings with comments
- Email notifications on ticket reply
- Real-time polling for new replies (30s interval)
- Turnstile CAPTCHA on create and reply

### 👤 User Settings

- Display name update
- Password change (current password required)
- Set password for OAuth-only users
- **2FA management**: setup with QR code + manual secret, verify, disable (requires code + password)

### 🔔 Notification System

- **17 notification types**: LOGIN, LOGOUT, PASSWORD_CHANGE, OTP_ENABLED, OTP_DISABLED, PROFILE_UPDATE, HOSTING_CREATED/ACTIVATED/SUSPENDED/REACTIVATED/DELETED, TICKET_CREATED/REPLIED/CLOSED, ADMIN_BLOCKED/UNBLOCKED
- IP geolocation via ip-api.com for security notifications
- **Notification bell** — animated badge with unread count, real-time polling, type-specific icons, time-ago formatting
- Mark as read, mark all read, delete individual, clear all read
- Paginated notification center

### 📧 Email System

- **SMTP configuration** with connection test
- **10 system email templates**: HOSTING_CREATED, HOSTING_ACTIVATED, HOSTING_SUSPENDED, HOSTING_REACTIVATED, PASSWORD_CHANGED, TICKET_REPLY, WELCOME, PASSWORD_RESET, EMAIL_VERIFICATION (with OTP), DATA_IMPORT_CREDENTIALS
- Template editor with TipTap rich text, variable placeholders, preview
- Create custom templates, activate/deactivate
- **Send emails**: to individual users, search by name/email, or send to all users
- Email send logs with status filter (SENT/FAILED/PENDING), search, pagination

### 📚 Knowledge Base

- **Category management** — 13 built-in icons, ordering, multilingual translations
- **Article management** — Markdown content, excerpt, view counter, helpful/not helpful ratings, ordering, multilingual translations
- Public KB with category browsing, full-text search, article view with Markdown rendering
- Auto-generated slugs, breadcrumbs, view tracking
- **Bulk import** categories + articles
- **Reorder** categories and articles via drag

### 🌐 Website Builder

- **GrapesJS-powered** drag-and-drop builder with 15 plugins (preset-webpage, blocks-basic, forms, navbar, countdown, flexbox, tabs, tooltip, custom-code, touch, export, typed, parser-postcss)
- Bootstrap 5 canvas support
- Save & publish to hosting via FTP
- Asset manager for images, Ctrl+S keyboard shortcut
- Admin toggle to enable/disable builder for all users

### 🏠 Landing Page Editor

- **Puck Editor-powered** visual drag-and-drop landing page builder
- **10 configurable sections**: Navbar, Hero (with live stats), Features (icon grid), Pricing (plan comparison), Testimonials, FAQ (accordion), CTA, Footer (social links, columns), TextBlock, Spacer
- Per-language landing pages with fallback to English
- Save/publish, preview, active/inactive toggle

### ⬆️ Premium Plans

- Admin CRUD for premium hosting plans
- Plan details: name, price, currency, billing cycle, features list, specs (disk, bandwidth, domains, databases, SSL, support level)
- Affiliate URL redirect, popular plan highlighting
- Multilingual translations for plan names/descriptions/features
- Public upgrade page for users

### 🛠️ Developer Tools (6 tools)

1. **Base64 Tool** — 3 tabs: Text encode/decode, File ↔ Base64 with download, Image ↔ Base64 with data header and preview. Drag & drop, 5MB limit
2. **Case Converter** — 7 modes: sentence, lower, UPPER, Capitalized, aLtErNaTiNg, Title Case, InVeRsE. Copy, clear, download as .txt
3. **Code Beautifier** — HTML/CSS/JS/JSON with CodeMirror editor (One Dark theme), configurable indent, beautify & minify, use output as input
4. **Color Tools** — Color picker (HEX/RGB/HSL), color wheel canvas, color mixer (blend with ratio slider), gradient generator (CSS output), shades & tints, complementary color
5. **CSS Grid Generator** — Visual grid builder (columns, rows, gap), click cells to add items, drag to resize, CSS & Tailwind output modes, generated HTML+CSS
6. **CDN Search** — Search JS/CSS libraries via cdnjs, popular libraries grid, version selector, multiple CDN URLs (cdnjs, jsDelivr, unpkg), copy URL/HTML tag, file browser, README viewer (Markdown), speed test comparing CDN providers

### 💾 Backup System

- **4 storage types**: Local, FTP, SFTP, Google Drive (with OAuth flow)
- Backup configurations with schedule (daily/weekly), retention policy (days)
- Include database, uploads, or both
- Manual trigger, backup history with status tracking
- **Restore from backup** with full data recovery
- Test storage connection, download local backups
- Google Drive: OAuth connect/disconnect, folder selection

### 📥 Data Import

- SQL file upload and parsing for legacy system migration
- **Preview**: user/account/ticket/SSL/settings counts with sample data
- **Configurable**: password mode (keep/generate/custom), import settings (MOFH, SMTP, domains), send credential emails
- Progress tracking with step-by-step status
- Results summary with imported counts
- Dismissible import suggestion popup

### ⚙️ Admin Panel

- **Dashboard**: total users, admins, new users (7d), hosting stats (active/suspended), system health monitoring (API, Database, MOFH, SMTP, Cloudflare) with latency indicators
- **User management**: paginated table with search, create/edit/delete users, role management (USER/SUPPORT/ADMIN), block/unblock, support agent assignment, password change, email verification toggle
- **Hosting management**: search, status filter, pagination, navigate to hosting details, admin suspend/unsuspend, File Manager access
- **General settings** (4 tabs): Site Identity (name, slogan, logo, favicon), Security (email verification, Turnstile per-service), Maintenance (mode toggle, message, IP whitelist), SEO (per-language meta tags, OG/Twitter cards, robots.txt editor, sitemap toggle, canonical URL, custom head tags)
- **OAuth settings**: enable/disable + configure Client ID/Secret for 5 providers
- **MOFH settings**: API credentials, default package, cPanel URL, custom nameservers, connection test, packages list
- **Allowed domains**: manage subdomain domains list for hosting creation
- **Builder settings**: enable/disable GrapesJS website builder for users

### 🚀 Installation Wizard

- **Multi-step web installer**: language selection → welcome (fresh install vs restore) → database URL input with connection test (detailed error codes) → admin account creation (email, password with strength requirements, name) → site configuration (name, slogan) → installing (progress: env creation, Prisma migrations, admin creation, data seeding, server restart with health polling) → complete
- **Restore mode**: upload SQL/ZIP backup file during fresh install
- **CLI installer** (`install.sh`): detect environment, find available port, download latest release, install dependencies, build frontend + backend, configure PM2, health check — supports 4 languages

### 🌍 Internationalization (i18n)

- **4 languages**: English 🇺🇸, Vietnamese 🇻🇳, Chinese 🇨🇳, Filipino 🇵🇭
- All user-facing text uses translation keys
- Browser language auto-detection
- Language switcher in navigation
- Per-language: landing pages, KB articles, premium plans, SEO meta tags

### 📝 Rich Text Editor (TipTap)

- Bold, italic, underline, strikethrough
- Ordered & unordered lists
- Links (with URL input)
- Image insert (URL input)
- Text color picker (28 predefined colors)
- Highlight color picker (12 colors)
- Text alignment (left, center, right, justify)
- Code blocks
- Undo/Redo
- HTML source view toggle
- Simple mode (reduced toolbar) for tickets/replies

### 🔌 VistaPanel Proxy

- Database CRUD (create, delete, list, sync)
- phpMyAdmin auto-login
- Softaculous auto-login
- Domain listing
- DNS record management (CNAME, MX, SPF)
- SSL certificate management (get, upload, delete)
- Hosting usage statistics

### 📦 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack React Query, React Router v6, TipTap, GrapesJS, Puck Editor, CodeMirror, Lucide Icons, Zod
- **Backend**: Express.js, TypeScript, Prisma ORM, MySQL/MariaDB, JWT, Passport.js (5 OAuth strategies), Nodemailer, ACME client, node-forge
- **Infrastructure**: PM2 process manager, Cloudflare DNS API, MOFH API, VistaPanel API, ip-api.com geolocation
