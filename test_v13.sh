#!/usr/bin/env bash
cd /home/user/bersabeh-app-v1.3 || exit 1
cleanup(){ pkill -f "next start" 2>/dev/null; pkill -f "next-server" 2>/dev/null; }
trap cleanup EXIT
rm -f data/db.json
PORT=3000 npm start > app_v13.log 2>&1 &
for i in $(seq 1 60); do curl -sf -o /dev/null http://127.0.0.1:3000/ && break; sleep 2; done
curl -sf -o /dev/null http://127.0.0.1:3000/ || { echo APP-FAIL; tail -n 30 app_v13.log; exit 1; }
python3 smoke_test.py | tail -n 3
curl -s -o /dev/null -w "logo-plane.png HTTP %{http_code} %{size_download} bytes\n" http://127.0.0.1:3000/logo-plane.png
HTML=$(curl -s http://127.0.0.1:3000/)
echo "$HTML" | grep -q "LuBella Technology" && echo "FOOTER CREDIT: LuBella Technology FOUND" || echo "FOOTER CREDIT MISSING"
echo "$HTML" | grep -q "wa.me/251967942524" && echo "WHATSAPP LINK FOUND" || echo "WHATSAPP LINK MISSING"
echo "$HTML" | grep -q "t.me/sintayehu12121" && echo "TELEGRAM LINK FOUND" || echo "TELEGRAM LINK MISSING"
echo "$HTML" | grep -q "logo-img" && echo "HEADER LOGO IMG FOUND" || echo "HEADER LOGO MISSING"
