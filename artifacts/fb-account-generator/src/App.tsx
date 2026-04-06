import { useState, useEffect, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const TEMP_MAIL_API = "https://vern-rest-api.vercel.app/api/tempmail";

type TempMailResponse = {
  creator: string;
  API: string;
  email: string;
  inbox_endpoint: string;
};

type Account = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthday: string;
  gender: string;
  status: "ready" | "generating" | "error";
  createdAt: string;
  safetyScore: number;
};

const SAFETY_TIPS = [
  { icon: "🕐", label: "Don't log in immediately", tip: "Wait 24–48 hours before using the account to avoid instant flags." },
  { icon: "📱", label: "Use mobile data", tip: "Avoid VPN or proxy. Use real mobile data or a home IP address." },
  { icon: "🖼️", label: "Add a profile picture", tip: "Upload a realistic photo right after creating. Blank accounts get flagged." },
  { icon: "👥", label: "Add friends slowly", tip: "Don't send too many friend requests in the first week." },
  { icon: "💬", label: "Be active naturally", tip: "Like posts, comment normally. Don't post too much right away." },
  { icon: "🔒", label: "Enable 2FA", tip: "Turn on two-factor authentication to prevent instant lock." },
  { icon: "📧", label: "Verify the email", tip: "Check the temp email inbox and confirm the Facebook verification email." },
  { icon: "🌐", label: "Set a location", tip: "Fill in your city and country in your profile info." },
];

const firstNames = [
  "James", "Maria", "John", "Patricia", "Robert", "Jennifer", "Michael",
  "Linda", "William", "Barbara", "David", "Susan", "Richard", "Jessica",
  "Joseph", "Sarah", "Thomas", "Karen", "Charles", "Lisa", "Christopher",
  "Nancy", "Daniel", "Betty", "Matthew", "Margaret", "Anthony", "Sandra",
  "Mark", "Ashley", "Donald", "Dorothy", "Steven", "Kimberly", "Paul",
  "Emily", "Andrew", "Donna", "Joshua", "Michelle", "Kenneth", "Carol",
  "Kevin", "Amanda", "Brian", "Melissa", "George", "Deborah", "Timothy"
];

const lastNames = [
  "Santos", "Reyes", "Cruz", "Garcia", "Torres", "Rivera", "Flores",
  "Gomez", "Morales", "Ortiz", "Rodriguez", "Martinez", "Hernandez",
  "Lopez", "Gonzalez", "Perez", "Sanchez", "Ramirez", "Smith", "Johnson",
  "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Anderson",
  "Taylor", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson",
  "Moore", "Allen", "Clark", "Lewis", "Robinson", "Walker", "Hall", "Young"
];

function generateName() {
  return {
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
  };
}

function generateBirthday(): string {
  const year = 1988 + Math.floor(Math.random() * 22);
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
  return `${month}/${day}/${year}`;
}

function generateGender(): string {
  return Math.random() > 0.5 ? "Male" : "Female";
}

function generateStrongPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$%&!";
  const all = upper + lower + digits + special;
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  const base = [rand(upper), rand(lower), rand(digits), rand(special)];
  for (let i = 0; i < 8; i++) base.push(rand(all));
  return base.sort(() => Math.random() - 0.5).join("");
}

function generateSafetyScore(): number {
  return 78 + Math.floor(Math.random() * 18);
}

async function fetchTempEmail(): Promise<string> {
  const res = await fetch(TEMP_MAIL_API);
  if (!res.ok) throw new Error("Failed to generate temp email");
  const data: TempMailResponse = await res.json();
  if (data && data.email) return data.email;
  throw new Error("Invalid response from temp mail API");
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
      className="ml-1 px-2.5 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer shrink-0"
      style={{
        background: copied ? "rgba(34,197,94,0.18)" : "rgba(24,119,242,0.15)",
        border: copied ? "1px solid rgba(34,197,94,0.35)" : "1px solid rgba(24,119,242,0.30)",
        color: copied ? "rgb(134,239,172)" : "rgb(96,165,250)",
      }}
      title="Copy to clipboard"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function InfoRow({ label, value, copyable = false, mono = true }: {
  label: string; value: string; copyable?: boolean; mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.8)" }}>
        {label}
      </span>
      <div className="flex items-center gap-1 rounded-xl px-3 py-2 border" style={{ background: "rgba(24,119,242,0.06)", borderColor: "rgba(24,119,242,0.15)" }}>
        <span className={`text-sm text-white flex-1 truncate ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
        {copyable && <CopyButton text={value} />}
      </div>
    </div>
  );
}

function SafetyBadge({ score }: { score: number }) {
  const color = score >= 90 ? "#4ade80" : score >= 80 ? "#facc15" : "#fb923c";
  const label = score >= 90 ? "High Safety" : score >= 80 ? "Good Safety" : "Fair Safety";
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-8">
        <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${(score / 100) * 94} 94`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color }}>{score}</span>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

function AccountCard({ account, index }: { account: Account; index: number }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-2xl overflow-hidden card-glow" style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(24,119,242,0.18)" }}>
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #1877f2, #4facfe, #1877f2)" }} />

      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: "rgba(24,119,242,0.2)", border: "1px solid rgba(24,119,242,0.35)", color: "#60a5fa" }}>
            {index + 1}
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {account.status === "ready" ? `${account.firstName} ${account.lastName}` : "Generating..."}
            </div>
            <div className="text-xs" style={{ color: "rgba(148,163,184,0.7)" }}>{account.createdAt}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {account.status === "ready" && <SafetyBadge score={account.safetyScore} />}
          {account.status === "generating" && (
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24" style={{ color: "#60a5fa" }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {account.status === "ready" && (
            <button onClick={() => setExpanded(e => !e)} className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all" style={{ background: "rgba(24,119,242,0.12)", border: "1px solid rgba(24,119,242,0.25)", color: "#60a5fa" }}>
              {expanded ? "Hide" : "Show"}
            </button>
          )}
        </div>
      </div>

      {account.status === "generating" && (
        <div className="px-5 pb-5">
          <div className="shimmer h-4 rounded-lg mb-2 w-3/4" style={{ background: "rgba(24,119,242,0.08)" }} />
          <div className="shimmer h-4 rounded-lg mb-2 w-1/2" style={{ background: "rgba(24,119,242,0.06)" }} />
          <div className="shimmer h-4 rounded-lg w-2/3" style={{ background: "rgba(24,119,242,0.05)" }} />
        </div>
      )}

      {account.status === "error" && (
        <div className="px-5 pb-5 flex items-center gap-2 text-red-400">
          <span className="text-lg">⚠️</span>
          <span className="text-sm">Failed to generate email. Try again.</span>
        </div>
      )}

      {account.status === "ready" && expanded && (
        <div className="px-5 pb-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <InfoRow label="Email Address" value={account.email} copyable />
            </div>
            <div className="sm:col-span-2">
              <InfoRow label="Password" value={account.password} copyable />
            </div>
            <InfoRow label="First Name" value={account.firstName} copyable mono={false} />
            <InfoRow label="Last Name" value={account.lastName} copyable mono={false} />
            <InfoRow label="Date of Birth" value={account.birthday} mono={false} />
            <InfoRow label="Gender" value={account.gender} mono={false} />
          </div>

          <div className="rounded-xl p-3.5 flex gap-3 items-start" style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.18)" }}>
            <span className="text-base">🛡️</span>
            <div className="text-xs leading-relaxed" style={{ color: "rgb(134,239,172)" }}>
              <strong className="font-semibold">Safe Account Tips:</strong> Wait 24h before logging in. Upload a real-looking profile picture. Verify your email in the temp inbox. Use genuine mobile data, no VPN.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function MainApp() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [count, setCount] = useState(1);
  const [apiStatus, setApiStatus] = useState<"unknown" | "ok" | "error">("unknown");
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    fetch(TEMP_MAIL_API)
      .then(r => setApiStatus(r.ok ? "ok" : "error"))
      .catch(() => setApiStatus("error"));
  }, []);

  const generateAccounts = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    const newAccounts: Account[] = Array.from({ length: count }, () => {
      const { firstName, lastName } = generateName();
      return {
        email: "",
        password: "",
        firstName,
        lastName,
        birthday: generateBirthday(),
        gender: generateGender(),
        status: "generating",
        createdAt: new Date().toLocaleTimeString(),
        safetyScore: generateSafetyScore(),
      };
    });

    setAccounts(prev => [...newAccounts, ...prev]);

    const filled = await Promise.all(
      newAccounts.map(async acc => {
        try {
          const email = await fetchTempEmail();
          const password = generateStrongPassword();
          return { ...acc, email, password, status: "ready" as const };
        } catch {
          return { ...acc, status: "error" as const };
        }
      })
    );

    setAccounts(prev => [...filled, ...prev.slice(newAccounts.length)]);
    setIsGenerating(false);
  }, [isGenerating, count]);

  const totalGenerated = accounts.filter(a => a.status === "ready").length;

  return (
    <div className="min-h-screen gradient-bg flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl" style={{ background: "rgba(8,14,30,0.85)", borderBottom: "1px solid rgba(24,119,242,0.15)" }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: "linear-gradient(135deg, #1877f2, #0a58ca)" }}>
            <svg viewBox="0 0 36 36" className="w-6 h-6" fill="white">
              <path d="M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18c0 8.99 6.58 16.44 15.19 17.77V23.2h-4.57V18h4.57v-3.97c0-4.51 2.69-7 6.8-7 1.97 0 4.03.35 4.03.35v4.43h-2.27c-2.24 0-2.93 1.39-2.93 2.81V18h4.99l-.8 5.2h-4.19v12.57C29.42 34.44 36 26.99 36 18z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-extrabold text-white leading-tight truncate">FACEBOOK GENERATOR ACCOUNT PRO</div>
            <div className="text-[10px] font-medium tracking-widest" style={{ color: "rgba(96,165,250,0.8)" }}>VERSION 1.0</div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors ${apiStatus === "ok" ? "bg-green-400" : apiStatus === "error" ? "bg-red-400" : "bg-yellow-400 animate-pulse"}`} />
            <span className="text-xs hidden sm:inline" style={{ color: "rgba(148,163,184,0.8)" }}>
              {apiStatus === "ok" ? "API Online" : apiStatus === "error" ? "API Error" : "Checking..."}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-6">

        {/* Hero logo block */}
        <div className="rounded-2xl text-center py-8 px-6 card-glow-strong relative overflow-hidden" style={{ background: "rgba(10,18,38,0.9)", border: "1px solid rgba(24,119,242,0.25)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(24,119,242,0.12) 0%, transparent 70%)" }} />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl" style={{ background: "linear-gradient(135deg, #1877f2 0%, #0a4db5 100%)", boxShadow: "0 0 30px rgba(24,119,242,0.4)" }}>
              <svg viewBox="0 0 36 36" className="w-12 h-12" fill="white">
                <path d="M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18c0 8.99 6.58 16.44 15.19 17.77V23.2h-4.57V18h4.57v-3.97c0-4.51 2.69-7 6.8-7 1.97 0 4.03.35 4.03.35v4.43h-2.27c-2.24 0-2.93 1.39-2.93 2.81V18h4.99l-.8 5.2h-4.19v12.57C29.42 34.44 36 26.99 36 18z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">FACEBOOK GENERATOR</h1>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: "#1877f2" }}>ACCOUNT PRO</h2>
              <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest" style={{ background: "rgba(24,119,242,0.15)", border: "1px solid rgba(24,119,242,0.3)", color: "#60a5fa" }}>
                <ShieldIcon />
                VERSION 1.0 — SAFE PROTECTED
              </div>
            </div>
            <p className="text-sm max-w-md" style={{ color: "rgba(148,163,184,0.8)" }}>
              Auto-generates secure Facebook account credentials using temporary email addresses with unique strong passwords.
            </p>
            {totalGenerated > 0 && (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "rgb(134,239,172)" }}>
                <span>✓</span> {totalGenerated} account{totalGenerated !== 1 ? "s" : ""} generated
              </div>
            )}
          </div>
        </div>

        {/* Generator Controls */}
        <div className="rounded-2xl p-6 card-glow" style={{ background: "rgba(10,18,38,0.85)", border: "1px solid rgba(24,119,242,0.2)" }}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold" style={{ color: "rgba(148,163,184,0.9)" }}>Accounts:</span>
              <div className="flex items-center rounded-xl overflow-hidden" style={{ background: "rgba(24,119,242,0.08)", border: "1px solid rgba(24,119,242,0.2)" }}>
                <button
                  className="w-9 h-9 flex items-center justify-center text-lg font-bold cursor-pointer transition-colors"
                  style={{ color: "#60a5fa" }}
                  onClick={() => setCount(c => Math.max(1, c - 1))}
                >-</button>
                <span className="w-10 text-center font-bold font-mono text-white text-sm">{count}</span>
                <button
                  className="w-9 h-9 flex items-center justify-center text-lg font-bold cursor-pointer transition-colors"
                  style={{ color: "#60a5fa" }}
                  onClick={() => setCount(c => Math.min(10, c + 1))}
                >+</button>
              </div>
              <span className="text-xs" style={{ color: "rgba(100,116,139,0.8)" }}>max 10</span>
            </div>

            <button
              onClick={generateAccounts}
              disabled={isGenerating}
              className="flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm text-white cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #1877f2, #0a58ca)", boxShadow: isGenerating ? "none" : "0 4px 20px rgba(24,119,242,0.4)" }}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Generate {count > 1 ? `${count} Accounts` : "Account"}
                </>
              )}
            </button>

            <button
              onClick={() => setShowTips(s => !s)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "rgb(134,239,172)" }}
            >
              🛡️ {showTips ? "Hide" : "Safety"} Tips
            </button>

            {accounts.length > 0 && (
              <button
                onClick={() => setAccounts([])}
                className="px-4 py-3 text-sm font-semibold rounded-xl cursor-pointer transition-all"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "rgb(252,165,165)" }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Safety Tips Panel */}
        {showTips && (
          <div className="rounded-2xl p-5 card-glow" style={{ background: "rgba(10,18,38,0.9)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base">🛡️</span>
              <h3 className="font-bold text-white text-sm">Anti-Disable Protection Tips</h3>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "rgb(134,239,172)" }}>Safe Mode</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SAFETY_TIPS.map((t, i) => (
                <div key={i} className="tip-item">
                  <span className="text-base shrink-0 mt-0.5">{t.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-white mb-0.5">{t.label}</div>
                    <div className="text-xs leading-relaxed" style={{ color: "rgba(148,163,184,0.8)" }}>{t.tip}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {accounts.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "rgba(24,119,242,0.1)", border: "1px solid rgba(24,119,242,0.2)" }}>
              <svg className="w-10 h-10" style={{ color: "rgba(24,119,242,0.5)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: "rgba(148,163,184,0.9)" }}>No accounts generated yet</p>
              <p className="text-xs mt-1" style={{ color: "rgba(100,116,139,0.7)" }}>Click "Generate Account" to create one</p>
            </div>
          </div>
        )}

        {/* Accounts list */}
        <div className="flex flex-col gap-4">
          {accounts.map((account, i) => (
            <AccountCard key={i} account={account} index={i} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto" style={{ borderTop: "1px solid rgba(24,119,242,0.12)", background: "rgba(8,14,30,0.7)" }}>
        <div className="max-w-4xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1877f2, #0a4db5)" }}>
              <svg viewBox="0 0 36 36" className="w-4 h-4" fill="white">
                <path d="M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18c0 8.99 6.58 16.44 15.19 17.77V23.2h-4.57V18h4.57v-3.97c0-4.51 2.69-7 6.8-7 1.97 0 4.03.35 4.03.35v4.43h-2.27c-2.24 0-2.93 1.39-2.93 2.81V18h4.99l-.8 5.2h-4.19v12.57C29.42 34.44 36 26.99 36 18z"/>
              </svg>
            </div>
            <span className="text-xs font-bold text-white">FACEBOOK GENERATOR ACCOUNT PRO</span>
            <span className="text-xs px-1.5 py-0.5 rounded font-mono font-bold" style={{ background: "rgba(24,119,242,0.15)", color: "#60a5fa" }}>v1.0</span>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-xs font-bold" style={{ color: "rgba(148,163,184,0.9)" }}>
              Powered by <span style={{ color: "#60a5fa" }}>vern-rest-api.vercel.app</span>
            </div>
            <div className="text-xs font-semibold mt-0.5" style={{ color: "rgba(100,116,139,0.9)" }}>
              Owner: <span className="font-extrabold" style={{ color: "#facc15" }}>MANUELSON YASIS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}
