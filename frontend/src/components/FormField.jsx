export default function FormField({ label, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className="form-label">{label}</label>
      {children}
      {hint ? <small className="text-muted d-block mt-1">{hint}</small> : null}
    </div>
  );
}