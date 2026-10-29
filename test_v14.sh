#!/usr/bin/env bash
cd /home/user/bersabeh-app-v1.4 || exit 1
cleanup(){ pkill -f "next start" 2>/dev/null; pkill -f "next-server" 2>/dev/null; }
trap cleanup EXIT
rm -f data/db.json
PORT=3000 npm start > app_v14.log 2>&1 &
for i in $(seq 1 60); do curl -sf -o /dev/null http://127.0.0.1:3000/ && break; sleep 2; done
curl -sf -o /dev/null http://127.0.0.1:3000/ || { echo APP-FAIL; tail -n 30 app_v14.log; exit 1; }
python3 smoke_test.py | tail -n 3
curl -s -o /dev/null -w "logo-flag.svg HTTP %{http_code} %{size_download}B\n" http://127.0.0.1:3000/logo-flag.svg
curl -s -o /dev/null -w "hero-et.jpg HTTP %{http_code} %{size_download}B\n" http://127.0.0.1:3000/hero-et.jpg
HTML=$(curl -s http://127.0.0.1:3000/)
echo "$HTML" | grep -q "hero-et.jpg" && echo "HOME: Ethiopian plane hero FOUND" || echo "HERO MISSING"
echo "$HTML" | grep -q "hero-flag-badge" && echo "HOME: flag badge FOUND" || echo "FLAG BADGE MISSING"
echo "$HTML" | grep -q "logo-flag.svg" && echo "HEADER: flag emblem FOUND" || echo "FLAG LOGO MISSING"
grep -rq "Staff menu" .next/static/chunks && echo "BUNDLE: hamburger Staff menu FOUND" || echo "MENU MISSING IN BUNDLE"
grep -q "bt-scope" src/components/Header.jsx && grep -q "bt-scope" src/app/staff/page.js && echo "QUEUE LINKS WIRED OK"
