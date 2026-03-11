import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Navigation,
  ArrowRight,
  MapPin,
  Shield,
  Zap,
  BarChart3,
  Bell,
  Smartphone,
  Clock,
  Users,
  Car,
  Globe,
  CheckCircle,
  Star,
  ChevronRight,
  Menu,
  X,
  TrendingUp,
  Play,
  Mail,
  Phone,
  Sparkles,
  Quote,
  Rocket,
  Send,
} from 'lucide-react';

const features = [
  {
    icon: MapPin,
    title: 'Real-Time Tracking',
    desc: 'Monitor your entire fleet on a live map with real-time GPS updates every few seconds.',
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    icon: Shield,
    title: 'Geofence Alerts',
    desc: 'Set virtual boundaries and receive instant alerts when vehicles enter or leave zones.',
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    desc: 'Comprehensive reports on fleet usage, fuel consumption, driver behavior, and efficiency.',
    gradient: 'from-purple-500 to-pink-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    desc: 'Get notified about speed violations, unauthorized usage, maintenance reminders, and more.',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    icon: Clock,
    title: 'Route History',
    desc: 'Replay past trips with complete route details, stops, speed logs, and timestamps.',
    gradient: 'from-rose-500 to-red-500',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
  },
  {
    icon: Smartphone,
    title: 'Device Management',
    desc: 'Manage GPS devices, pair with vehicles, and monitor device health from one dashboard.',
    gradient: 'from-cyan-500 to-teal-500',
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Install GPS Device',
    desc: 'Attach a compact GPS tracker to your vehicle. Supports all major GPS hardware brands.',
    icon: Rocket,
  },
  {
    step: '02',
    title: 'Connect to TrackPro',
    desc: 'Register your device on the platform and pair it with your vehicle in just a few clicks.',
    icon: Globe,
  },
  {
    step: '03',
    title: 'Track & Monitor',
    desc: 'Start tracking in real-time. View live locations, speed, routes, and receive instant alerts.',
    icon: TrendingUp,
  },
];

const stats = [
  { value: '10K+', label: 'Vehicles Tracked', icon: Car },
  { value: '99.9%', label: 'Uptime Guarantee', icon: Zap },
  { value: '50M+', label: 'KM Monitored', icon: Globe },
  { value: '500+', label: 'Companies Trust Us', icon: Users },
];

const testimonials = [
  {
    name: 'Ahmad Fauzi',
    role: 'Fleet Manager',
    company: 'PT Logistik Nusantara',
    text: 'TrackPro revolutionized how we manage our 200+ vehicle fleet. Real-time tracking and detailed reports helped us reduce fuel costs by 30%.',
    rating: 5,
    initials: 'AF',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'Siti Rahayu',
    role: 'Operations Director',
    company: 'Fast Cargo Indonesia',
    text: 'The geofence alerts and route optimization features are game-changers. Our delivery efficiency improved dramatically since switching to TrackPro.',
    rating: 5,
    initials: 'SR',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    name: 'Budi Santoso',
    role: 'CEO',
    company: 'TransJaya Group',
    text: 'Simple to set up, powerful analytics, and excellent support team. TrackPro is the best investment we made for our transportation business.',
    rating: 5,
    initials: 'BS',
    color: 'from-purple-500 to-pink-500',
  },
];

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-slate-900">
      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <Navigation className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Track<span className="text-emerald-600">Pro</span>
            </span>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {['Features', 'How It Works', 'Testimonials'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-sm font-medium text-gray-600 transition-colors hover:text-emerald-600 dark:text-gray-300 dark:hover:text-emerald-400"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-emerald-600 dark:text-gray-300"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40"
            >
              Get Started Free
            </Link>
          </div>

          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800 md:hidden"
          >
            {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="animate-fade-in-up border-t border-gray-100 bg-white px-4 pb-4 dark:border-slate-800 dark:bg-slate-900 md:hidden">
            <nav className="flex flex-col gap-1 pt-2">
              {['Features', 'How It Works', 'Testimonials'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setMobileMenu(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800"
                >
                  {item}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 dark:border-slate-800">
              <Link to="/login" onClick={() => setMobileMenu(false)} className="rounded-lg px-3 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300">
                Sign In
              </Link>
              <Link to="/register" onClick={() => setMobileMenu(false)} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2.5 text-center text-sm font-semibold text-white">
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="animate-float absolute -left-32 top-10 h-[500px] w-[500px] rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-900/30" />
          <div className="animate-float-delayed absolute -right-32 top-40 h-[600px] w-[600px] rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-900/20" />
          <div className="animate-pulse-soft absolute left-1/3 top-0 h-[400px] w-[400px] rounded-full bg-cyan-200/20 blur-3xl dark:bg-blue-900/10" />
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
            style={{
              backgroundImage: 'linear-gradient(#059669 1px, transparent 1px), linear-gradient(90deg, #059669 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/80 px-5 py-2 text-sm font-medium text-emerald-700 shadow-sm backdrop-blur-sm dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
              <span>#1 GPS Fleet Tracking Platform in Indonesia</span>
            </div>

            {/* Headline */}
            <h1 className="animate-fade-in-up delay-100 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Track Your Fleet{' '}
              <span className="relative whitespace-nowrap">
                <span className="relative bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                  In Real Time
                </span>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="animate-fade-in-up delay-200 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-400 sm:mt-8 sm:text-lg md:text-xl">
              Monitor your entire fleet in real-time. Track locations, analyze routes,
              optimize operations — all from one powerful dashboard.
            </p>

            {/* CTAs */}
            <div className="animate-fade-in-up delay-300 mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
              <Link
                to="/register"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-emerald-500/25 transition-all hover:shadow-2xl hover:shadow-emerald-500/40 sm:w-auto"
              >
                Start Free Trial
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#features"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-8 py-4 text-base font-semibold text-gray-700 backdrop-blur-sm transition-all hover:border-emerald-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-gray-300 dark:hover:border-emerald-700 sm:w-auto"
              >
                <Play className="h-5 w-5 text-emerald-600" />
                Watch Demo
              </a>
            </div>

            {/* Trust badges */}
            <div className="animate-fade-in-up delay-400 mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 sm:mt-10 sm:gap-6">
              {[
                'Free 14-day trial',
                'No credit card required',
                'Cancel anytime',
              ].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Dashboard Preview ─── */}
          <div className="animate-fade-in-up delay-500 mx-auto mt-14 max-w-5xl sm:mt-20">
            <div className="relative">
              {/* Glow behind the dashboard */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-cyan-500/20 blur-2xl" />

              <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl dark:border-slate-700/80 dark:bg-slate-800">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="ml-3 flex-1 rounded-lg bg-white px-3 py-1 text-xs text-gray-400 dark:bg-slate-700 dark:text-gray-500">
                    trackpro.app/dashboard
                  </div>
                </div>

                <div className="flex">
                  {/* Mini sidebar */}
                  <div className="hidden w-44 border-r border-gray-100 bg-gray-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/50 sm:block">
                    <div className="mb-4 flex items-center gap-2 px-2">
                      <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600" />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">TrackPro</span>
                    </div>
                    {['Dashboard', 'Tracking', 'Vehicles', 'Drivers', 'Devices'].map((item, i) => (
                      <div
                        key={item}
                        className={`mb-1 rounded-lg px-2 py-1.5 text-xs ${
                          i === 0
                            ? 'bg-emerald-100 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 p-3 sm:p-4">
                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                      {[
                        { label: 'Active Vehicles', val: '147', color: 'from-emerald-500 to-teal-500', change: '+12%' },
                        { label: 'Online Devices', val: '132', color: 'from-blue-500 to-indigo-500', change: '+8%' },
                        { label: 'Total Drivers', val: '89', color: 'from-purple-500 to-pink-500', change: '+5%' },
                        { label: 'Deliveries', val: '56', color: 'from-amber-500 to-orange-500', change: '+23%' },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="rounded-xl border border-gray-100 bg-white p-2.5 dark:border-slate-600 dark:bg-slate-700/50 sm:p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">{s.val}</span>
                            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                              {s.change}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 sm:text-xs">{s.label}</p>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-600">
                            <div className={`h-full rounded-full bg-gradient-to-r ${s.color}`} style={{ width: '72%' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Map + chart area */}
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {/* Map area */}
                      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 sm:col-span-2" style={{ minHeight: '140px' }}>
                        <div
                          className="absolute inset-0 opacity-[0.06]"
                          style={{
                            backgroundImage: 'linear-gradient(#059669 1px, transparent 1px), linear-gradient(90deg, #059669 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                          }}
                        />
                        {/* Vehicle dots */}
                        <div className="absolute left-[20%] top-[30%] h-3 w-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50">
                          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                        </div>
                        <div className="absolute left-[55%] top-[50%] h-3 w-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                        <div className="absolute left-[75%] top-[25%] h-3 w-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50" />
                        <div className="absolute left-[40%] top-[70%] h-2.5 w-2.5 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50" />
                        <div className="absolute left-[60%] top-[65%] h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                        <div className="absolute bottom-2 left-2 rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-medium text-gray-600 shadow-sm backdrop-blur-sm dark:bg-slate-800/90 dark:text-gray-400">
                          <MapPin className="mr-1 inline h-3 w-3 text-emerald-500" />
                          Live Map • 5 vehicles
                        </div>
                      </div>

                      {/* Mini chart */}
                      <div className="rounded-xl border border-gray-100 bg-white p-3 dark:border-slate-600 dark:bg-slate-700/50">
                        <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">Activity</p>
                        <div className="flex items-end gap-1" style={{ height: '80px' }}>
                          {[40, 65, 45, 80, 55, 90, 70, 60, 85, 50, 75, 95].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-t bg-gradient-to-t from-emerald-500 to-teal-400 transition-all hover:opacity-90"
                              style={{ height: `${h}%`, opacity: 0.7 + (h / 500) }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="relative border-y border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((s) => (
            <div key={s.label} className="group text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100 dark:bg-emerald-900/20 dark:group-hover:bg-emerald-900/40">
                <s.icon className="h-6 w-6" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              <Zap className="h-4 w-4" />
              Features
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Manage Your Fleet
              </span>
            </h2>
            <p className="mt-4 text-base text-gray-600 dark:text-gray-400 sm:text-lg">
              Powerful tools designed to give you complete visibility and control.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              >
                {/* Gradient top accent on hover */}
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${f.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

                <div className={`inline-flex rounded-xl p-3 ${f.bg}`}>
                  <div className={`rounded-lg bg-gradient-to-br ${f.gradient} p-2`}>
                    <f.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{f.desc}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:text-emerald-400">
                  Learn more <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="relative overflow-hidden border-y border-gray-200 bg-white py-20 dark:border-slate-700 dark:bg-slate-800 sm:py-28">
        {/* Decorative background */}
        <div className="absolute inset-0 -z-10">
          <div className="animate-pulse-soft absolute -right-32 top-1/2 h-[400px] w-[400px] rounded-full bg-emerald-100/50 blur-3xl dark:bg-emerald-900/20" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
              How It Works
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">
              Get Started in{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                3 Simple Steps
              </span>
            </h2>
          </div>

          <div className="mt-14 grid gap-8 sm:mt-16 md:grid-cols-3">
            {howItWorks.map((item, i) => (
              <div key={item.step} className="group relative text-center">
                {/* Connector line */}
                {i < howItWorks.length - 1 && (
                  <div className="absolute left-[calc(50%+40px)] top-10 hidden h-0.5 w-[calc(100%-80px)] md:block">
                    <div className="h-full w-full bg-gradient-to-r from-emerald-300 to-emerald-100 dark:from-emerald-700 dark:to-emerald-900/30" />
                    <div className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-r border-t border-emerald-300 dark:border-emerald-700" />
                  </div>
                )}

                {/* Step circle */}
                <div className="relative mx-auto mb-6">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20 transition-transform duration-300 group-hover:scale-110">
                    <item.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-emerald-600 shadow-md ring-2 ring-emerald-100 dark:bg-slate-700 dark:text-emerald-400 dark:ring-emerald-900/50">
                    {item.step}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="testimonials" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              <Star className="h-4 w-4" />
              Testimonials
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">
              Trusted by{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Businesses Across Indonesia
              </span>
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:mt-16 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800"
              >
                {/* Decorative quote */}
                <Quote className="absolute right-4 top-4 h-10 w-10 text-gray-100 dark:text-slate-700/50" />

                {/* Stars */}
                <div className="relative mb-4 flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Text */}
                <p className="relative mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  &ldquo;{t.text}&rdquo;
                </p>

                {/* Author */}
                <div className="relative flex items-center gap-3 border-t border-gray-100 pt-4 dark:border-slate-700">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-sm font-bold text-white shadow-md`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t.role}, {t.company}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="border-t border-gray-200 dark:border-slate-700">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 px-6 py-14 text-center shadow-2xl sm:px-10 sm:py-20 lg:px-20">
            {/* Decorative pattern overlay */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            {/* Floating shapes */}
            <div className="animate-float absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
            <div className="animate-float-delayed absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-xl" />

            <div className="relative">
              <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                Ready to Take Control
                <br className="hidden sm:block" /> of Your Fleet?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-emerald-100 sm:mt-6 sm:text-lg">
                Join 500+ companies using TrackPro to optimize fleet operations.
                Start your free trial today — no credit card required.
              </p>

              {/* Email signup */}
              <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:mt-10 sm:flex-row">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Enter your work email"
                    className="w-full rounded-xl bg-white/95 py-3.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-emerald-700 shadow-lg transition-all hover:bg-emerald-50"
                >
                  Get Started <Send className="h-4 w-4" />
                </Link>
              </div>

              <p className="mt-4 text-xs text-emerald-200">
                Free 14-day trial • No credit card • Setup in minutes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-5">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Navigation className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Track<span className="text-emerald-600">Pro</span>
                </span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                Real-time GPS fleet tracking platform for modern businesses. Monitor, analyze, and optimize your fleet operations with ease.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400">
                  <Globe className="h-4 w-4" />
                </a>
                <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400">
                  <Mail className="h-4 w-4" />
                </a>
                <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400">
                  <Phone className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Product</h4>
              <ul className="mt-4 space-y-3">
                {['Features', 'Pricing', 'Integrations', 'API Docs', 'Changelog'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Company</h4>
              <ul className="mt-4 space-y-3">
                {['About Us', 'Careers', 'Blog', 'Partners', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Support</h4>
              <ul className="mt-4 space-y-3">
                {['Help Center', 'Community', 'Privacy Policy', 'Terms of Service', 'Status'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 dark:border-slate-700 sm:flex-row">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} TrackPro. All rights reserved.
            </p>
            <div className="flex gap-6">
              {['Privacy', 'Terms', 'Cookies'].map((item) => (
                <a key={item} href="#" className="text-sm text-gray-400 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
