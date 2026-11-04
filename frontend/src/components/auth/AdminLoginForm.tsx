import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../common/Button';
import Input from '../common/Input';
import { cleanDigits, cleanText } from '../../utils/validators';

interface Props {
  idLabel: string; secretLabel: string; otpRequired: boolean; loading: boolean; locked: boolean;
  onSubmit: (username: string, secret: string, otp?: string) => Promise<void> | void;
}

/** Used for Admin / Owner, Inventory Staff and Online Fulfillment (username + password / API key). */
export default function AdminLoginForm({ idLabel, secretLabel, otpRequired, loading, locked, onSubmit }: Props) {
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const [otp, setOtp] = useState('');
  const [show, setShow] = useState(false);
  const blocked = loading || locked;

  const send = async () => {
    if (!username || !secret || blocked) return;
    await onSubmit(username, secret, otpRequired ? otp : undefined);
    setSecret(''); // NFR-2.3
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); void send(); }} noValidate autoComplete="off">
      <Input id="v-user" label={idLabel} value={username} autoComplete="username" maxLength={100}
        onChange={(e) => setUsername(cleanText(e.target.value, 100))} />
      <label className="v-label" htmlFor="v-pass">{secretLabel}</label>
      <div className="relative">
        <input id="v-pass" className="v-input pr-14" type={show ? 'text' : 'password'} value={secret} maxLength={128}
          autoComplete="current-password" onChange={(e) => setSecret(cleanText(e.target.value, 128))} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-0 top-0 h-12 w-12 text-mute">{show ? '🙈' : '👁'}</button>
      </div>
      {otpRequired && (
        <Input id="v-otp" label="One-time code" inputMode="numeric" maxLength={6} value={otp} autoComplete="one-time-code"
          onChange={(e) => setOtp(cleanDigits(e.target.value, 6))} />
      )}
      <div className="my-3"><Link className="v-link" to="/forgot-password">Forgot Password?</Link></div>
      <Button type="submit" disabled={blocked || !username || !secret || (otpRequired && otp.length !== 6)}>
        {loading ? 'Signing in…' : otpRequired ? 'Verify and sign in' : 'Sign in'}
      </Button>
    </form>
  );
}
