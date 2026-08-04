import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import bitsLogo from "@/assets/bits-logo.png";

export default function AuthPage() {
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) navigate("/dashboard");
  }, [currentUser, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await login(email.trim(), password);
      if (!r.ok) return toast.error(r.error ?? "Login failed");
      toast.success("Welcome back!");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[oklch(0.08_0.01_165)]">
      {/* ---- Shared full-bleed live background ----
           Deliberately no negative z-index here: this page's <body> paints
           its own background (see styles.css), and background layers with
           negative z-index resolve against the nearest ancestor that
           establishes a real stacking context - without one explicitly set
           on this wrapper, they were sorting behind body's own background
           and never showing at all. Plain DOM order (these come first,
           content comes after) avoids that ambiguity entirely. */}
      {/* Near-black base - the two corner clusters below are the only color */}
      <div className="absolute inset-0 bg-[oklch(0.07_0.008_165)]" />

      {/* Top-left glow cluster */}
      <div className="absolute -top-40 -left-40 h-[46rem] w-[46rem] rounded-full bg-emerald/40 blur-[120px] animate-drift-a" />
      <div className="absolute -top-20 left-[5%] h-[28rem] w-[28rem] rounded-full bg-emerald/25 blur-[100px] animate-drift-b" />

      {/* Bottom-right glow cluster */}
      <div className="absolute -bottom-40 -right-40 h-[46rem] w-[46rem] rounded-full bg-emerald/35 blur-[120px] animate-drift-b" />
      <div className="absolute bottom-[-5%] right-[8%] h-[26rem] w-[26rem] rounded-full bg-amber/20 blur-[110px] animate-drift-c" />

      {/* soft vignette so the corners fade cleanly rather than showing a hard edge */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/0 via-black/35 to-black/0" />
      <div className="absolute inset-0 bg-gradient-to-tr from-black/0 via-black/35 to-black/0" />

      <div className="relative min-h-screen grid lg:grid-cols-2">
        {/* Left - logo, title, one-line description - centered within its half */}
        <div className="hidden lg:flex flex-col items-center justify-center text-center px-16 xl:px-24">
          <div className="flex items-center gap-5">
            <div
              className="relative h-24 w-24 shrink-0 grid place-items-center bg-gradient-to-br from-emerald/40 via-emerald/15 to-transparent ring-1 ring-emerald/40 shadow-[0_0_60px_-8px_var(--emerald-glow)]"
              style={{ clipPath: "polygon(50% 0%, 100% 22%, 100% 58%, 50% 100%, 0% 58%, 0% 22%)" }}
            >
              <img src={bitsLogo} alt="BSIT Department" className="h-14 w-14 object-contain" loading="eager" />
            </div>
            <div>
              <div className="display text-6xl leading-none">
                IT <span className="gradient-text">FundSafe</span>
              </div>
              <div className="mono text-xs tracking-widest uppercase text-muted-foreground/80 mt-3">
                BSIT Department Student Council
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed mt-8 max-w-xs mx-auto">
            Secure fund and student-dues management for the council — every peso tracked, every payment
            accounted for.
          </p>
        </div>

        {/* Right - login form, floating glass card with a deep shadow */}
        <div className="flex items-center justify-center p-6 lg:p-14">
          <div className="w-full max-w-sm">
            <div className="lg:hidden flex flex-col items-center gap-3 mb-10 text-center">
              <div
                className="relative h-14 w-14 grid place-items-center bg-gradient-to-br from-emerald/40 via-emerald/15 to-transparent ring-1 ring-emerald/40"
                style={{ clipPath: "polygon(50% 0%, 100% 22%, 100% 58%, 50% 100%, 0% 58%, 0% 22%)" }}
              >
                <img src={bitsLogo} alt="BSIT" className="h-9 w-9 object-contain" />
              </div>
              <div>
                <div className="display text-2xl leading-none">
                  IT <span className="gradient-text">FundSafe</span>
                </div>
                <div className="mono text-[9px] text-muted-foreground/80 mt-1">BSIT Department Council</div>
              </div>
            </div>

            <div
              className="relative rounded-[2rem] p-8 md:p-10 bg-gradient-to-b from-emerald/[0.04] to-card/95 bg-card/95 backdrop-blur-xl border border-white/10"
              style={{ boxShadow: "0 60px 120px -30px oklch(0 0 0 / 0.75), 0 0 0 1px oklch(1 0 0 / 0.04) inset" }}
            >
              <div className="eyebrow mb-4">Sign in</div>
              <h2 className="display text-3xl">Welcome back.</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Sign in to manage the council funds. Accounts are issued by the system administrator.
              </p>

              <form onSubmit={submit} className="mt-8 space-y-2">
                <FloatField label="Email" value={email}>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
                </FloatField>
                <FloatField label="Password" value={password}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </FloatField>

                <button type="submit" disabled={submitting} className="btn btn-primary w-full mt-8">
                  {submitting ? "Please wait…" : "Sign in"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mono">
              <ShieldCheck className="h-3 w-3 text-emerald" /> Encrypted local vault
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatField({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <label className={"field" + (value ? " is-filled" : "")}>
      {children}
      <span className="field-label">{label}</span>
    </label>
  );
}
