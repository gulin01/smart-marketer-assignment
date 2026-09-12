#!/usr/bin/env bash
# 새 피쳐의 스펙 디렉터리를 만든다.
#   .specify/scripts/new-feature.sh template-editor LF-12
set -euo pipefail

slug="${1:?usage: new-feature.sh <slug> [ticket]}"
ticket="${2:-LF-nn}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# 다음 번호는 기존 디렉터리에서 이어받는다.
next=$(printf "%03d" $(( $(ls "$root/specs" 2>/dev/null | grep -cE '^[0-9]{3}-') + 1 )))
dir="$root/specs/$next-$slug"

if [ -d "$dir" ]; then
  echo "이미 존재합니다: $dir" >&2
  exit 1
fi

mkdir -p "$dir"
for kind in spec plan tasks; do
  sed -e "s/^# NNN/# $next/" \
      -e "s/\`LF-nn\`/\`$ticket\`/" \
      -e "s/{피쳐 이름}/$slug/" \
      -e "s/YYYY-MM-DD/$(date +%F)/" \
      "$root/.specify/templates/$kind-template.md" > "$dir/$kind.md"
done

echo "생성됨: specs/$next-$slug/"
echo "  브랜치: git switch -c $ticket"
echo "  커밋 제목 접두사: $next/$ticket"
