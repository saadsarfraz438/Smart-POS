import { forwardRef } from 'react';
import Input from '../common/Input';
import { cleanText } from '../../utils/validators';

interface Props {
  value: string; onChange: (v: string) => void; onBlur: () => void;
  status: 'idle' | 'loading' | 'ok' | 'error'; error: string; tenantName?: string;
}

const TenantInput = forwardRef<HTMLInputElement, Props>(({ value, onChange, onBlur, status, error, tenantName }, ref) => (
  <div>
    <Input ref={ref} id="v-tenant" label="Store ID or domain" placeholder="TRD-8821" value={value} maxLength={30}
      autoComplete="off" autoCapitalize="characters" error={status === 'error' ? error : undefined}
      onChange={(e) => onChange(cleanText(e.target.value, 30))} onBlur={onBlur} />
    <p className="mt-1.5 min-h-[1.25rem] text-sm text-mute" role="status">
      {status === 'loading' && 'Checking store…'}
      {status === 'ok' && tenantName && <span className="font-semibold text-ok">{tenantName}</span>}
    </p>
  </div>
));
export default TenantInput;
