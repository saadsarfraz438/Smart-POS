export default function Footer({ className = '', compact = false }) {
  const year = new Date().getFullYear();

  return (
    <footer className= {`app-footer ${compact ? 'app-footer-compact' : ''} ${className}`.trim()}>
      <div className="app-footer-brand">
        <div>
        </div>
      </div>
      <div className="app-footer-meta">
      <td>  <small>© {year} Lumensoft.Built for daily point-of-sale operations.</small></td>
       <small>This Project is Demo For Commercial use contact saadsarfraz.se@gmail.com.</small>
       </div>
    </footer>
  );
}