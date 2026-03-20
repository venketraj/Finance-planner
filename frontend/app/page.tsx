import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TrendingUp, Shield, BarChart3, Flame, ArrowRight } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-emerald-400" />
          <span className="text-xl font-bold tracking-tight">FinancePlanner</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/protected/dashboard"
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400 mb-6">
          <Flame className="h-4 w-4" />
          Track your path to Financial Independence
        </div>
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Your personal{" "}
          <span className="text-emerald-400">finance command</span>
          <br />
          centre
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-400">
          Track net worth, manage debts, analyse your portfolio, and calculate exactly when you can retire — all in one place.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href={user ? "/protected/dashboard" : "/register"}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3 text-base font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
          >
            {user ? "Open Dashboard" : "Start for free"} <ArrowRight className="h-5 w-5" />
          </Link>
          {!user && (
            <Link
              href="/login"
              className="rounded-xl border border-slate-600 px-7 py-3 text-base font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Log in
            </Link>
          )}
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<TrendingUp className="h-6 w-6 text-emerald-400" />}
            title="Net Worth Tracker"
            description="Daily snapshots of your investments and liabilities plotted over time."
          />
          <FeatureCard
            icon={<BarChart3 className="h-6 w-6 text-blue-400" />}
            title="Portfolio Analytics"
            description="XIRR, allocation breakdown, and live market prices for stocks & mutual funds."
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6 text-violet-400" />}
            title="Debt Paydown Planner"
            description="Month-by-month payoff schedule showing total interest and projected payoff date."
          />
          <FeatureCard
            icon={<Flame className="h-6 w-6 text-orange-400" />}
            title="FIRE Calculator"
            description="Know your FIRE number, progress percentage, and exact retirement timeline."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 px-6 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} FinancePlanner. Built for your financial freedom.
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6 backdrop-blur-sm hover:border-slate-600 transition-colors">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-700/60">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold text-white">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}
