import './globals.css';
import { LangProvider } from '@/components/Lang.jsx';
import Header from '@/components/Header.jsx';
import { BUSINESS } from '@/lib/config.js';
import { DEVELOPER } from '@/lib/developer.js';

export const metadata = {
  title: 'Bersabeh Trading — Flight Requests & Tickets | Addis Ababa',
  description: 'Request a flight quote from Bersabeh Trading, Bole, Addis Ababa. Our agents find flights, confirm Telebirr/CBE payment and issue your e-ticket.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo-flag.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Noto+Sans+Ethiopic:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <LangProvider>
          <div className="stripe" aria-hidden="true" />
          <Header />
          <main className="main">{children}</main>
          <div className="stripe" aria-hidden="true" />
          <footer className="footer">
            <div className="in">
              <div><div className="foot-logo-row"><img className="foot-logo-img" src="/logo-flag.svg" alt="Bersabeh Trading airplane logo" /><span className="foot-brand">{BUSINESS.name}</span></div>{BUSINESS.tagline}<br />📍 {BUSINESS.address}</div>
              <div><b>Contact us</b><br />📞 {BUSINESS.phone}<br />💬 WhatsApp: {BUSINESS.whatsapp}<br />✉️ {BUSINESS.email}</div>
              <div><b>Payments we verify</b><br />Telebirr · CBE · Bank transfer · Cash at office<br /><b>Office hours:</b> {BUSINESS.hours}</div>
              <div className="dev-credit">
                <b>💻 Need a web app like this?</b><br />
                Developed by <span className="dev-name">{DEVELOPER.name}</span><br />
                {DEVELOPER.tagline}
                <div className="dev-links">
                  💬 <a href={DEVELOPER.whatsappHref} target="_blank" rel="noreferrer">WhatsApp: {DEVELOPER.phoneDisplay}</a><br />
                  📞 <a href={DEVELOPER.phoneHref}>Call: {DEVELOPER.phoneDisplay}</a><br />
                  ✉️ <a href={'mailto:' + DEVELOPER.email}>{DEVELOPER.email}</a><br />
                  ✈️ <a href={DEVELOPER.telegramHref} target="_blank" rel="noreferrer">Telegram: {DEVELOPER.telegramDisplay}</a>
                </div>
              </div>
            </div>
            <div className="foot-bottom">© {new Date().getFullYear()} {BUSINESS.name} · Website by <a href={DEVELOPER.whatsappHref} target="_blank" rel="noreferrer">{DEVELOPER.name}</a> — booking, shop &amp; business web apps</div>
          </footer>
        </LangProvider>
      </body>
    </html>
  );
}
