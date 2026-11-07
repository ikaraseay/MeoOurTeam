#!/usr/bin/env bash
# =============================================================================
# 运维脚本
#
#   bash scripts/ops.sh doctor        体检
#   bash scripts/ops.sh secrets       同步密钥到 Cloudflare
#   bash scripts/ops.sh config        配置管理
#   bash scripts/ops.sh env           写本地开发凭据
#   bash scripts/ops.sh deploy        构建并部署
#   bash scripts/ops.sh login         登录 Cloudflare
#   bash scripts/ops.sh init-db       初始化数据库
#   bash scripts/ops.sh seed          导入种子数据
#   bash scripts/ops.sh generate-seed 生成种子 JSON 文件
#   bash scripts/ops.sh export-data   导出 D1 数据为 JSON
#   bash scripts/ops.sh import-data   从 JSON 导入数据到 D1
# =============================================================================
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

usage() {
  sed -n '2,16p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit 0
}

PROBLEMS=0
check_one() {
  local label="$1" value="$2" pattern="$3" hint="$4"
  if printf '%s' "$label" | grep -qE 'SECRET|TOKEN|PASSWORD|KEY'; then
    if printf '%s' "$value" | grep -qE "$pattern"; then
      ok "$label 已设置（${#value} 字符）"
    else
      [ -n "$value" ] && warn "$label 格式不对" || warn "$label 未设置 → $hint"
      PROBLEMS=$((PROBLEMS + 1))
    fi
  else
    if printf '%s' "$value" | grep -qE "$pattern"; then
      ok "$label = ${value:0:32}"
    else
      [ -n "$value" ] && warn "$label 格式不对 → $hint" || warn "$label 未设置 → $hint"
      PROBLEMS=$((PROBLEMS + 1))
    fi
  fi
}

config_check() {
  PROBLEMS=0
  check_one "SITE_URL" "${SITE_URL:-}" '^https?://[^[:space:]]+$' '填站点地址'
  check_one "WORKER_NAME" "${WORKER_NAME:-}" '^[a-z0-9-]+$' '只能小写字母、数字、连字符'
  check_one "D1_DATABASE_NAME" "${D1_DATABASE_NAME:-}" '^[a-z0-9-]+$' '只能小写字母、数字、连字符'
  check_one "D1_DATABASE_ID" "${D1_DATABASE_ID:-}" '^[0-9a-f-]{36}$' '跑 pnpm wrangler d1 create ourteam-content'
  check_one "R2_BUCKET_NAME" "${R2_BUCKET_NAME:-}" '^[a-z0-9-]+$' '只能小写字母、数字、连字符'
  check_one "CLOUDFLARE_ACCOUNT_ID" "${CLOUDFLARE_ACCOUNT_ID:-}" '^[0-9a-f]{32}$' 'wrangler whoami'
  return 0
}

cmd_config() {
  local cmd="${1:-show}"
  shift || true
  case "$cmd" in
    show)
      step "当前配置"
      if [ -f "$CONFIG_FILE" ]; then
        grep -vE '^\s*#|^\s*$' "$CONFIG_FILE" \
          | sed -E 's/^([A-Z0-9_]*(SECRET|TOKEN|PASSWORD|KEY)[A-Z0-9_]*)=.*/\1=***/' \
          | sed 's/^/  /'
      else
        warn "还没有配置：cp config.env.example config.env"
      fi
      ;;
    check)
      load_config
      step "校验配置"
      config_check
      [ "$PROBLEMS" -eq 0 ] && ok "配置没问题" || { warn "有 $PROBLEMS 项需要注意"; exit 1; }
      ;;
    *)
      die "未知命令：$cmd"
      ;;
  esac
}

cmd_secrets() {
  load_config
  step "同步密钥到 Cloudflare Worker"
  require_login
  TMP_JSON="$(mktemp)"
  trap 'rm -f "$TMP_JSON"' EXIT
  {
    printf '{\n'
    first=1
    for k in $CF_KEYS; do
      v="$(config_get "$k")"
      [ -n "$v" ] || continue
      [ "$first" -eq 1 ] || printf ',\n'
      first=0
      printf '  "%s": "%s"' "$k" "$(json_escape "$v")"
    done
    printf '\n}\n'
  } > "$TMP_JSON"
  wrangler secret bulk "$TMP_JSON" 2>&1 | sed 's/^/  /'
  ok "已同步"
}

cmd_env() {
  load_config
  step "写本地开发凭据 → cloudflare/.dev.vars"
  {
    printf '# 由 ops.sh env 生成\n'
    printf 'ADMIN_PASSWORD_HASH=%s\n' "$ADMIN_PASSWORD_HASH"
    printf 'SESSION_SECRET=%s\n' "$SESSION_SECRET"
  } > "$DEV_VARS"
  ok "已写入 $DEV_VARS"
}

cmd_deploy() {
  load_config
  step "构建"
  (cd "$PROJECT_ROOT" && pnpm build 2>&1 | tail -10 | sed 's/^/  /')
  step "部署"
  (cd "$PROJECT_ROOT" && pnpm run deploy 2>&1 | tail -10 | sed 's/^/  /')
  ok "部署完成"
}

cmd_login() {
  step "登录 Cloudflare"
  wrangler login 2>&1 | sed 's/^/  /' || die "登录失败"
  ok "登录成功"
  wrangler whoami 2>&1 | sed 's/^/  /' || true
}

cmd_init_db() {
  load_config
  step "初始化 D1 数据库"
  note "创建数据库：${D1_DATABASE_NAME}"
  wrangler d1 create "$D1_DATABASE_NAME" 2>&1 | sed 's/^/  /' || true
  step "执行迁移"
  wrangler d1 execute "$D1_DATABASE_NAME" --remote --file=../backend/db/migrations/0001_admin.sql 2>&1 | sed 's/^/  /'
  wrangler d1 execute "$D1_DATABASE_NAME" --remote --file=../backend/db/migrations/0002_settings.sql 2>&1 | sed 's/^/  /'
  wrangler d1 execute "$D1_DATABASE_NAME" --remote --file=../backend/db/migrations/0003_members.sql 2>&1 | sed 's/^/  /'
  wrangler d1 execute "$D1_DATABASE_NAME" --remote --file=../backend/db/migrations/0004_research.sql 2>&1 | sed 's/^/  /'
  wrangler d1 execute "$D1_DATABASE_NAME" --remote --file=../backend/db/migrations/0005_projects.sql 2>&1 | sed 's/^/  /'
  wrangler d1 execute "$D1_DATABASE_NAME" --remote --file=../backend/db/migrations/0006_outcomes.sql 2>&1 | sed 's/^/  /'
  wrangler d1 execute "$D1_DATABASE_NAME" --remote --file=../backend/db/migrations/0007_news.sql 2>&1 | sed 's/^/  /'
  wrangler d1 execute "$D1_DATABASE_NAME" --remote --file=../backend/db/migrations/0008_texts.sql 2>&1 | sed 's/^/  /'
  wrangler d1 execute "$D1_DATABASE_NAME" --remote --file=../backend/db/migrations/0009_releases.sql 2>&1 | sed 's/^/  /'
  ok "数据库初始化完成"
  step "创建 R2 桶"
  wrangler r2 bucket create "$R2_BUCKET_NAME" 2>&1 | sed 's/^/  /' || true
  ok "R2 桶已创建"
}

cmd_seed() {
  load_config
  local flag="${1:-}"
  step "生成并导入种子数据"
  if [ "$flag" = "--local" ]; then
    node "$PROJECT_ROOT/backend/scripts/seed-data.mjs" --apply --local
  else
    require_login
    node "$PROJECT_ROOT/backend/scripts/seed-data.mjs" --apply
  fi
}

cmd_generate_seed() {
  step "生成种子 JSON 文件"
  node "$PROJECT_ROOT/backend/scripts/generate-seed-json.mjs"
  ok "种子文件已生成：backend/db/seeds/seed.json"
}

cmd_export_data() {
  load_config
  local flag="${1:-}"
  step "导出 D1 数据为 JSON"
  if [ "$flag" = "--local" ]; then
    node "$SCRIPTS_DIR/export-data.mjs" --local --pretty
  else
    require_login
    node "$SCRIPTS_DIR/export-data.mjs" --pretty
  fi
}

cmd_import_data() {
  load_config
  local file="${1:-}"
  local extra="${2:-}"
  [ -n "$file" ] || die "用法：bash scripts/ops.sh import-data <json-file> [--local]"
  [ -f "$file" ] || die "文件不存在：$file"
  step "从 JSON 导入数据到 D1"
  if [ "$extra" = "--local" ]; then
    node "$SCRIPTS_DIR/import-data.mjs" "$file" --local
  else
    require_login
    node "$SCRIPTS_DIR/import-data.mjs" "$file"
  fi
}

cmd_doctor() {
  load_config
  PASS=0; WARN=0; FAIL=0
  mark_ok()   { ok   "$*"; PASS=$((PASS + 1)); }
  mark_warn() { warn "$*"; WARN=$((WARN + 1)); }
  mark_fail() { err  "$*"; FAIL=$((FAIL + 1)); }

  step "工具链"
  command -v node >/dev/null 2>&1 && mark_ok "Node.js $(node -v)" || mark_fail "没有 Node.js"
  command -v pnpm >/dev/null 2>&1 && mark_ok "pnpm $(pnpm -v)" || mark_fail "没有 pnpm"
  [ -x "$WRANGLER_BIN" ] && mark_ok "wrangler 已安装" || mark_fail "没有 wrangler"

  step "依赖"
  [ -d "$PROJECT_ROOT/node_modules" ] && mark_ok "依赖已安装" || mark_fail "pnpm install"

  step "配置"
  [ -f "$CONFIG_FILE" ] && mark_ok "配置文件存在" || mark_fail "cp config.env.example config.env"
  config_check >/dev/null 2>&1 || true
  [ "$PROBLEMS" -eq 0 ] && mark_ok "配置项校验通过" || mark_warn "配置有问题"

  step "Cloudflare"
  if wrangler whoami 2>/dev/null | grep -qi "account"; then
    mark_ok "已登录"
  else
    mark_fail "未登录：bash scripts/ops.sh login"
  fi

  step "汇总"
  if [ "$FAIL" -gt 0 ]; then
    err "有 $FAIL 项阻断"
    exit 1
  fi
  ok "体检通过（$PASS 通过，$WARN 提醒）"
}

case "${1:-doctor}" in
  doctor)       cmd_doctor ;;
  secrets)      cmd_secrets ;;
  config)       shift; cmd_config "$@" ;;
  env)          cmd_env ;;
  deploy)       cmd_deploy ;;
  login)        cmd_login ;;
  init-db)      cmd_init_db ;;
  seed)         shift; cmd_seed "$@" ;;
  generate-seed) cmd_generate_seed ;;
  export-data)  shift; cmd_export_data "$@" ;;
  import-data)  shift; cmd_import_data "$@" ;;
  -h|--help)    usage ;;
  *)            die "未知命令：$1" ;;
esac
