#!/usr/bin/env bash
# 변경된 서비스만 골라서 Docker Hub(yyubin/)에 빌드+푸시
# 사용법:
#   ./scripts/docker-push.sh              # git diff로 자동 감지
#   ./scripts/docker-push.sh bff          # bff만 강제 빌드
#   ./scripts/docker-push.sh bff webapp   # 여러 서비스 지정
#   TAG=v1.2.3 ./scripts/docker-push.sh  # 태그 지정 (기본 :dev)

set -euo pipefail

HUB_USER="yyubin"
TAG="${TAG:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

declare -A SERVICES=(
  [bff]="bff/Dockerfile"
  [webapp]="webapp/Dockerfile"
  [admin]="admin/Dockerfile"
)

# 변경 감지: 인자 없으면 git diff로 자동 판별
detect_changed() {
  local changed
  if git -C "$ROOT" rev-parse HEAD~1 &>/dev/null; then
    changed=$(git -C "$ROOT" diff --name-only HEAD~1 HEAD)
  else
    changed=$(git -C "$ROOT" diff --name-only HEAD)
  fi

  local result=()
  echo "$changed" | grep -qE '^(bff|shared)/'    && result+=(bff)
  echo "$changed" | grep -qE '^(webapp|shared)/'  && result+=(webapp)
  echo "$changed" | grep -qE '^(admin|shared)/'   && result+=(admin)
  echo "${result[@]:-}"
}

build_and_push() {
  local svc="$1"
  local dockerfile="${SERVICES[$svc]}"
  local image="$HUB_USER/candle-$svc:$TAG"

  echo "▶ Building $image ..."
  docker build -f "$dockerfile" -t "$image" "$ROOT"
  echo "▶ Pushing $image ..."
  docker push "$image"
  echo "✓ $image pushed"
}

# 대상 서비스 목록 결정
if [[ $# -gt 0 ]]; then
  targets=("$@")
else
  mapfile -t targets < <(detect_changed | tr ' ' '\n' | grep -v '^$')
fi

if [[ ${#targets[@]} -eq 0 ]]; then
  echo "변경된 서비스 없음 — 빌드 스킵"
  exit 0
fi

echo "대상: ${targets[*]} (tag: $TAG)"
for svc in "${targets[@]}"; do
  if [[ -z "${SERVICES[$svc]+_}" ]]; then
    echo "알 수 없는 서비스: $svc (bff | webapp | admin)" >&2
    exit 1
  fi
  build_and_push "$svc"
done

echo "완료"
