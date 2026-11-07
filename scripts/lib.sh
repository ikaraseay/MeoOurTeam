#!/usr/bin/env bash
# =============================================================================
# 公共函数：路径、配置读取、输出、Wrangler 包装
# =============================================================================
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"
CONFIG_FILE="${CONFIG_FILE:-$PROJECT_ROOT/config.env}"
CONFIG_EXAMPLE="$PROJECT_ROOT/config.env.example"
CLOUDFLARE_DIR="$PROJECT_ROOT/cloudflare"
DEV_VARS="$CLOUDFLARE_DIR/.dev.vars"
WRANGLER_CONFIG="$CLOUDFLARE_DIR/wrangler.jsonc"
ASTRO_CONFIG="$PROJECT_ROOT/astro.config.mjs"
WRANGLER_BIN="$PROJECT_ROOT/node_modules/.bin/wrangler"

ALL_KEYS="SITE_URL WORKER_NAME D1_DATABASE_NAME D1_DATABASE_ID R2_BUCKET_NAME
CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN DEPLOY_HOOK_URL ADMIN_PASSWORD_HASH SESSION_SECRET"

CF_KEYS="WORKER_NAME SITE_URL D1_DATABASE_NAME D1_DATABASE_ID R2_BUCKET_NAME
CLOUDFLARE_ACCOUNT_ID DEPLOY_HOOK_URL ADMIN_PASSWORD_HASH SESSION_SECRET"

C_RESET=$'\033[0m'; C_B=$'\033[1m'; C_DIM=$'\033[2m'
C_G=$'\033[32m'; C_Y=$'\033[33m'; C_R=$'\033[31m'; C_C=$'\033[36m'

step() { printf "\n%s▸ %s%s\n" "$C_C" "$*" "$C_RESET"; }
ok()   { printf "  %s✓%s %s\n" "$C_G" "$C_RESET" "$*"; }
warn() { printf "  %s!%s %s\n" "$C_Y" "$C_RESET" "$*" >&2; }
err()  { printf "  %s✗%s %s\n" "$C_R" "$C_RESET" "$*" >&2; }
die()  { err "$*"; exit 1; }
note() { printf "  %s%s%s\n" "$C_DIM" "$*" "$C_RESET"; }

require_cmd() { command -v "$1" >/dev/null 2>&1 || die "缺少命令：$1（$2）"; }

ask_yes_no() {
  local prompt="$1" reply
  printf "  %s%s [y/N] %s" "$C_B" "$prompt" "$C_RESET"
  read -r reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

config_get() {
  local key="$1" line
  [ -f "$CONFIG_FILE" ] || return 0
  line="$(sed -n "s/^${key}=//p" "$CONFIG_FILE" | head -1)"
  [ -n "$line" ] || return 0
  case "$line" in
    \"*)  printf '%s' "$line" | sed -E 's/^"([^"]*)".*/\1/' ;;
    \'*)  printf '%s' "$line" | sed -E "s/^'([^']*)'.*/\1/" ;;
    *)    printf '%s' "$line" | sed -E 's/[[:space:]]*#.*//; s/[[:space:]]+$//' ;;
  esac
}

config_set() {
  local key="$1" value="$2" escaped
  [ -f "$CONFIG_FILE" ] || cp "$CONFIG_EXAMPLE" "$CONFIG_FILE"
  escaped="${value//\\/\\\\}"
  escaped="${escaped//\"/\\\"}"
  if grep -q "^${key}=" "$CONFIG_FILE"; then
    awk -v k="$key" -v v="\"$escaped\"" '
      $0 ~ "^"k"=" { print k "=" v; next } { print }
    ' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
  else
    printf '%s="%s"\n' "$key" "$escaped" >> "$CONFIG_FILE"
  fi
}

load_config() {
  [ -f "$CONFIG_FILE" ] || die "缺少配置：cp config.env.example config.env 并填入真值"
  local k v
  for k in $ALL_KEYS; do
    v="$(config_get "$k")"
    export "$k=$v"
  done
}

site_host() {
  local url="${SITE_URL:-}"
  url="${url#https://}"
  url="${url#http://}"
  printf '%s' "${url%%/*}"
}

wrangler() {
  [ -x "$WRANGLER_BIN" ] || die "找不到 wrangler：先 pnpm install"
  (cd "$CLOUDFLARE_DIR" && "$WRANGLER_BIN" --config "$WRANGLER_CONFIG" "$@")
}

require_login() {
  # 只保留一个凭据：config.env 里的 CLOUDFLARE_API_TOKEN 优先，wrangler login 作为后备。
  if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
    local verify_url="https://api.cloudflare.com/client/v4/user/tokens/verify"
    case "$CLOUDFLARE_API_TOKEN" in
      cfat_*)
        [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] \
          || die "账号级 Token 需要 config.env 里的 CLOUDFLARE_ACCOUNT_ID"
        verify_url="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/tokens/verify"
        ;;
    esac
    local code
    code="$(curl -sS -o /dev/null -w '%{http_code}' \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      "$verify_url" 2>/dev/null || true)"
    [ "$code" = "200" ] \
      || die "CLOUDFLARE_API_TOKEN 无效或与账号不匹配（HTTP ${code:-无响应}）"
    return 0
  fi
  local who
  who="$(wrangler whoami 2>/dev/null)" || true
  printf '%s' "$who" | grep -qi "account" \
    || die "还没配置凭据：在 config.env 填 CLOUDFLARE_API_TOKEN，或 bash scripts/ops.sh login"
}

json_escape() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }
