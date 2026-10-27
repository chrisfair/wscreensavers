#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

COV_DIR="${ROOT_DIR}/coverage"
mkdir -p "${COV_DIR}/frontend"

echo "==> [1/2] Running Go backend unit tests with coverage..."
go test -coverprofile="${COV_DIR}/backend.cov" -covermode=atomic ./internal/...
cp -f "${COV_DIR}/backend.cov" "${ROOT_DIR}/coverage.out"

BACKEND_PCT=$(go tool cover -func="${COV_DIR}/backend.cov" | tail -n 1 | awk '{gsub(/%/, "", $3); print $3}')

echo ""
echo "==> [2/2] Running Vue 3 frontend unit tests with coverage..."
if [ ! -x "${ROOT_DIR}/frontend/node_modules/.bin/vitest" ]; then
  npm --prefix "${ROOT_DIR}/frontend" install --no-audit --no-fund
fi
npm --prefix "${ROOT_DIR}/frontend" run test

FRONTEND_SUMMARY="${COV_DIR}/frontend/coverage-summary.json"
read -r FRONTEND_STMTS_PCT FRONTEND_LINES_PCT OVERALL_PCT < <(
  node -e '
    const fs = require("fs");
    const summary = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const stmts = Number(summary.total.statements.pct || 0);
    const lines = Number(summary.total.lines.pct || 0);
    const backend = Number(process.argv[2] || 0);
    const overall = ((backend + stmts) / 2).toFixed(2);
    console.log(`${stmts.toFixed(2)} ${lines.toFixed(2)} ${overall}`);
  ' "${FRONTEND_SUMMARY}" "${BACKEND_PCT}"
)

cat > "${COV_DIR}/summary.json" <<EOF
{
  "backendStatementsPct": ${BACKEND_PCT},
  "frontendStatementsPct": ${FRONTEND_STMTS_PCT},
  "frontendLinesPct": ${FRONTEND_LINES_PCT},
  "overallCoveragePct": ${OVERALL_PCT},
  "thresholdPct": 75.0,
  "reports": {
    "backendCoverprofile": "coverage/backend.cov",
    "frontendLcov": "coverage/frontend/lcov.info",
    "frontendSummaryJson": "coverage/frontend/coverage-summary.json"
  }
}
EOF

cat > "${COV_DIR}/summary.md" <<EOF
## WScreenSavers Test Coverage Report

| Component | Coverage | Threshold | Report Artifact |
| :--- | :--- | :--- | :--- |
| **Go Backend** (\`./internal/...\`) | **${BACKEND_PCT}%** | >= 75.0% | \`coverage/backend.cov\` |
| **Vue 3 Frontend** (\`frontend/src\`) | **${FRONTEND_STMTS_PCT}%** (Lines: **${FRONTEND_LINES_PCT}%**) | >= 75.0% | \`coverage/frontend/lcov.info\` |
| **Combined Overall** | **${OVERALL_PCT}%** | **>= 75.0%** | \`coverage/summary.json\` |
EOF

if [ -n "${GITHUB_STEP_SUMMARY:-}" ] && [ -w "${GITHUB_STEP_SUMMARY}" ]; then
  cat "${COV_DIR}/summary.md" >> "${GITHUB_STEP_SUMMARY}"
fi

echo ""
echo "=========================================================="
echo "  Backend Coverage  : ${BACKEND_PCT}% (coverage/backend.cov)"
echo "  Frontend Coverage : ${FRONTEND_STMTS_PCT}% stmts / ${FRONTEND_LINES_PCT}% lines (coverage/frontend/lcov.info)"
echo "  Overall Coverage  : ${OVERALL_PCT}% (coverage/summary.json)"
echo "=========================================================="

node -e '
  const [backend, frontend, overall] = process.argv.slice(1).map(Number);
  if (backend < 75 || frontend < 75 || overall < 75) {
    console.error(`Coverage below 75% threshold (backend=${backend}%, frontend=${frontend}%, overall=${overall}%)`);
    process.exit(1);
  }
' "${BACKEND_PCT}" "${FRONTEND_STMTS_PCT}" "${OVERALL_PCT}"
