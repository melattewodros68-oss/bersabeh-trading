import './globals.css';
import { LangProvider } from '@/components/Lang.jsx';
import Header from '@/components/Header.jsx';
import { BUSINESS } from '@/lib/config.js';

export const metadata = {
  title: 'Bersabeh Trading — Flight Requests & Tickets | Addis Ababa',
  description: 'Request a flight quote from Bersabeh Trading, Bole, Addis Ababa. Our agents find flights, confirm Telebirr/CBE payment and issue your e-ticket.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+Ethiopic:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <LangProvider>
          <Header />
          <main className="main">{children}</main>
          <footer className="footer">
            <div className="in">
              <div><b>{BUSINESS.name}</b><br />{BUSINESS.tagline}<br />{BUSINESS.address}</div>
              <div><b>Contact</b><br />📞 {BUSINESS.phone}<br />✉️ {BUSINESS.email}</div>
              <div><b>Office hours</b><br />{BUSINESS.hours}<br />WhatsApp: {BUSINESS.whatsapp}</div>
            </div>
          </footer>
        </LangProvider>
      </body>
    </html>
  );
}
