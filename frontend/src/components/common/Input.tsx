import { forwardRef, type InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

const Input = forwardRef<HTMLInputElement, Props>(({ label, error, id, className = '', ...p }, ref) => (
  <>
    <label className="v-label" htmlFor={id}>{label}</label>
    <input ref={ref} id={id} className={`v-input ${className}`} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...p} />
    {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm font-semibold text-err">{error}</p>}
  </>
));
export default Input;
