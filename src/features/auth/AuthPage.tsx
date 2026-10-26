
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        setMessage(
          data.session
            ? 'Account created successfully!'
            : 'Account created. Check your email to confirm your account.',
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Something went wrong.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Ajaia</h1>
        <p>Your documents, all in one place.</p>

        <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {message && <p role="status">{message}</p>}

        <button type="submit" disabled={loading}>
          {loading
            ? 'Please wait…'
            : isSignUp
              ? 'Create account'
              : 'Sign in'}
        </button>

        <button
          type="button"
          className="auth-toggle"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setMessage('');
          }}
        >
          {isSignUp
            ? 'Already have an account? Sign in'
            : 'New here? Create an account'}
        </button>
      </form>
    </main>
  );
}
