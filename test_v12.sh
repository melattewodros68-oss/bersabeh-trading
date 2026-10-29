#!/usr/bin/env bash
cd /home/user/bersabeh-app-v1.2 || exit 1
cleanup(){ pkill -f "next start" 2>/dev/null; pkill -f "next-server" 2>/dev/null; }
trap cleanup EXIT
rm -f data/db.json
PORT=3000 npm start > app_v12.log 2>&1 &
for i in $(seq 1 60); do curl -sf -o /dev/null http://127.0.0.1:3000/ && break; sleep 2; done
curl -sf -o /dev/null http://127.0.0.1:3000/ || { echo APP-FAIL; tail -n 30 app_v12.log; exit 1; }
echo "== smoke =="
python3 smoke_test.py | tail -n 4
echo "== hero asset =="
curl -s -o /dev/null -w "hero.jpg HTTP %{http_code} %{size_download} bytes\n" http://127.0.0.1:3000/hero.jpg
echo "== change-email feature =="
python3 <<'PY'
import json, urllib.request, urllib.error, http.cookiejar
B='http://127.0.0.1:3000'
def opener(): return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(op,p,b):
    req=urllib.request.Request(B+p, data=json.dumps(b).encode(), headers={'Content-Type':'application/json'}, method='POST')
    try:
        with op.open(req,timeout=60) as r: return r.status,json.loads(r.read().decode() or '{}')
    except urllib.error.HTTPError as e: return e.code,json.loads(e.read().decode() or '{}')
adm=opener(); s,d=call(adm,'/api/auth/login',{"email":"admin@bersabeh.local","password":"Admin@2026!"}); print('admin login',s)
s,d=call(adm,'/api/admin/users',{"fullName":"Handover Test","email":"mine@example.et","password":"TempPass@2026","role":"AGENT"}); uid=d['user']['id']; print('create my-email user',s)
s,d=call(adm,'/api/admin/users/action',{"userId":uid,"action":"changeEmail","newEmail":"friend@example.et"}); print('changeEmail',s,d.get('message'))
s1,_=call(opener(),'/api/auth/login',{"email":"mine@example.et","password":"TempPass@2026"}); print('old email login (expect 401):',s1)
s2,d2=call(opener(),'/api/auth/login',{"email":"friend@example.et","password":"TempPass@2026"}); print('new email login (expect 200):',s2,d2.get('user',{}).get('email'))
assert s==200 and s1==401 and s2==200
print('CHANGE-EMAIL PASS')
PY
