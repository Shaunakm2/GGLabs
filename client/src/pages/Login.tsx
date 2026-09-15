import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

export type DemoUser = { name: string; email: string; role: "individual" | "corporate" };

type LoginProps = { onBack: () => void; onLogin: (user: DemoUser) => void };

const demoAccounts = {
  individual: { email: "individual@gglabs.demo", password: "learn", name: "Aarav Mehta" },
  corporate: { email: "corporate@gglabs.demo", password: "build", name: "Maya Shah" },
};

export default function Login({ onBack, onLogin }: LoginProps) {
  const { theme, toggleTheme } = useTheme();
  const [role, setRole] = useState<"individual" | "corporate">("individual");
  const [email, setEmail] = useState(demoAccounts.individual.email);
  const [password, setPassword] = useState(demoAccounts.individual.password);
  const [showPassword, setShowPassword] = useState(false);

  const selectRole = (nextRole: "individual" | "corporate") => {
    setRole(nextRole);
    setEmail(demoAccounts[nextRole].email);
    setPassword(demoAccounts[nextRole].password);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const account = demoAccounts[role];
    if (email.trim().toLowerCase() === account.email && password === account.password) {
      onLogin({ name: account.name, email: account.email, role });
      toast(`Welcome back, ${account.name.split(" ")[0]}.`);
      return;
    }
    toast("For this demo, use one of the account details shown below.");
  };

  return (
    <main className="auth-shell">
      <div className="auth-art" aria-hidden="true"><span className="auth-orbit orbit-a" /><span className="auth-orbit orbit-b" /><span className="auth-orbit orbit-c" /><span className="auth-star">✦</span></div>
      <header className="auth-header">
        <button className="brand-lockup auth-brand" onClick={onBack}><span className="logo-mark"><span className="logo-dot logo-dot-a" /><span className="logo-dot logo-dot-b" /><span className="logo-dot logo-dot-c" /></span><span>GG Learning Labs</span></button>
        <div className="auth-header-actions"><button className="theme-button auth-theme" onClick={toggleTheme}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}<span>{theme === "light" ? "Night" : "Day"}</span></button><button className="back-link" onClick={onBack}><ArrowLeft size={14} /> Back to homepage</button></div>
      </header>
      <div className="auth-layout page-width">
        <section className="auth-intro"><div className="section-kicker">Your L&D workspace</div><h1>Make the next<br /><em>useful move.</em></h1><p>Sign in to see your services, working notes, and the practical tools waiting inside your GG Learning Labs space.</p><div className="auth-points"><span><Check size={14} /> No spreadsheet sprawl</span><span><Check size={14} /> Built for your role</span><span><Check size={14} /> Start with one useful service</span></div></section>
        <section className="auth-card">
          <div className="auth-card-top"><div><div className="card-eyebrow">Welcome back</div><h2>Sign in to your lab</h2></div><span className="auth-badge">DEMO</span></div>
          <div className="role-switch" role="tablist" aria-label="Choose account type"><button className={role === "individual" ? "selected" : ""} onClick={() => selectRole("individual")} role="tab" aria-selected={role === "individual"}>Individual</button><button className={role === "corporate" ? "selected" : ""} onClick={() => selectRole("corporate")} role="tab" aria-selected={role === "corporate"}>Corporate L&D</button></div>
          <form onSubmit={submit} className="auth-form"><label htmlFor="login-email">Email address</label><input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /><label htmlFor="login-password">Password</label><div className="password-wrap"><input id="login-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div><button className="auth-submit" type="submit">Enter the lab <ArrowRight size={17} /></button></form>
          <div className="demo-note"><div><span className="demo-note-label">Demo account</span><strong>{role === "individual" ? "Individual practitioner" : "Corporate L&D team"}</strong></div><button onClick={() => { setEmail(demoAccounts[role].email); setPassword(demoAccounts[role].password); }}>Use credentials <ArrowRight size={14} /></button></div><p className="auth-disclaimer">This is a front-end demo login. The accounts are prefilled for exploration and do not store real credentials.</p>
        </section>
      </div>
    </main>
  );
}
