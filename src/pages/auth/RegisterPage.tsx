import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Navigation,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  MapPin,
  Shield,
  BarChart3,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const benefits = [
  'Unlimited GPS vehicle tracking',
  'Real-time alerts & notifications',
  'Route history & analytics',
  'Manage vehicles & devices',
  'Geofence monitoring',
];

const highlights = [
  { icon: MapPin, text: 'Track vehicles in real-time on a live map' },
  { icon: Shield, text: 'Enterprise-grade security & data protection' },
  { icon: BarChart3, text: 'Detailed fleet reports & insights' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordStrength =
    password.length === 0
      ? 0
      : password.length < 6
        ? 1
        : password.length < 8
          ? 2
          : /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
            ? 4
            : 3;

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Registration successful!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-emerald-700 to-emerald-900" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2MmgxMnptLTItMjJhOCA4IDAgMSAxIDAgMTYgOCA4IDAgMCAxIDAtMTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />

        <div className="relative flex h-full flex-col justify-between p-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="rounded-xl bg-white/10 p-2 backdrop-blur-sm">
              <Navigation className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">TrackPro</span>
          </Link>

          {/* Content */}
          <div>
            <h2 className="text-4xl font-bold leading-tight text-white">
              Start tracking
              <br />
              your fleet today.
            </h2>
            <p className="mt-4 max-w-md text-lg text-emerald-100">
              Join hundreds of companies using TrackPro to optimize their fleet operations.
            </p>

            <div className="mt-10 space-y-4">
              {highlights.map((h) => (
                <div key={h.text} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                    <h.icon className="h-5 w-5 text-emerald-200" />
                  </div>
                  <span className="text-sm text-emerald-100">{h.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-sm text-emerald-200/60">
            &copy; {new Date().getFullYear()} TrackPro. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex w-full items-center justify-center bg-gray-50 px-4 dark:bg-slate-900 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <Navigation className="h-8 w-8 text-emerald-600" />
              <span className="text-xl font-bold text-emerald-600">TrackPro</span>
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none sm:p-8 md:p-10">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create account</h1>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                Start your free trial — no credit card required
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="John Doe"
                    className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 text-sm transition-colors placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 text-sm transition-colors placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-11 text-sm transition-colors placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Password strength */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            level <= passwordStrength
                              ? strengthColor[passwordStrength]
                              : 'bg-gray-200 dark:bg-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {strengthLabel[passwordStrength]}
                    </p>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-700 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    Create account <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Benefits */}
            <div className="mt-6 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/10">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                What you get
              </p>
              <ul className="space-y-1.5">
                {benefits.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
              <span className="text-xs text-gray-400">or</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
