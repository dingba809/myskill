#!/usr/bin/env bash
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TARGET="auto"
DEST=""
MODE="symlink"
FORCE=0
DRY_RUN=0
LIST_ONLY=0

declare -a REQUESTED_SKILLS=()
declare -a SKILL_NAMES=()
declare -a SKILL_SOURCES=()

usage() {
  cat <<'EOF'
用法:
  ./scripts/install-skills.sh [选项] [skill_name ...]

说明:
  - 不传 skill_name 时，安装仓库中发现的全部 skill
  - 默认使用软链接安装（便于后续更新）
  - skill 来源会扫描：
    1) 仓库根目录下包含 SKILL.md 的一级目录
    2) .codex/skills 下包含 SKILL.md 的目录（同名时以根目录为准）

选项:
  --list                      仅列出可安装 skill
  --target auto|codex|claude  目标类型（默认: auto）
  --dest <path>               自定义安装目录（优先级高于 --target）
  --mode symlink|copy         安装方式（默认: symlink）
  --force                     覆盖目标目录已存在的同名 skill
  --dry-run                   仅预览将执行的操作，不写入磁盘
  -h, --help                  显示帮助

示例:
  ./scripts/install-skills.sh --list
  ./scripts/install-skills.sh
  ./scripts/install-skills.sh smartdns-config sing-box-config
  ./scripts/install-skills.sh --target claude --mode copy --force 12306
  ./scripts/install-skills.sh --dry-run china-hotel-comparison
EOF
}

expand_home_path() {
  local path="$1"
  if [[ "$path" == "~" ]]; then
    printf '%s\n' "$HOME"
    return
  fi
  if [[ "$path" == "~/"* ]]; then
    printf '%s\n' "$HOME/${path#~/}"
    return
  fi
  printf '%s\n' "$path"
}

contains_skill_name() {
  local target_name="$1"
  local existing
  for existing in "${SKILL_NAMES[@]}"; do
    if [[ "$existing" == "$target_name" ]]; then
      return 0
    fi
  done
  return 1
}

add_skill_source() {
  local skill_name="$1"
  local skill_path="$2"
  if contains_skill_name "$skill_name"; then
    return
  fi
  SKILL_NAMES+=("$skill_name")
  SKILL_SOURCES+=("$skill_path")
}

discover_skills() {
  local dir
  local name

  for dir in "$REPO_ROOT"/*; do
    [[ -d "$dir" ]] || continue
    name="$(basename "$dir")"
    case "$name" in
      scripts|node_modules)
        continue
        ;;
    esac
    if [[ -f "$dir/SKILL.md" ]]; then
      add_skill_source "$name" "$dir"
    fi
  done

  if [[ -d "$REPO_ROOT/.codex/skills" ]]; then
    for dir in "$REPO_ROOT/.codex/skills"/*; do
      [[ -d "$dir" ]] || continue
      name="$(basename "$dir")"
      if [[ -f "$dir/SKILL.md" ]]; then
        add_skill_source "$name" "$dir"
      fi
    done
  fi
}

find_skill_source() {
  local skill_name="$1"
  local i
  for i in "${!SKILL_NAMES[@]}"; do
    if [[ "${SKILL_NAMES[$i]}" == "$skill_name" ]]; then
      printf '%s\n' "${SKILL_SOURCES[$i]}"
      return 0
    fi
  done
  return 1
}

run_action() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    printf '\n'
    return 0
  fi
  "$@"
}

resolve_destination() {
  if [[ -n "$DEST" ]]; then
    DEST="$(expand_home_path "$DEST")"
    return
  fi

  case "$TARGET" in
    auto)
      if [[ -d "$HOME/.codex" || -d "$HOME/.codex/skills" ]]; then
        TARGET="codex"
        DEST="$HOME/.codex/skills"
      elif [[ -d "$HOME/.claude" || -d "$HOME/.claude/skills" ]]; then
        TARGET="claude"
        DEST="$HOME/.claude/skills"
      else
        TARGET="codex"
        DEST="$HOME/.codex/skills"
      fi
      ;;
    codex)
      DEST="$HOME/.codex/skills"
      ;;
    claude)
      DEST="$HOME/.claude/skills"
      ;;
    *)
      echo "错误: --target 仅支持 auto|codex|claude，收到: $TARGET" >&2
      exit 1
      ;;
  esac
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      [[ $# -ge 2 ]] || {
        echo "错误: --target 需要参数" >&2
        exit 1
      }
      TARGET="$2"
      shift 2
      ;;
    --target=*)
      TARGET="${1#*=}"
      shift
      ;;
    --dest)
      [[ $# -ge 2 ]] || {
        echo "错误: --dest 需要参数" >&2
        exit 1
      }
      DEST="$2"
      shift 2
      ;;
    --dest=*)
      DEST="${1#*=}"
      shift
      ;;
    --mode)
      [[ $# -ge 2 ]] || {
        echo "错误: --mode 需要参数" >&2
        exit 1
      }
      MODE="$2"
      shift 2
      ;;
    --mode=*)
      MODE="${1#*=}"
      shift
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --list)
      LIST_ONLY=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      while [[ $# -gt 0 ]]; do
        REQUESTED_SKILLS+=("$1")
        shift
      done
      ;;
    -*)
      echo "错误: 未知选项 $1" >&2
      usage
      exit 1
      ;;
    *)
      REQUESTED_SKILLS+=("$1")
      shift
      ;;
  esac
done

case "$MODE" in
  symlink|copy)
    ;;
  *)
    echo "错误: --mode 仅支持 symlink|copy，收到: $MODE" >&2
    exit 1
    ;;
esac

discover_skills

if [[ "${#SKILL_NAMES[@]}" -eq 0 ]]; then
  echo "未发现可安装的 skill（未找到 SKILL.md）" >&2
  exit 1
fi

if [[ "$LIST_ONLY" -eq 1 ]]; then
  echo "可安装的 skill："
  local_i=0
  for local_i in "${!SKILL_NAMES[@]}"; do
    echo "- ${SKILL_NAMES[$local_i]} (${SKILL_SOURCES[$local_i]})"
  done
  exit 0
fi

if [[ "${#REQUESTED_SKILLS[@]}" -eq 0 ]]; then
  REQUESTED_SKILLS=("${SKILL_NAMES[@]}")
fi

resolve_destination

echo "安装目标: $DEST (target=$TARGET, mode=$MODE)"
run_action mkdir -p "$DEST"

INSTALLED=0
SKIPPED=0
FAILED=0

for skill_name in "${REQUESTED_SKILLS[@]}"; do
  if ! source_path="$(find_skill_source "$skill_name")"; then
    echo "未找到 skill: $skill_name" >&2
    FAILED=$((FAILED + 1))
    continue
  fi

  target_path="$DEST/$skill_name"

  if [[ -e "$target_path" || -L "$target_path" ]]; then
    if [[ "$FORCE" -eq 1 ]]; then
      if ! run_action rm -rf "$target_path"; then
        echo "覆盖失败: $target_path" >&2
        FAILED=$((FAILED + 1))
        continue
      fi
    else
      echo "跳过 $skill_name：$target_path 已存在（使用 --force 覆盖）"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi
  fi

  if [[ "$MODE" == "symlink" ]]; then
    if ! run_action ln -s "$source_path" "$target_path"; then
      echo "安装失败: $skill_name (symlink)" >&2
      FAILED=$((FAILED + 1))
      continue
    fi
  else
    if ! run_action cp -R "$source_path" "$target_path"; then
      echo "安装失败: $skill_name (copy)" >&2
      FAILED=$((FAILED + 1))
      continue
    fi
  fi

  echo "已安装: $skill_name -> $target_path"
  INSTALLED=$((INSTALLED + 1))
done

echo
echo "完成：成功 ${INSTALLED}，跳过 ${SKIPPED}，失败 ${FAILED}"

if [[ "$FAILED" -gt 0 ]]; then
  exit 1
fi
