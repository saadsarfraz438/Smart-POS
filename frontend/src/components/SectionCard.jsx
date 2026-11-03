export default function SectionCard({ title, children, footer, className = '' }) {
  return (
    <div className={`card shadow-sm border-0 panel-card ${className}`.trim()}>
      <div className="card-body">
        {title ? <h5 className="mb-3">{title}</h5> : null}
        {children}
      </div>
      {footer ? <div className="card-footer bg-transparent border-0 pt-0">{footer}</div> : null}
    </div>
  );
}
