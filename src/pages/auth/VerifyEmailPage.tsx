import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Navigation, CheckCircle, XCircle } from 'lucide-react';
import api from '../../lib/axios';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }
    api
      .post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <Navigation className="mx-auto h-10 w-10 text-emerald-600" />

        {status === 'loading' && (
          <div className="mt-6">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Verifying email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-6">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              Email Verified!
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Your email has been verified successfully.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Go to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              Verification Failed
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Invalid or expired verification link.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
