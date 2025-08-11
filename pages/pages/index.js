import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.replace('/dashboard');
    })();
  }, [router]);

  const signInWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setMsg(error.message);
    setLoading(false);
  };

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password: pw });
    setMsg(error ? error.message : 'Check your email to confirm your account.');
    setLoading(false);
  };

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setMsg(error.message);
    else router.replace('/onboarding');
    setLoading(false);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-purple5 text-white">
      <div className="p-8 rounded-2xl bg-purple4 shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6">Nutrition & Fitness Tracker</h1>

        <div className="space-y-3 mb-6">
          <input className="w-full p-3 rounded bg-purple3" placeholder="Email"
                 value={email} onChange={e => setEmail(e.target.value)} />
          <input className="w-full p-3 rounded bg-purple3" type="password" placeholder="Password"
                 value={pw} onChange={e => setPw(e.target.value)} />
          <div className="flex gap-3">
            <button onClick={signIn} className="flex-1 bg-purple1 py-2 rounded hover:bg-purple2" disabled={loading}>Sign in</button>
            <button onClick={signUp} className="flex-1 bg-purple3 py-2 rounded hover:bg-purple2" disabled={loading}>Sign up</button>
          </div>
        </div>

        <button onClick={signInWithGoogle}
                className="w-full bg-purple1 px-4 py-2 rounded hover:bg-purple2 disabled:opacity-50"
                disabled={loading}>
          Continue with Google
        </button>

        {msg && <p className="mt-4 text-sm opacity-90">{msg}</p>}
      </div>
    </div>
  );
}
