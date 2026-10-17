#!/usr/bin/env bash
# Review the official packets through the running app (npm run dev), two at a time.
# Usage: bash scripts/run-all.sh [R01 R02 ...]   (default: all 11)
BASE=${BASE:-http://localhost:3000}
packets=("$@"); [ ${#packets[@]} -eq 0 ] && packets=(R01 R02 R03 R04 R05 R06 R07 R08 R09 R10 R11)

one() {
  id=$(curl -s -X POST "$BASE/api/cases" -H 'content-type: application/json' -d "{\"packet\":\"$1\"}" | node -p "JSON.parse(require('fs').readFileSync(0)).id")
  until s=$(curl -s "$BASE/api/cases/$id" | node -p "JSON.parse(require('fs').readFileSync(0)).status"); [ "$s" = reviewed ] || [ "$s" = error ]; do sleep 5; done
  echo "$1 $id $s"
}

for ((i = 0; i < ${#packets[@]}; i += 2)); do
  one "${packets[i]}" &
  [ -n "${packets[i+1]}" ] && one "${packets[i+1]}" &
  wait
done
