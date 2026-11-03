export default function SettingSwitch({ label, checked, onChange, description }) {
  return (
    <div className="form-check form-switch mb-3">
      <input className="form-check-input" type="checkbox" checked={checked} onChange={onChange} />
      <label className="form-check-label d-flex flex-column align-items-start">
        <span>{label}</span>
        {description ? <small className="text-muted text-break">{description}</small> : null}
      </label>
    </div>
  );
}
