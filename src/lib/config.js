// ===== EDIT THESE WITH YOUR REAL BUSINESS DETAILS BEFORE LAUNCH =====
export const BUSINESS = {
  name: 'Bersabeh Trading PLC',
  tagline: 'Flight ticket office — Addis Ababa',
  phone: '+251 911248033',
  whatsapp: '+251911248033',
  email: 'bersabehtradingplc@gmail.com',
  address: 'Kazanchis,Zema Bld. 3rd floor Addis Ababa, Ethiopia',
  hours: 'Mon–Sat 2:30–11:00 local time',
  // Shown to the customer at payment stage. Replace with real accounts.
  paymentAccounts: [
    { method: 'Telebirr', label: 'Telebirr — Bersabeh Trading', detail: '0911248033 (edit in src/lib/config.js)' },
    { method: 'CBE', label: 'Awash Bank — Bersabeh Trading plc', detail: '01204436947300 (edit in src/lib/config.js)' },
    { method: 'Bank Transfer', label: 'Other bank transfer / cash at office', detail: 'Call or WhatsApp us and keep your receipt' },
  ],
  currencies: ['ETB', 'USD', 'EUR', 'GBP', 'AED'],
  paymentMethods: ['Telebirr', 'CBE', 'Bank Transfer', 'Cash', 'Card', 'Other'],
  airports: [
    'ADD — Addis Ababa Bole (ADD)', 'AXU — Axum (AXU)', 'BJR — Bahir Dar (BJR)', 'DIR — Dire Dawa (DIR)',
    'GDQ — Gondar (GDQ)', 'GMB — Gambella (GMB)', 'JIJ — Jijiga (JIJ)', 'JIM — Jimma (JIM)',
    'LLI — Lalibela (LLI)', 'MQX — Mekelle (MQX)', 'ASO — Asosa (ASO)', 'ABK — Kabri Dar (ABK)',
    'DXB — Dubai (DXB)', 'DOH — Doha (DOH)', 'IST — Istanbul (IST)', 'LHR — London Heathrow (LHR)',
    'FRA — Frankfurt (FRA)', 'JFK — New York JFK (JFK)', 'IAD — Washington Dulles (IAD)',
    'NBO — Nairobi (NBO)', 'CAI — Cairo (CAI)', 'JED — Jeddah (JED)', 'RUH — Riyadh (RUH)',
    'BEY — Beirut (BEY)', 'TLV — Tel Aviv (TLV)', 'DEL — Delhi (DEL)', 'BOM — Mumbai (BOM)',
    'CAN — Guangzhou (CAN)', 'PEK — Beijing (PEK)', 'YYZ — Toronto (YYZ)', 'AMS — Amsterdam (AMS)',
  ],
};
