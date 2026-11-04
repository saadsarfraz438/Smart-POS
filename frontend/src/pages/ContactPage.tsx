import { Link } from 'react-router-dom';

export default function ContactPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-5 text-ink">
      <section className="w-full max-w-[520px] rounded-[22px] border border-line bg-card p-8 shadow-2xl">
        <h1 className="text-3xl font-extrabold">Contact Volta</h1>
        <p className="mt-2 text-mute">Please contact your store manager for help signing in.</p>
        <Link className="v-link mt-4" to="/">Return to sign in</Link>
      </section>
    </main>
  );
}
