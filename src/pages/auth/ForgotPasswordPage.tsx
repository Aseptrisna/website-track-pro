import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import api from '../../lib/axios';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch {
      toast.error('Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-6 flex flex-col items-center">
          <Navigation className="h-10 w-10 text-emerald-600" />
          <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
            Forgot password?
          </h1>
          <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
            Enter your email to receive a reset link
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Check your email for the password reset link.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block text-sm text-emerald-600 hover:underline"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                'Send Reset Link'
              )}
            </button>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              <Link to="/login" className="text-emerald-600 hover:underline">
                Back to Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
