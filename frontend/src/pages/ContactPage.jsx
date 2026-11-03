import { Link } from 'react-router-dom';
import { useTheme } from '../lib/voltaUtils.js';
import './login.css';

const CONTACTS = [
  { label: 'Email', text: 'saadsarfraz438@gmail.com', href: 'mailto:saadsarfraz438@gmail.com' },
  { label: 'Phone', text: '0326 2821390', href: 'tel:+923262821390' },
  { label: 'Website', text: 'saadpos.com', href: 'https://saadpos.com' },
  { label: 'X', text: '@saadsarfraz', href: 'https://x.com/saadsarfraz' },
  { label: 'Facebook', text: 'saadsarfraz', href: 'https://www.facebook.com/saadsarfraz' },
  { label: 'Instagram', text: 'saadsarfraz', href: 'https://www.instagram.com/saadsarfraz' },
  { label: 'YouTube', text: 'saadsarfraz23', href: 'https://www.youtube.com/@saadsarfraz23' },
];

const FEATURES = [
  'Role-based sign-in for owners, cashiers, inventory staff and admins',
  'Fast PIN entry with an onscreen numpad, plus barcode badge login',
  'Checkout, stock management and sales reports in one system',
  'Built for low-spec POS terminals and touchscreens',
];

export default function ContactPage() {
  const [theme, toggleTheme] = useTheme();
  return (
    <div className="v-shell v-contact-shell" data-theme={theme}>
      <div className="v-contact">
        <nav className="v-contact-nav">
          <Link className="v-link" to="/">← Back to sign in</Link>
          <button type="button" className="v-theme v-theme-inline" onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? '☀ Light' : '☾ Dark'}
          </button>
        </nav>

        <h1 className="v-contact-title">Volta</h1>
        <p className="v-contact-tag">Powering everyday sales</p>
        <p className="v-contact-desc">
          Volta is a point-of-sale system that keeps the counter moving. Cashiers sign in with a PIN or a
          badge scan and start ringing up sales in seconds, while owners and admins manage stock, staff
          and reports from the same platform.
        </p>
        <ul className="v-contact-list">
          {FEATURES.map((f) => <li key={f}>{f}</li>)}
        </ul>

        <h2 className="v-contact-sub">Contact us</h2>
        <div className="v-contact-grid">
          {CONTACTS.map((c) => (
            <a key={c.label} className="v-contact-item" href={c.href}
              target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
              <span>{c.label}</span>
              <strong>{c.text}</strong>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
