import json, urllib.request, urllib.error, http.cookiejar
BASE='http://127.0.0.1:3000'
def call(path, body=None, opener=None, method=None):
    data=json.dumps(body).encode() if body is not None else None
    req=urllib.request.Request(BASE+path, data=data, headers={'Content-Type':'application/json'}, method=method or ('POST' if body is not None else 'GET'))
    op=opener or urllib.request.build_opener()
    try:
        with op.open(req, timeout=60) as r: return r.status, json.loads(r.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode() or '{}')
        except: return e.code, {}

ok=[]
def check(name, cond, extra=''):
    ok.append(cond); print(('PASS' if cond else 'FAIL'), name, extra)

# 1 create booking
s,d=call('/api/public/bookings',{"contact":{"name":"Smoke Test","phone":"+251911000000","email":"smoke@example.et"},"trip":{"type":"return","from":"ADD — Addis Ababa Bole (ADD)","to":"DXB — Dubai (DXB)","departDate":"2026-12-15","returnDate":"2026-12-22","cabin":"Economy","notes":"smoke"},"passengers":[{"fullName":"Test Passenger","type":"ADULT","gender":"Female","nationality":"Ethiopian","passportNo":"EP1234567","dob":"1995-01-01","passportExpiry":"2030-01-01"}],"language":"en"})
check('create booking', s==201 and d.get('ref','').startswith('BTB-'), str(d))
ref=d.get('ref'); email='smoke@example.et'
# 2 track
s,d=call('/api/public/track',{"ref":ref,"email":email}); check('track NEW', s==200 and d['booking']['status']=='NEW')
check('passport masked in public view', d['booking']['passengers'][0]['passportNo']=='***567', d['booking']['passengers'][0]['passportNo'])
# 3 unauth staff access blocked
s,_=call('/api/staff/bookings'); check('staff API blocked without login', s==401, str(s))
s,_=call('/api/admin/stats'); check('admin API blocked without login', s==401, str(s))
# 4 login agent
cj=http.cookiejar.CookieJar(); agent=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
s,d=call('/api/auth/login',{"email":"agent@bersabeh.local","password":"Agent@2026!"},opener=agent); check('agent login', s==200 and d['user']['role']=='AGENT')
# 5 agent cannot see admin stats
s,_=call('/api/admin/stats',opener=agent,method='GET'); check('agent forbidden from admin stats', s==403, str(s))
# 6 find booking in new queue
s,d=call('/api/staff/bookings?scope=new',opener=agent,method='GET')
bk=[b for b in d.get('bookings',[]) if b['ref']==ref]; check('booking in new queue', len(bk)==1)
bid=bk[0]['id'] if bk else None
def act(action, **kw):
    body={'action':action}; body.update(kw); return call(f'/api/staff/bookings/{bid}/action',body,opener=agent)
# 7 illegal transition: addFlight before assign must fail
s,d=act('addFlight', flight={"airline":"ET","flightNo":"ET308","from":"ADD","to":"DXB","departDate":"2026-12-15","priceTotal":45000,"currency":"ETB"})
check('state machine blocks addFlight on NEW', s==400, str(d.get('message')))
# 8 assign, add flight, send quote
s,d=act('assign'); check('assign -> UNDER_REVIEW', s==200 and d['booking']['status']=='UNDER_REVIEW')
s,d=act('addFlight', flight={"airline":"Ethiopian Airlines","flightNo":"ET308","from":"ADD — Addis Ababa Bole (ADD)","to":"DXB — Dubai (DXB)","departDate":"2026-12-15","departTime":"10:15","arriveDate":"2026-12-15","arriveTime":"15:40","baggage":"2x23kg","stopover":"Direct","fareClass":"Economy","priceTotal":45000,"currency":"ETB","deadline":"10 Dec 18:00"})
check('add flight', s==200 and len(d['booking']['flights'])==1, str(d.get('message','')))
s,d=act('sendQuote', note='smoke quote'); check('send quote -> QUOTED', s==200 and d['booking']['status']=='QUOTED')
# 9 customer approve + claim payment
s,d=call('/api/public/action',{"ref":ref,"email":email,"action":"approve"}); check('customer approve -> AWAITING_PAYMENT', s==200 and d['booking']['status']=='AWAITING_PAYMENT')
s,d=call('/api/public/action',{"ref":ref,"email":email,"action":"claimPayment","method":"Telebirr","amount":45000,"currency":"ETB","txnRef":"SMOKE-TXN-001"})
check('customer claim payment', s==200 and d['booking']['payments'][0]['status']=='CLAIMED')
# 10 issue blocked before confirm
s,d=act('issueTicket', pnr='XK7P2Q', ticketNumbers=[{"ticketNo":"071-1234567890"}]); check('issue blocked until CONFIRMED', s==400)
# 11 agent confirms claimed payment
s,d=call(f'/api/staff/bookings/{bid}',opener=agent,method='GET'); payid=d['booking']['payments'][0]['id']
s,d=act('confirmPayment', paymentId=payid); check('confirm payment -> CONFIRMED (fully paid)', s==200 and d['booking']['status']=='CONFIRMED', str(d.get('booking',{}).get('status')))
# 12 issue ticket
s,d=act('issueTicket', pnr='XK7P2Q', ticketNumbers=[{"ticketNo":"071-1234567890"}]); check('issue ticket -> ISSUED', s==200 and d['booking']['status']=='ISSUED')
# 13 customer sees ticket
s,d=call('/api/public/track',{"ref":ref,"email":email}); check('customer sees PNR + ticket no', s==200 and d['booking']['ticket']['pnr']=='XK7P2Q' and d['booking']['ticket']['numbers'][0]['ticketNo']=='071-1234567890')
# 14 homepage loads
req=urllib.request.Request(BASE+'/')
with urllib.request.urlopen(req, timeout=60) as r: html=r.read().decode()
check('homepage HTML serves', 'Bersabeh' in html)
print('REF', ref)
print('TOTAL', sum(ok), '/', len(ok))
raise SystemExit(0 if all(ok) else 1)
