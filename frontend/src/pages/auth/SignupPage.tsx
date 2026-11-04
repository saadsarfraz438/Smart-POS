import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { signupApi } from '../../services/api/signupApi';

export default function SignupPage() {
  const [signup, { isLoading, data, error }] = signupApi.useSignupMutation();
  const [form, setForm] = useState({ storeName: '', ownerName: '', email: '', password: '', branchName: '' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await signup(form).unwrap();
  };

  const update = (name: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [name]: event.target.value }));

  if (data) {
    return <main className="mx-auto max-w-lg p-8">
      <h1 className="text-3xl font-extrabold">Store created</h1>
      <p className="mt-3">Your Store ID is <strong>{data.tenantCode}</strong>. Use it on the login screen.</p>
      <Link className="v-link mt-5 inline-block" to="/">Go to login</Link>
    </main>;
  }

  return <main className="mx-auto max-w-lg p-8">
    <h1 className="text-3xl font-extrabold">Create your store</h1>
    <form className="mt-6 grid gap-4" onSubmit={submit}>
      {([
        ['storeName', 'Store name', 'text'],
        ['ownerName', 'Owner name', 'text'],
        ['email', 'Email', 'email'],
        ['branchName', 'Main branch name', 'text'],
        ['password', 'Password (12+ characters)', 'password'],
      ] as const).map(([name, label, type]) => (
        <label key={name} className="grid gap-1">
          <span>{label}</span>
          <input className="rounded border border-line bg-card px-3 py-2" required minLength={name === 'password' ? 12 : 2}
            type={type} value={form[name]} onChange={update(name)} />
        </label>
      ))}
      {error && <p role="alert" className="text-err">We could not create the store. Please check the details and try again.</p>}
      <button className="rounded bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={isLoading}>
        {isLoading ? 'Creating store...' : 'Create store'}
      </button>
    </form>
    <Link className="v-link mt-5 inline-block" to="/">Back to login</Link>
  </main>;
}
