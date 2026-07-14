import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/api";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import dmcLogo from "@/assets/dmc-logo.png";

export default function AuthPage() {
  const { currentUser, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("Treasurer");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) navigate("/dashboard");
  }, [currentUser, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "login") {
        const r = await login(email.trim(), password);
        if (!r.ok) return toast.error(r.error ?? "Login failed");
        toast.success("Welcome back!");
      } else {
        if (!name.trim() || !email.trim() || password.length < 6) {
          return toast.error("Fill all fields (password must be at least 6 characters)");
        }
        const r = await register({ fullName: name.trim(), email: email.trim(), password, role });
        if (!r.ok) return toast.error(r.error ?? "Signup failed");
        toast.success("Account created!");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Left panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-14 overflow-hidden bg-sidebar hairline-b lg:border-b-0 lg:border-r border-border">
        <div className="absolute inset-0 -z-10 grid-backdrop" />
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full bg-emerald/15 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-amber/8 blur-3xl" />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 rounded-2xl grid place-items-center bg-gradient-to-br from-emerald/25 to-emerald/5 ring-1 ring-emerald/30">
            <img src={dmcLogo} alt="DMC College Foundation" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <div className="display text-2xl leading-none">
              SC <span className="gradient-text">FundSafe</span>
            </div>
            <div className="mono text-[10px] text-muted-foreground/80 mt-1">DMC College Foundation, Dipolog City</div>
          </div>
        </div>

        <div className="space-y-8 max-w-md">
          <div className="eyebrow flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald dot-pulse" /> Student Council Treasury
          </div>
          <h1 className="display text-5xl xl:text-6xl leading-[1.02]">
            Secure. Transparent. <span className="gradient-text">Effortless.</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            The official fund management system for the DMC Student Council — track every peso,
            generate reports, and keep the record straight.
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {[
              ["01", "Record income"],
              ["02", "Track expenses"],
              ["03", "Live balance"],
              ["04", "Instant reports"],
            ].map(([n, l]) => (
              <div key={n} className="flex items-baseline gap-3 text-sm">
                <span className="mono text-[10px] text-amber tracking-widest">{n}</span>
                <span>{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground mono">
          <span>© {new Date().getFullYear()} DMC · SC FundSafe</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-emerald" /> Encrypted local vault
          </span>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 lg:p-14 relative">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src={dmcLogo} alt="DMC" className="h-9 w-9 object-contain" />
            <div>
              <div className="display text-2xl leading-none">
                SC <span className="gradient-text">FundSafe</span>
              </div>
              <div className="mono text-[9px] text-muted-foreground/80 mt-0.5">DMC College Foundation</div>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="inline-flex items-center gap-1 p-1 bg-muted/60 rounded-full mb-8">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                  mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <h2 className="display text-3xl">{mode === "login" ? "Welcome back." : "Create your account."}</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {mode === "login" ? "Sign in to manage the council funds." : "Register to start recording funds."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-2">
            {mode === "signup" && (
              <FloatField label="Full name" value={name}>
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </FloatField>
            )}
            <FloatField label="Email" value={email}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </FloatField>
            <FloatField label="Password" value={password}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </FloatField>

            {mode === "signup" && (
              <FloatField label="Role" value={role}>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="Treasurer">Treasurer</option>
                  <option value="Officer">Officer</option>
                  <option value="ClassRepresentative">Class Representative</option>
                  <option value="Adviser">Adviser</option>
                </select>
              </FloatField>
            )}

            <button type="submit" disabled={submitting} className="btn btn-primary w-full mt-8">
              {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {mode === "login" && (
            <div className="mt-8 pt-6 hairline-t">
              <div className="text-xs text-muted-foreground leading-relaxed">
                Don't have an account yet? There are no pre-made accounts — you'll need to{" "}
                <button onClick={() => setMode("signup")} className="text-emerald link-hover font-medium">
                  register first
                </button>
                .
              </div>
            </div>
          )}
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
