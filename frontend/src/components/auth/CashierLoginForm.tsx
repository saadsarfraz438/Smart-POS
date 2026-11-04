import { useState } from 'react';
import Numpad from './Numpad';
import Button from '../common/Button';
import { useNumpad } from '../../hooks/useNumpad';
import type { Cashier } from '../../types/auth.types';
import { validPin } from '../../utils/validators';

interface Props {
  cashiers: Cashier[]; loading: boolean; locked: boolean;
  onSubmit: (username: string, pin: string) => Promise<void> | void;
}

export default function CashierLoginForm({ cashiers, loading, locked, onSubmit }: Props) {
  const [username, setUsername] = useState('');
  const blocked = loading || locked;

  const send = async (pin: string) => {
    if (!username || !validPin(pin) || blocked) return;
    await onSubmit(username, pin);
    reset(); // NFR-2.3: drop the PIN from state straight away
  };
  const { value: pin, press, reset } = useNumpad(6, !blocked, send); // auto-submits at 6 digits

  return (
    <form onSubmit={(e) => { e.preventDefault(); void send(pin); }} noValidate>
      <label className="v-label" htmlFor="v-cashier">Cashier</label>
      <select id="v-cashier" className="v-input" value={username} onChange={(e) => setUsername(e.target.value)}>
        <option value="">Select your name</option>
        {cashiers.map((c) => <option key={c.id} value={c.username}>{c.displayName}</option>)}
      </select>

      <label className="v-label" htmlFor="v-pin">PIN (4 to 6 digits)</label>
      <input id="v-pin" className="v-input text-center text-2xl tracking-[0.6em]" type="password" readOnly inputMode="none"
        value={pin} placeholder="••••" aria-live="polite" />

      <Numpad onPress={press} disabled={blocked} />
      <Button type="submit" disabled={blocked || !username || !validPin(pin)}>{loading ? 'Signing in…' : 'Sign in'}</Button>
    </form>
  );
}
