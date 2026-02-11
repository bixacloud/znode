#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# ZNode - Automated Installer
# Downloads latest release, installs deps, builds, configures
# Usage: bash <(curl -fsSL https://raw.githubusercontent.com/bixacloud/znode/main/install.sh)
# ============================================================

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# --- i18n Messages ---
declare -A MSG_EN MSG_VI MSG_ZH MSG_FIL

MSG_EN=(
  [welcome]="Welcome to ZNode Installer"
  [select_lang]="Select language / Chọn ngôn ngữ:"
  [lang_en]="English"
  [lang_vi]="Tiếng Việt"
  [lang_zh]="中文"
  [lang_fil]="Filipino"
  [choice]="Your choice"
  [invalid_choice]="Invalid choice, please try again."
  [detecting]="Detecting environment..."
  [detected_user]="User"
  [detected_domain]="Domain"
  [detected_dir]="Directory"
  [node_version]="Node.js version"
  [npm_version]="npm version"
  [node_not_found]="Node.js not found! Please ensure CloudPanel installed Node.js for this site."
  [checking_port]="Finding available port..."
  [port_in_use]="Port %s is in use, trying next..."
  [port_selected]="Selected port: %s"
  [no_port]="Could not find an available port (tried 3002-3100). Exiting."
  [downloading]="Downloading latest ZNode release..."
  [download_fail]="Failed to download. Check your internet connection."
  [extracting]="Extracting files..."
  [installing_fe]="Installing frontend dependencies..."
  [building_fe]="Building frontend..."
  [installing_be]="Installing backend dependencies..."
  [generating_prisma]="Generating Prisma client..."
  [building_be]="Building backend..."
  [configuring_pm2]="Configuring PM2..."
  [starting_pm2]="Starting backend with PM2..."
  [health_check]="Running health check..."
  [health_ok]="Backend is running!"
  [health_fail]="Backend health check failed. Check logs: pm2 logs %s"
  [install_done]="Server setup complete!"
  [visit_url]="Visit %s to complete setup (create admin account, configure database)."
  [pm2_name]="PM2 process name"
  [summary]="Setup Summary"
  [confirm]="Proceed with setup? (y/n)"
  [aborted]="Setup aborted."
  [step]="Step"
  [of]="of"
  [npm_install_fail]="npm install failed. Check logs above."
  [build_fail]="Build failed. Check logs above."
  [skip_download]="Source code already exists. Skip download? (y/n)"
  [creating_env]="Creating minimal .env for startup..."
  [checking_swap]="Checking available memory..."
  [creating_swap]="Low RAM detected (%sMB). Creating 2GB swap file for build..."
  [swap_created]="Swap file created (2GB)."
  [swap_exists]="Swap already active (%sMB), skipping."
  [swap_skip]="Sufficient RAM (%sMB), no swap needed."
)

MSG_VI=(
  [welcome]="Chào mừng bạn đến với Trình cài đặt ZNode"
  [select_lang]="Select language / Chọn ngôn ngữ:"
  [lang_en]="English"
  [lang_vi]="Tiếng Việt"
  [lang_zh]="中文"
  [lang_fil]="Filipino"
  [choice]="Lựa chọn của bạn"
  [invalid_choice]="Lựa chọn không hợp lệ, vui lòng thử lại."
  [detecting]="Đang phát hiện môi trường..."
  [detected_user]="User"
  [detected_domain]="Tên miền"
  [detected_dir]="Thư mục"
  [node_version]="Phiên bản Node.js"
  [npm_version]="Phiên bản npm"
  [node_not_found]="Không tìm thấy Node.js! Hãy đảm bảo CloudPanel đã cài Node.js cho site này."
  [checking_port]="Đang tìm cổng khả dụng..."
  [port_in_use]="Cổng %s đang được sử dụng, thử cổng tiếp theo..."
  [port_selected]="Cổng đã chọn: %s"
  [no_port]="Không tìm thấy cổng khả dụng (đã thử 3002-3100). Thoát."
  [downloading]="Đang tải phiên bản ZNode mới nhất..."
  [download_fail]="Tải thất bại. Kiểm tra kết nối internet."
  [extracting]="Đang giải nén..."
  [installing_fe]="Đang cài đặt dependencies frontend..."
  [building_fe]="Đang build frontend..."
  [installing_be]="Đang cài đặt dependencies backend..."
  [generating_prisma]="Đang tạo Prisma client..."
  [building_be]="Đang build backend..."
  [configuring_pm2]="Đang cấu hình PM2..."
  [starting_pm2]="Đang khởi động backend với PM2..."
  [health_check]="Đang kiểm tra health..."
  [health_ok]="Backend đang chạy!"
  [health_fail]="Kiểm tra health thất bại. Xem log: pm2 logs %s"
  [install_done]="Cài đặt server hoàn tất!"
  [visit_url]="Truy cập %s để hoàn tất cài đặt (tạo admin, cấu hình database)."
  [pm2_name]="Tên tiến trình PM2"
  [summary]="Tóm tắt cài đặt"
  [confirm]="Tiếp tục cài đặt? (y/n)"
  [aborted]="Đã hủy cài đặt."
  [step]="Bước"
  [of]="trong"
  [npm_install_fail]="npm install thất bại. Kiểm tra log phía trên."
  [build_fail]="Build thất bại. Kiểm tra log phía trên."
  [skip_download]="Mã nguồn đã tồn tại. Bỏ qua tải xuống? (y/n)"
  [creating_env]="Đang tạo .env tối thiểu để khởi động..."
  [checking_swap]="Đang kiểm tra bộ nhớ..."
  [creating_swap]="RAM thấp (%sMB). Đang tạo swap 2GB để build..."
  [swap_created]="Đã tạo swap file (2GB)."
  [swap_exists]="Swap đã có (%sMB), bỏ qua."
  [swap_skip]="RAM đủ (%sMB), không cần swap."
)

MSG_ZH=(
  [welcome]="欢迎使用 ZNode 安装程序"
  [select_lang]="Select language / Chọn ngôn ngữ:"
  [lang_en]="English"
  [lang_vi]="Tiếng Việt"
  [lang_zh]="中文"
  [lang_fil]="Filipino"
  [choice]="您的选择"
  [invalid_choice]="无效选择，请重试。"
  [detecting]="正在检测环境..."
  [detected_user]="用户"
  [detected_domain]="域名"
  [detected_dir]="目录"
  [node_version]="Node.js 版本"
  [npm_version]="npm 版本"
  [node_not_found]="未找到 Node.js！请确保 CloudPanel 已为此站点安装 Node.js。"
  [checking_port]="正在查找可用端口..."
  [port_in_use]="端口 %s 已被占用，尝试下一个..."
  [port_selected]="已选择端口: %s"
  [no_port]="找不到可用端口（已尝试 3002-3100）。退出。"
  [downloading]="正在下载最新版 ZNode..."
  [download_fail]="下载失败。请检查网络连接。"
  [extracting]="正在解压..."
  [installing_fe]="正在安装前端依赖..."
  [building_fe]="正在构建前端..."
  [installing_be]="正在安装后端依赖..."
  [generating_prisma]="正在生成 Prisma 客户端..."
  [building_be]="正在构建后端..."
  [configuring_pm2]="正在配置 PM2..."
  [starting_pm2]="正在使用 PM2 启动后端..."
  [health_check]="正在进行健康检查..."
  [health_ok]="后端运行正常！"
  [health_fail]="健康检查失败。查看日志: pm2 logs %s"
  [install_done]="服务器安装完成！"
  [visit_url]="访问 %s 完成设置（创建管理员账户、配置数据库）。"
  [pm2_name]="PM2 进程名称"
  [summary]="安装摘要"
  [confirm]="继续安装？(y/n)"
  [aborted]="安装已取消。"
  [step]="步骤"
  [of]="共"
  [npm_install_fail]="npm install 失败。请检查上方日志。"
  [build_fail]="构建失败。请检查上方日志。"
  [skip_download]="源代码已存在。跳过下载？(y/n)"
  [creating_env]="正在创建最小 .env 启动配置..."
  [checking_swap]="正在检查可用内存..."
  [creating_swap]="检测到低内存（%sMB）。正在创建 2GB swap 文件..."
  [swap_created]="Swap 文件已创建（2GB）。"
  [swap_exists]="Swap 已激活（%sMB），跳过。"
  [swap_skip]="内存充足（%sMB），无需 swap。"
)

MSG_FIL=(
  [welcome]="Maligayang pagdating sa ZNode Installer"
  [select_lang]="Select language / Chọn ngôn ngữ:"
  [lang_en]="English"
  [lang_vi]="Tiếng Việt"
  [lang_zh]="中文"
  [lang_fil]="Filipino"
  [choice]="Ang iyong pagpili"
  [invalid_choice]="Hindi wastong pagpili, subukan muli."
  [detecting]="Nag-detect ng environment..."
  [detected_user]="User"
  [detected_domain]="Domain"
  [detected_dir]="Directory"
  [node_version]="Node.js version"
  [npm_version]="npm version"
  [node_not_found]="Hindi nahanap ang Node.js! Siguraduhing naka-install ang Node.js sa CloudPanel."
  [checking_port]="Naghahanap ng available na port..."
  [port_in_use]="Port %s ay ginagamit na, sinusubukan ang susunod..."
  [port_selected]="Napiling port: %s"
  [no_port]="Walang available na port (sinubukan 3002-3100). Lumalabas."
  [downloading]="Dina-download ang pinakabagong ZNode release..."
  [download_fail]="Nabigo ang download. Suriin ang internet connection."
  [extracting]="Nag-e-extract ng mga file..."
  [installing_fe]="Nag-i-install ng frontend dependencies..."
  [building_fe]="Bini-build ang frontend..."
  [installing_be]="Nag-i-install ng backend dependencies..."
  [generating_prisma]="Ginagawa ang Prisma client..."
  [building_be]="Bini-build ang backend..."
  [configuring_pm2]="Kino-configure ang PM2..."
  [starting_pm2]="Sinimulan ang backend gamit ang PM2..."
  [health_check]="Nagpapatakbo ng health check..."
  [health_ok]="Tumatakbo ang backend!"
  [health_fail]="Nabigo ang health check. Tingnan ang logs: pm2 logs %s"
  [install_done]="Kumpleto na ang server setup!"
  [visit_url]="Bisitahin ang %s para kumpletuhin ang setup (admin account, database config)."
  [pm2_name]="PM2 process name"
  [summary]="Buod ng Setup"
  [confirm]="Ipagpatuloy ang setup? (y/n)"
  [aborted]="Na-cancel ang setup."
  [step]="Hakbang"
  [of]="sa"
  [npm_install_fail]="Nabigo ang npm install. Suriin ang logs sa itaas."
  [build_fail]="Nabigo ang build. Suriin ang logs sa itaas."
  [skip_download]="Umiiral na ang source code. Laktawan ang download? (y/n)"
  [creating_env]="Gumagawa ng minimal .env para sa startup..."
  [checking_swap]="Tinitingnan ang available na memory..."
  [creating_swap]="Mababang RAM (%sMB). Gumagawa ng 2GB swap file para sa build..."
  [swap_created]="Swap file nagawa na (2GB)."
  [swap_exists]="May swap na (%sMB), nilaktawan."
  [swap_skip]="Sapat ang RAM (%sMB), hindi kailangan ng swap."
)

LANG_CODE="en"

msg() {
  local key="$1"
  shift
  local text=""
  case "$LANG_CODE" in
    vi) text="${MSG_VI[$key]:-${MSG_EN[$key]}}" ;;
    zh) text="${MSG_ZH[$key]:-${MSG_EN[$key]}}" ;;
    fil) text="${MSG_FIL[$key]:-${MSG_EN[$key]}}" ;;
    *) text="${MSG_EN[$key]}" ;;
  esac
  if [[ $# -gt 0 ]]; then
    printf "$text" "$@"
  else
    echo "$text"
  fi
}

print_header() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}  ${BOLD}⚡ ZNode Installer${NC}                              ${CYAN}║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_step() {
  local current=$1
  local total=$2
  local message=$3
  echo ""
  echo -e "${BLUE}━━━ $(msg step) ${current} $(msg of) ${total}: ${message} ━━━${NC}"
}

print_ok() {
  echo -e "${GREEN}✓${NC} $1"
}

print_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_err() {
  echo -e "${RED}✗${NC} $1"
}

# --- Step 0: Language Selection ---
select_language() {
  print_header
  echo -e "${BOLD}$(msg select_lang)${NC}"
  echo ""
  echo "  1) 🇺🇸 $(msg lang_en)"
  echo "  2) 🇻🇳 $(msg lang_vi)"
  echo "  3) 🇨🇳 $(msg lang_zh)"
  echo "  4) 🇵🇭 $(msg lang_fil)"
  echo ""

  while true; do
    read -p "$(echo -e "${CYAN}$(msg choice) [1-4]:${NC} ")" lang_choice
    case "$lang_choice" in
      1) LANG_CODE="en"; break ;;
      2) LANG_CODE="vi"; break ;;
      3) LANG_CODE="zh"; break ;;
      4) LANG_CODE="fil"; break ;;
      *) echo -e "${RED}$(msg invalid_choice)${NC}" ;;
    esac
  done
}

# --- Detect environment ---
detect_environment() {
  print_step 1 7 "$(msg detecting)"

  CURRENT_USER=$(whoami)
  INSTALL_DIR=$(pwd)

  # Detect domain from directory path: /home/user/htdocs/domain.com
  if [[ "$INSTALL_DIR" =~ /home/([^/]+)/htdocs/([^/]+) ]]; then
    DETECTED_DOMAIN="${BASH_REMATCH[2]}"
  else
    DETECTED_DOMAIN=""
  fi

  # Check Node.js
  if ! command -v node &>/dev/null; then
    # Try common NVM paths
    NVM_NODE_DIR="$HOME/.nvm/versions/node"
    if [[ -d "$NVM_NODE_DIR" ]]; then
      LATEST_NODE=$(ls -v "$NVM_NODE_DIR" 2>/dev/null | tail -1)
      if [[ -n "$LATEST_NODE" ]]; then
        export PATH="$NVM_NODE_DIR/$LATEST_NODE/bin:$PATH"
      fi
    fi
  fi

  if ! command -v node &>/dev/null; then
    print_err "$(msg node_not_found)"
    exit 1
  fi

  NODE_VER=$(node -v)
  NPM_VER=$(npm -v)

  print_ok "$(msg detected_user): ${BOLD}$CURRENT_USER${NC}"
  print_ok "$(msg detected_dir): ${BOLD}$INSTALL_DIR${NC}"
  [[ -n "$DETECTED_DOMAIN" ]] && print_ok "$(msg detected_domain): ${BOLD}$DETECTED_DOMAIN${NC}"
  print_ok "$(msg node_version): ${BOLD}$NODE_VER${NC}"
  print_ok "$(msg npm_version): ${BOLD}$NPM_VER${NC}"

  # Install PM2 if not available
  if ! command -v pm2 &>/dev/null; then
    print_warn "PM2 not found, installing..."
    npm install -g pm2
  fi
  print_ok "PM2: ${BOLD}$(pm2 -v)${NC}"
}

# --- Find available port ---
find_available_port() {
  print_step 2 7 "$(msg checking_port)"

  for port in $(seq 3002 3100); do
    if ! ss -tlnp 2>/dev/null | grep -q ":${port} " && \
       ! netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
      SELECTED_PORT=$port
      print_ok "$(msg port_selected "$port")"
      return
    fi
    print_warn "$(msg port_in_use "$port")"
  done

  print_err "$(msg no_port)"
  exit 1
}

# --- Gather user input ---
gather_input() {
  echo ""
  echo -e "${BOLD}━━━ Configuration ━━━${NC}"
  echo ""

  # Domain
  if [[ -n "$DETECTED_DOMAIN" ]]; then
    DOMAIN="$DETECTED_DOMAIN"
    print_ok "$(msg detected_domain): ${BOLD}$DOMAIN${NC}"
  else
    read -p "$(echo -e "${CYAN}Enter your domain (e.g. example.com):${NC} ")" DOMAIN
  fi

  # PM2 process name
  PM2_NAME="znode-$(echo "$DOMAIN" | sed 's/\./-/g')"

  # Summary
  echo ""
  echo -e "${BOLD}━━━ $(msg summary) ━━━${NC}"
  echo ""
  echo -e "  $(msg detected_domain):  ${BOLD}$DOMAIN${NC}"
  echo -e "  Port:         ${BOLD}$SELECTED_PORT${NC}"
  echo -e "  $(msg pm2_name): ${BOLD}$PM2_NAME${NC}"
  echo -e "  $(msg detected_dir):  ${BOLD}$INSTALL_DIR${NC}"
  echo ""

  read -p "$(echo -e "${CYAN}$(msg confirm)${NC} ")" confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    print_err "$(msg aborted)"
    exit 0
  fi
}

# --- Download latest release ---
download_release() {
  print_step 3 7 "$(msg downloading)"

  GITHUB_REPO="bixacloud/znode"
  RELEASE_API="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"

  # Check if source already exists
  if [[ -f "$INSTALL_DIR/package.json" ]] && grep -q "znode" "$INSTALL_DIR/package.json" 2>/dev/null; then
    read -p "$(echo -e "${CYAN}$(msg skip_download)${NC} ")" skip
    if [[ "$skip" == "y" || "$skip" == "Y" ]]; then
      print_ok "Skipped download, using existing source."
      return
    fi
  fi

  # Get download URL
  DOWNLOAD_URL=$(curl -fsSL "$RELEASE_API" | node -e "
    let d='';
    process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try {
        const r=JSON.parse(d);
        const a=r.assets&&r.assets.find(a=>a.name.endsWith('.tar.gz'));
        if(a) console.log(a.browser_download_url);
        else { console.error('No tar.gz asset found'); process.exit(1); }
      } catch(e) { console.error(e.message); process.exit(1); }
    });
  ")

  if [[ -z "$DOWNLOAD_URL" ]]; then
    print_err "$(msg download_fail)"
    exit 1
  fi

  # Download
  TMPFILE=$(mktemp /tmp/znode-release-XXXXXX.tar.gz)
  if ! curl -fsSL -o "$TMPFILE" "$DOWNLOAD_URL"; then
    rm -f "$TMPFILE"
    print_err "$(msg download_fail)"
    exit 1
  fi

  # Extract
  echo "$(msg extracting)"
  tar xzf "$TMPFILE" -C "$INSTALL_DIR"
  rm -f "$TMPFILE"

  print_ok "Download & extract complete."
}

# --- Ensure swap for low-RAM systems ---
ensure_swap() {
  echo -e "${BLUE}$(msg checking_swap)${NC}"

  local total_ram_mb
  total_ram_mb=$(free -m | awk '/^Mem:/{print $2}')
  local swap_mb
  swap_mb=$(free -m | awk '/^Swap:/{print $2}')

  if (( swap_mb >= 512 )); then
    print_ok "$(msg swap_exists "$swap_mb")"
    return
  fi

  if (( total_ram_mb >= 3072 )); then
    print_ok "$(msg swap_skip "$total_ram_mb")"
    return
  fi

  print_warn "$(msg creating_swap "$total_ram_mb")"

  if [[ -f /swapfile ]]; then
    sudo swapoff /swapfile 2>/dev/null || true
    sudo rm -f /swapfile
  fi

  sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress 2>/dev/null || \
    sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile

  # Add to fstab if not already there
  if ! grep -q '/swapfile' /etc/fstab 2>/dev/null; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  fi

  print_ok "$(msg swap_created)"
}

# --- Install frontend ---
install_frontend() {
  print_step 4 7 "$(msg installing_fe)"
  cd "$INSTALL_DIR"

  # Ensure swap for low-RAM VPS
  ensure_swap

  if ! npm install --production=false 2>&1; then
    print_err "$(msg npm_install_fail)"
    exit 1
  fi
  print_ok "Frontend dependencies installed."

  echo ""
  echo -e "${BLUE}$(msg building_fe)${NC}"

  if ! NODE_OPTIONS="--max-old-space-size=1536" VITE_API_URL="https://${DOMAIN}" npx vite build 2>&1; then
    print_err "$(msg build_fail)"
    exit 1
  fi
  print_ok "Frontend built → dist/"
}

# --- Install & configure backend ---
install_backend() {
  print_step 5 7 "$(msg installing_be)"
  cd "$INSTALL_DIR/backend"

  if ! npm install --production=false 2>&1; then
    print_err "$(msg npm_install_fail)"
    exit 1
  fi
  print_ok "Backend dependencies installed."

  # Create minimal .env for startup (wizard will complete it)
  echo ""
  echo -e "${BLUE}$(msg creating_env)${NC}"

  cat > "$INSTALL_DIR/backend/.env" <<ENVEOF
PORT=${SELECTED_PORT}
NODE_ENV=production
FRONTEND_URL="https://${DOMAIN}"
API_URL="https://${DOMAIN}"
ENVEOF

  print_ok "Minimal .env created (PORT=${SELECTED_PORT})."

  # Prisma generate (needed for TypeScript build, NOT db push)
  echo ""
  echo -e "${BLUE}$(msg generating_prisma)${NC}"
  npx prisma generate
  print_ok "Prisma client generated."

  # Build TypeScript
  echo ""
  echo -e "${BLUE}$(msg building_be)${NC}"
  if ! NODE_OPTIONS="--max-old-space-size=1024" npx tsc 2>&1; then
    print_err "$(msg build_fail)"
    exit 1
  fi
  print_ok "Backend built → backend/dist/"
}

# --- Configure & start PM2 ---
setup_pm2() {
  print_step 6 7 "$(msg configuring_pm2)"

  BACKEND_DIR="$INSTALL_DIR/backend"

  cat > "$BACKEND_DIR/ecosystem.config.cjs" <<PMEOF
module.exports = {
  apps: [
    {
      name: '${PM2_NAME}',
      script: 'dist/index.js',
      cwd: '${BACKEND_DIR}',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: ${SELECTED_PORT},
      },
    },
  ],
};
PMEOF

  print_ok "ecosystem.config.cjs created."

  # Stop existing process if any
  pm2 delete "$PM2_NAME" 2>/dev/null || true

  echo ""
  echo -e "${BLUE}$(msg starting_pm2)${NC}"
  cd "$BACKEND_DIR"
  pm2 start ecosystem.config.cjs
  pm2 save --force

  print_ok "PM2 started: ${BOLD}$PM2_NAME${NC}"
}

# --- Health check ---
health_check() {
  print_step 7 7 "$(msg health_check)"

  sleep 3

  local retries=5
  for i in $(seq 1 $retries); do
    HEALTH=$(curl -fsSL "http://localhost:${SELECTED_PORT}/health" 2>/dev/null || true)
    if echo "$HEALTH" | grep -q '"status":"ok"'; then
      print_ok "$(msg health_ok)"
      return
    fi
    sleep 2
  done

  print_warn "$(msg health_fail "$PM2_NAME")"
}

# --- Final summary ---
print_final() {
  echo ""
  echo -e "${GREEN}$(msg install_done)${NC}"

  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║${NC}  ${BOLD}✅ $(msg install_done)${NC}"
  echo -e "${GREEN}╠══════════════════════════════════════════════════╣${NC}"
  echo -e "${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  URL:      ${BOLD}https://${DOMAIN}${NC}"
  echo -e "${GREEN}║${NC}  Port:     ${BOLD}${SELECTED_PORT}${NC}"
  echo -e "${GREEN}║${NC}  PM2:      ${BOLD}${PM2_NAME}${NC}"
  echo -e "${GREEN}║${NC}  Backend:  ${BOLD}${INSTALL_DIR}/backend${NC}"
  echo -e "${GREEN}║${NC}  Frontend: ${BOLD}${INSTALL_DIR}/dist${NC}"
  echo -e "${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  $(msg visit_url "https://${DOMAIN}/install")"
  echo -e "${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  ${YELLOW}CloudPanel: Set reverse proxy port to ${SELECTED_PORT}${NC}"
  echo -e "${GREEN}║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${CYAN}pm2 logs ${PM2_NAME}${NC}        — View logs"
  echo -e "  ${CYAN}pm2 restart ${PM2_NAME}${NC}     — Restart backend"
  echo -e "  ${CYAN}pm2 status${NC}                   — Check status"
  echo ""
}

# ============================================================
# Main
# ============================================================
main() {
  select_language

  echo -e "${BOLD}$(msg welcome)${NC}"
  echo ""

  detect_environment
  find_available_port
  gather_input
  download_release
  install_frontend
  install_backend
  setup_pm2
  health_check
  print_final
}

main "$@"
