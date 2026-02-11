# ZNode - Hướng dẫn cài đặt

## Cài đặt nhanh (1 lệnh)

SSH vào server, `cd` vào thư mục site, chạy:

```bash
cd ~/htdocs/yourdomain.com
bash <(curl -fsSL https://raw.githubusercontent.com/bixacloud/znode/main/install.sh)
```

Script sẽ tự động: chọn ngôn ngữ → tải code từ GitHub → kiểm tra port → cài dependencies → build → cấu hình → khởi động PM2.

> Đọc tiếp bên dưới nếu muốn hiểu chi tiết từng bước.

---

## Yêu cầu hệ thống

| Thành phần | Phiên bản |
|---|---|
| VPS/Server | Ubuntu 22+ / Debian 12+ |
| Panel | CloudPanel 2.x |
| Node.js | v22.x (CloudPanel tự cài khi tạo Node.js site) |
| MySQL/MariaDB | 8.0+ / 11.x+ |
| RAM | tối thiểu 1GB |
| Disk | tối thiểu 5GB trống |

---

## Bước 1: Tạo site trên CloudPanel

1. Đăng nhập **CloudPanel** → **Add Site** → chọn **Node.js**
2. Điền thông tin:
   - **Domain**: `yourdomain.com`
   - **Node.js Version**: 22
   - **Port**: `3002` (script sẽ tự tìm port trống, cập nhật lại sau)
3. Sau khi tạo xong, CloudPanel tự động:
   - Tạo user Linux + cài Node.js
   - Tạo thư mục `/home/youruser/htdocs/yourdomain.com/`
   - Cấu hình Nginx reverse proxy
   - Cấp SSL Let's Encrypt
4. Vào **Databases** → **Add Database** để tạo MySQL database

---

## Bước 2: Chạy script cài đặt

SSH vào server với user vừa tạo:

```bash
ssh youruser@yourserver
```

Chạy installer:

```bash
cd ~/htdocs/yourdomain.com
bash <(curl -fsSL https://raw.githubusercontent.com/bixacloud/znode/main/install.sh)
```

Script sẽ hỏi bạn:
1. **Ngôn ngữ** — English, Tiếng Việt, 中文, Filipino
2. **Xác nhận** — hiển thị domain + port trước khi cài

Script tự động thực hiện:
- ✅ Tải latest release từ GitHub (`bixacloud/znode`)
- ✅ Tìm port trống (3002-3100) tránh trùng
- ✅ Cài dependencies frontend + backend
- ✅ Build frontend với `VITE_API_URL` đúng domain
- ✅ Tạo `.env` tối thiểu (PORT, FRONTEND_URL, API_URL)
- ✅ Generate Prisma client + build backend TypeScript
- ✅ Cấu hình `ecosystem.config.cjs` (đường dẫn + port tự động)
- ✅ Khởi động PM2 + health check

> **Lưu ý**: Script KHÔNG hỏi database — bước đó sẽ làm qua wizard web `/install` sau.

---

## Bước 3: Cập nhật port trên CloudPanel

Sau khi script chạy xong, nó sẽ hiện port đã chọn (ví dụ `3005`).

Vào **CloudPanel** → site → **Settings** → sửa **Port** cho trùng với port script đã chọn.

> Nếu port mặc định `3002` không bị trùng thì không cần sửa.

---

## Bước 4: Truy cập & Cài đặt wizard

1. Mở trình duyệt: `https://yourdomain.com`
2. Hệ thống tự động chuyển đến trang `/install`
3. Làm theo wizard:
   - **Bước 1**: Chọn ngôn ngữ
   - **Bước 2**: Chọn chế độ (Fresh Install / Restore from Backup)
   - **Bước 3**: Nhập Database URL + test kết nối (port & frontend URL tự điền từ script)
   - **Bước 4**: Tạo tài khoản Admin (email + mật khẩu)
   - **Bước 5**: Cấu hình Site (tên, slogan)
   - **Bước 6**: Hoàn tất — tự tạo tables, seed data, restart
4. Đăng nhập với tài khoản admin vừa tạo
5. Nếu có dữ liệu từ hệ thống cũ (Bixa), vào **Settings → Data Import** để upload file SQL

---

## Bước 5: PM2 tự khởi động khi reboot

```bash
pm2 startup
# Chạy lệnh mà PM2 hiển thị (sudo env PATH=...)
pm2 save
```

---

## Cài đặt thủ công (không dùng script)

<details>
<summary>Bấm để xem hướng dẫn từng bước</summary>

### 1. Tải code

```bash
cd ~/htdocs/yourdomain.com

# Cách 1: Tải từ GitHub release
curl -fsSL https://api.github.com/repos/bixacloud/znode/releases/latest \
  | grep "browser_download_url.*tar.gz" | cut -d '"' -f 4 \
  | xargs curl -fsSL -o /tmp/znode.tar.gz
tar xzf /tmp/znode.tar.gz -C .

# Cách 2: Git clone
git clone https://github.com/bixacloud/znode.git .
```

### 2. Frontend

```bash
cd ~/htdocs/yourdomain.com
npm install
VITE_API_URL=https://yourdomain.com npx vite build
```

### 3. Backend

```bash
cd ~/htdocs/yourdomain.com/backend
npm install

# Tạo .env
cat > .env <<EOF
PORT=3002
NODE_ENV=production
DATABASE_URL="mysql://user:pass@localhost:3306/dbname"
JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
JWT_EXPIRES_IN="7d"
SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
FRONTEND_URL="https://yourdomain.com"
API_URL="https://yourdomain.com"
EOF

npx prisma generate
npx prisma db push
npx tsc
```

### 4. PM2

```bash
cd ~/htdocs/yourdomain.com/backend

# Sửa ecosystem.config.cjs: đặt cwd + port đúng
pm2 start ecosystem.config.cjs
pm2 save

# Kiểm tra
curl http://localhost:3002/health
```

</details>

---

## Tóm tắt cấu trúc sau khi cài xong

```
~/htdocs/yourdomain.com/
├── dist/                    ← Frontend build (static files)
├── src/                     ← Frontend source (không cần cho production)
├── node_modules/            ← Frontend dependencies
├── package.json
├── vite.config.ts
├── backend/
│   ├── dist/                ← Backend build (JS compiled)
│   ├── src/                 ← Backend source
│   ├── node_modules/
│   ├── prisma/
│   │   └── schema.prisma    ← Database schema
│   ├── .env                 ← Cấu hình (QUAN TRỌNG, không share)
│   ├── ecosystem.config.cjs ← PM2 config
│   └── package.json
└── public/
    └── robots.txt
```

---

## Lệnh thường dùng

```bash
# Restart backend
cd ~/htdocs/yourdomain.com/backend && pm2 restart znode-backend

# Rebuild frontend (sau khi sửa code)
cd ~/htdocs/yourdomain.com && VITE_API_URL=https://yourdomain.com npx vite build

# Rebuild backend (sau khi sửa code)
cd ~/htdocs/yourdomain.com/backend && npx tsc && pm2 restart znode-backend

# Xem log realtime
pm2 logs znode-backend

# Update database schema
cd ~/htdocs/yourdomain.com/backend && npx prisma db push

# Reset database (XÓA TOÀN BỘ DỮ LIỆU)
cd ~/htdocs/yourdomain.com/backend && npx prisma db push --force-reset --accept-data-loss
```

---

## Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| 502 Bad Gateway | Backend chưa chạy hoặc port sai | `pm2 list` kiểm tra, `pm2 restart` |
| CORS error | `FRONTEND_URL` trong `.env` sai | Sửa `.env`, restart backend |
| Trang trắng | Frontend chưa build hoặc `VITE_API_URL` sai | Build lại frontend với URL đúng |
| Database error | `DATABASE_URL` sai hoặc DB chưa tạo | Kiểm tra `.env`, tạo DB trên CloudPanel |
| `/admin/login` 404 | Phiên bản cũ, đã fix | Đảm bảo dùng code mới nhất |
| PM2 không tìm thấy node | NVM chưa load trong shell | Thêm NVM vào `.bashrc` |
