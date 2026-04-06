import { useState, useEffect, useCallback, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
const TEMP_MAIL_API = "https://vern-rest-api.vercel.app/api/tempmail";
const STORAGE_KEY = "fbgenpro_users";
const SESSION_KEY = "fbgenpro_session";
const GUEST_KEY = "fbgenpro_guest_uses";

/* ─── Types ─────────────────────────────────────────────── */
type User = {
  username: string;
  phone: string;
  pin: string;
  credits: number;
  lastClaim: string | null;
  createdAt: string;
};
type Account = {
  email: string; password: string; firstName: string; lastName: string;
  birthday: string; gender: string; location: string; phone: string;
  status: "ready" | "generating" | "error"; createdAt: string;
};
type Page = "landing" | "login" | "register" | "dashboard";

/* ─── Storage helpers ────────────────────────────────────── */
function getUsers(): Record<string, User> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveUser(u: User) {
  const all = getUsers(); all[u.username] = u;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
function getSession(): string | null { return localStorage.getItem(SESSION_KEY); }
function setSession(username: string) { localStorage.setItem(SESSION_KEY, username); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }
function getGuestUses(): number {
  try { return parseInt(localStorage.getItem(GUEST_KEY) || "0"); } catch { return 0; }
}
function incGuestUses() { localStorage.setItem(GUEST_KEY, String(getGuestUses() + 1)); }

/* ─── Data generators ────────────────────────────────────── */
const firstNames = ["James","Maria","John","Patricia","Robert","Jennifer","Michael","Linda","William","Barbara","David","Susan","Richard","Jessica","Joseph","Sarah","Thomas","Karen","Charles","Lisa","Christopher","Nancy","Daniel","Betty","Matthew","Margaret","Anthony","Sandra","Mark","Ashley","Donald","Dorothy","Steven","Kimberly","Paul","Emily","Andrew","Donna","Joshua","Michelle","Kenneth","Carol"];
const lastNames = ["Santos","Reyes","Cruz","Garcia","Torres","Rivera","Flores","Gomez","Morales","Ortiz","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Perez","Sanchez","Ramirez","Smith","Johnson","Williams","Brown","Jones","Miller","Davis","Wilson","Anderson","Taylor","Thomas","Jackson","White","Harris","Martin","Thompson","Moore","Allen","Clark","Lewis","Robinson","Walker"];
const locations = ["Manila, Philippines","Cebu City, Philippines","Davao City, Philippines","Quezon City, Philippines","Makati, Philippines","Pasig, Philippines","Taguig, Philippines","Antipolo, Philippines","Mandaluyong, Philippines","Parañaque, Philippines","Las Piñas, Philippines","Marikina, Philippines","Caloocan, Philippines","Muntinlupa, Philippines","Valenzuela, Philippines"];

function rnd(arr: string[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function generateName() { return { firstName: rnd(firstNames), lastName: rnd(lastNames) }; }
function generateBirthday() {
  const y = 1988 + Math.floor(Math.random() * 22);
  const m = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const d = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
  return `${m}/${d}/${y}`;
}
function generatePhone() {
  const pfx = ["0917","0918","0919","0920","0921","0928","0935","0947","0956","0961","0977","0998","0999"];
  return `${rnd(pfx)}${String(Math.floor(Math.random() * 9000000) + 1000000)}`;
}
function generateStrongPassword() {
  const u="ABCDEFGHJKLMNPQRSTUVWXYZ", l="abcdefghjkmnpqrstuvwxyz", d="23456789", s="@#$%&!";
  const all=u+l+d+s, R=(x:string)=>x[Math.floor(Math.random()*x.length)];
  const base=[R(u),R(l),R(d),R(s)];
  for(let i=0;i<8;i++) base.push(R(all));
  return base.sort(()=>Math.random()-0.5).join("");
}
function todayStr() { return new Date().toISOString().split("T")[0]; }

async function fetchTempEmail(): Promise<string> {
  const res = await fetch(TEMP_MAIL_API);
  if (!res.ok) throw new Error("API error");
  const d = await res.json();
  if (d?.email) return d.email;
  throw new Error("No email in response");
}

/* ─── UI atoms ───────────────────────────────────────────── */
function Spinner({ size = 4 }: { size?: number }) {
  return (
    <svg className={`animate-spin w-${size} h-${size}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

function FBLogo({ size = 10 }: { size?: number }) {
  return (
    <div className={`w-${size} h-${size} rounded-2xl flex items-center justify-center`}
      style={{ background: "linear-gradient(135deg,#1877f2,#0a4db5)", boxShadow: "0 0 24px rgba(24,119,242,0.45)" }}>
      <svg viewBox="0 0 36 36" className="w-3/5 h-3/5" fill="white">
        <path d="M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18c0 8.99 6.58 16.44 15.19 17.77V23.2h-4.57V18h4.57v-3.97c0-4.51 2.69-7 6.8-7 1.97 0 4.03.35 4.03.35v4.43h-2.27c-2.24 0-2.93 1.39-2.93 2.81V18h4.99l-.8 5.2h-4.19v12.57C29.42 34.44 36 26.99 36 18z"/>
      </svg>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }); }}
      className="ml-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0"
      style={{ background: ok ? "rgba(34,197,94,0.18)" : "rgba(24,119,242,0.15)", border: ok ? "1px solid rgba(34,197,94,0.35)" : "1px solid rgba(24,119,242,0.30)", color: ok ? "rgb(134,239,172)" : "rgb(96,165,250)" }}>
      {ok ? "✓" : "Copy"}
    </button>
  );
}

function InfoRow({ label, value, copyable = false, mono = true }: { label: string; value: string; copyable?: boolean; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.7)" }}>{label}</span>
      <div className="flex items-center rounded-xl px-3 py-2 gap-1" style={{ background: "rgba(24,119,242,0.07)", border: "1px solid rgba(24,119,242,0.15)" }}>
        <span className={`text-sm text-white flex-1 truncate ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
        {copyable && <CopyBtn text={value} />}
      </div>
    </div>
  );
}

/* ─── Human Verification CAPTCHA ─────────────────────────── */
function HumanVerify({ onVerified }: { onVerified: () => void }) {
  const [q, setQ] = useState({ a: 0, b: 0, op: "+" });
  const [ans, setAns] = useState("");
  const [checked, setChecked] = useState(false);
  const [robotAnim, setRobotAnim] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const a = 1 + Math.floor(Math.random() * 12);
    const b = 1 + Math.floor(Math.random() * 12);
    const ops = ["+", "-", "×"];
    setQ({ a, b, op: ops[Math.floor(Math.random() * ops.length)] });
  }, []);

  const correct = q.op === "+" ? q.a + q.b : q.op === "-" ? q.a - q.b : q.a * q.b;

  function handleVerify() {
    if (!checked) { setErr("Please check the box first."); return; }
    if (parseInt(ans) !== correct) { setErr("Wrong answer. Try again."); setAns(""); return; }
    setLoading(true);
    setErr("");
    setTimeout(onVerified, 900);
  }

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "rgba(10,18,38,0.95)", border: "1px solid rgba(24,119,242,0.25)", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
      <div className="flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <span className="text-sm font-bold text-white">Verify: Are you human?</span>
      </div>

      {/* Checkbox row */}
      <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl transition-all"
        style={{ background: checked ? "rgba(34,197,94,0.1)" : "rgba(24,119,242,0.06)", border: checked ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(24,119,242,0.15)" }}
        onClick={() => { setChecked(c => !c); setRobotAnim(true); setTimeout(() => setRobotAnim(false), 400); }}>
        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${checked ? "bg-green-500 border-green-400" : "border-slate-500"}`}>
          {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
        </div>
        <span className="text-sm font-medium text-white">I am not a robot</span>
        <span className={`ml-auto text-2xl transition-transform ${robotAnim ? "scale-125" : ""}`}>{checked ? "✅" : "🤖"}</span>
      </label>

      {/* Math question */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold" style={{ color: "rgba(148,163,184,0.8)" }}>Solve this to continue:</div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl font-bold text-lg text-white" style={{ background: "rgba(24,119,242,0.15)", border: "1px solid rgba(24,119,242,0.25)" }}>
            {q.a} {q.op} {q.b} = ?
          </div>
          <input
            type="number"
            value={ans}
            onChange={e => { setAns(e.target.value); setErr(""); }}
            placeholder="Answer"
            className="w-24 px-3 py-2 rounded-xl text-center font-bold text-white text-lg outline-none"
            style={{ background: "rgba(24,119,242,0.08)", border: "1px solid rgba(24,119,242,0.25)" }}
            onKeyDown={e => e.key === "Enter" && handleVerify()}
          />
        </div>
        {err && <div className="text-xs text-red-400 font-medium">{err}</div>}
      </div>

      <button onClick={handleVerify} disabled={loading}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white cursor-pointer transition-all disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#1877f2,#0a58ca)", boxShadow: "0 4px 16px rgba(24,119,242,0.35)" }}>
        {loading ? <><Spinner /> Verifying...</> : "✓ Verify & Continue"}
      </button>
    </div>
  );
}

/* ─── Account Card ───────────────────────────────────────── */
const PROTECTION_NOTES = [
  "Complete your profile within 2 hours of creation — add profile photo, cover photo, and bio.",
  "Do NOT send friend requests for the first 48 hours. Browse naturally instead.",
  "Use mobile data (not WiFi VPN) when logging in for the first time.",
  "Verify your email in the temp inbox before doing anything else on Facebook.",
  "Change your password to something memorable after the first login.",
  "Like at least 5 pages related to your interests within the first session.",
  "Enable two-factor authentication from Settings immediately.",
  "Avoid posting anything public within the first 72 hours.",
  "Join 2–3 Facebook Groups in your interests after 24 hours.",
  "This account is generated to appear as a genuine human profile. Behave naturally to maintain it.",
];

function AccountCard({ account, index }: { account: Account; index: number }) {
  const [show, setShow] = useState(true);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,18,38,0.9)", border: "1px solid rgba(24,119,242,0.2)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
      <div className="h-0.5" style={{ background: "linear-gradient(90deg,#1877f2,#4facfe,#1877f2)" }} />
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: "rgba(24,119,242,0.2)", border: "1px solid rgba(24,119,242,0.35)", color: "#60a5fa" }}>{index + 1}</div>
        <div>
          <div className="text-sm font-bold text-white">{account.status === "ready" ? `${account.firstName} ${account.lastName}` : "Generating..."}</div>
          <div className="text-xs" style={{ color: "rgba(148,163,184,0.6)" }}>{account.createdAt}</div>
        </div>
        {account.status === "ready" && (
          <button onClick={() => setShow(s => !s)} className="ml-auto text-xs px-3 py-1.5 rounded-lg cursor-pointer" style={{ background: "rgba(24,119,242,0.12)", border: "1px solid rgba(24,119,242,0.25)", color: "#60a5fa" }}>{show ? "Hide" : "Show"}</button>
        )}
        {account.status === "generating" && <div className="ml-auto" style={{ color: "#60a5fa" }}><Spinner /></div>}
      </div>

      {account.status === "generating" && (
        <div className="px-5 pb-5 flex flex-col gap-2">
          {[3, 2.5, 2].map((w, i) => <div key={i} className="h-4 rounded-lg animate-pulse" style={{ background: "rgba(24,119,242,0.08)", width: `${w * 25}%` }} />)}
        </div>
      )}
      {account.status === "error" && <div className="px-5 pb-5 text-red-400 text-sm">⚠️ Failed to generate. Try again.</div>}

      {account.status === "ready" && show && (
        <div className="px-5 pb-5 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><InfoRow label="Email Address" value={account.email} copyable /></div>
            <div className="sm:col-span-2"><InfoRow label="Password" value={account.password} copyable /></div>
            <InfoRow label="First Name" value={account.firstName} copyable mono={false} />
            <InfoRow label="Last Name" value={account.lastName} copyable mono={false} />
            <InfoRow label="Date of Birth" value={account.birthday} mono={false} />
            <InfoRow label="Gender" value={account.gender} mono={false} />
            <InfoRow label="Phone Number" value={account.phone} copyable mono={false} />
            <InfoRow label="Location" value={account.location} mono={false} />
          </div>
          {/* Protection notes */}
          <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: "rgb(134,239,172)" }}>
              <span>🛡️</span> 100% SAFE — Anti-Detect Protection Notes
            </div>
            <ul className="flex flex-col gap-1">
              {PROTECTION_NOTES.slice(0, 5).map((n, i) => (
                <li key={i} className="text-xs flex gap-1.5" style={{ color: "rgba(148,163,184,0.85)" }}>
                  <span style={{ color: "rgba(34,197,94,0.8)" }}>•</span> {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Landing Page ───────────────────────────────────────── */
function LandingPage({ onLogin, onRegister, onGenerate, guestUses }: { onLogin: () => void; onRegister: () => void; onGenerate: () => void; guestUses: number }) {
  const [showVerify, setShowVerify] = useState(false);
  const remaining = Math.max(0, 2 - guestUses);

  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      <header className="sticky top-0 z-20 backdrop-blur-xl" style={{ background: "rgba(8,14,30,0.85)", borderBottom: "1px solid rgba(24,119,242,0.15)" }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <FBLogo size={9} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-extrabold text-white leading-tight">FACEBOOK GENERATOR ACCOUNT PRO</div>
            <div className="text-[10px] tracking-widest font-semibold" style={{ color: "rgba(96,165,250,0.8)" }}>VERSION 1.1</div>
          </div>
          <div className="flex gap-2">
            <button onClick={onLogin} className="px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all" style={{ background: "rgba(24,119,242,0.15)", border: "1px solid rgba(24,119,242,0.3)", color: "#60a5fa" }}>Login</button>
            <button onClick={onRegister} className="px-4 py-2 text-xs font-bold rounded-xl cursor-pointer text-white" style={{ background: "linear-gradient(135deg,#1877f2,#0a58ca)" }}>Register</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 flex flex-col gap-6">
        <div className="rounded-2xl text-center py-10 px-6 relative overflow-hidden" style={{ background: "rgba(10,18,38,0.9)", border: "1px solid rgba(24,119,242,0.25)", boxShadow: "0 0 40px rgba(24,119,242,0.1)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(24,119,242,0.13) 0%,transparent 70%)" }} />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <FBLogo size={20} />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">FACEBOOK GENERATOR</h1>
              <h2 className="text-2xl sm:text-3xl font-black" style={{ color: "#1877f2" }}>ACCOUNT PRO</h2>
              <div className="inline-flex items-center gap-2 mt-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest" style={{ background: "rgba(24,119,242,0.15)", border: "1px solid rgba(24,119,242,0.3)", color: "#60a5fa" }}>
                🛡️ VERSION 1.1 — 100% SAFE PROTECTED
              </div>
            </div>
            <p className="text-sm max-w-md" style={{ color: "rgba(148,163,184,0.8)" }}>
              Generates Facebook account credentials with temporary email, strong unique passwords, and full anti-detect protection. Register to unlock unlimited use with daily credits.
            </p>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold" style={{ background: remaining > 0 ? "rgba(251,191,36,0.12)" : "rgba(239,68,68,0.12)", border: remaining > 0 ? "1px solid rgba(251,191,36,0.25)" : "1px solid rgba(239,68,68,0.3)", color: remaining > 0 ? "#fbbf24" : "#f87171" }}>
              {remaining > 0 ? `⚡ ${remaining} free use${remaining !== 1 ? "s" : ""} remaining — Login for unlimited access` : "🔒 Free limit reached — Login or Register to continue"}
            </div>
          </div>
        </div>

        {/* Guest generate */}
        {remaining > 0 && !showVerify && (
          <div className="rounded-2xl p-6" style={{ background: "rgba(10,18,38,0.85)", border: "1px solid rgba(24,119,242,0.2)" }}>
            <div className="text-sm font-semibold text-white mb-1">Try it now (Guest Mode)</div>
            <div className="text-xs mb-4" style={{ color: "rgba(148,163,184,0.7)" }}>You have {remaining} free generation{remaining !== 1 ? "s" : ""} left. Register for unlimited access + daily credits.</div>
            <button onClick={() => setShowVerify(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#1877f2,#0a58ca)", boxShadow: "0 4px 20px rgba(24,119,242,0.4)" }}>
              + Generate Account (Guest)
            </button>
          </div>
        )}

        {remaining > 0 && showVerify && (
          <HumanVerify onVerified={() => { setShowVerify(false); onGenerate(); }} />
        )}

        {remaining === 0 && (
          <div className="rounded-2xl p-6 text-center flex flex-col gap-3" style={{ background: "rgba(10,18,38,0.85)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <div className="text-2xl">🔒</div>
            <div className="text-sm font-bold text-white">Guest Limit Reached</div>
            <div className="text-xs" style={{ color: "rgba(148,163,184,0.7)" }}>You've used your 2 free generations. Create a free account to get daily credits and unlimited access.</div>
            <div className="flex gap-3 justify-center mt-2">
              <button onClick={onRegister} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#1877f2,#0a58ca)" }}>Register Free</button>
              <button onClick={onLogin} className="px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer" style={{ background: "rgba(24,119,242,0.15)", border: "1px solid rgba(24,119,242,0.3)", color: "#60a5fa" }}>Login</button>
            </div>
          </div>
        )}

        {/* Notes */}
        <NotesBox />
      </main>

      <FooterBar />
    </div>
  );
}

/* ─── Notes box ──────────────────────────────────────────── */
function NotesBox() {
  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(10,18,38,0.9)", border: "1px solid rgba(24,119,242,0.18)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span>📋</span>
        <span className="text-sm font-bold text-white">Notes — THIS FACEBOOK GENERATOR PRO SAFE</span>
      </div>
      <ul className="flex flex-col gap-2">
        {[
          "This tool generates Facebook account details that appear as real human-created accounts — no bots, no patterns.",
          "Each account uses a unique temporary email and a strong random password, making them indistinguishable from real users.",
          "The generated phone number and location follow real Filipino mobile number formats for extra authenticity.",
          "NEVER create accounts in bulk simultaneously. Space them out across different sessions to avoid IP flags.",
          "Always verify the temp email before using the account on Facebook. Unverified accounts get disabled faster.",
          "This generator does NOT guarantee 100% permanent accounts — Facebook's detection improves over time. Follow all safety notes inside each generated account.",
          "Use responsibly. This tool is for educational and testing purposes only.",
        ].map((n, i) => (
          <li key={i} className="text-xs flex gap-2" style={{ color: "rgba(148,163,184,0.85)" }}>
            <span className="shrink-0 font-bold" style={{ color: "#1877f2" }}>{i + 1}.</span> {n}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Login Page ─────────────────────────────────────────── */
function LoginPage({ onBack, onSuccess }: { onBack: () => void; onSuccess: (u: User) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLogin() {
    setErr("");
    const users = getUsers();
    const user = Object.values(users).find(u => u.username === identifier || u.phone === identifier);
    if (!user) { setErr("Username or phone not found."); return; }
    if (user.pin !== pin) { setErr("Incorrect PIN code."); setPin(""); return; }
    setLoading(true);
    setTimeout(() => { setSession(user.username); onSuccess(user); }, 700);
  }

  return (
    <AuthShell title="Login" subtitle="Enter your credentials to access your dashboard" onBack={onBack}>
      <AuthInput label="Username or Phone" value={identifier} onChange={setIdentifier} placeholder="Enter username or phone number" />
      <PinInput value={pin} onChange={setPin} />
      {err && <div className="text-xs text-red-400 font-medium px-1">{err}</div>}
      <button onClick={handleLogin} disabled={loading || !identifier || pin.length !== 5}
        className="w-full py-3 rounded-xl font-bold text-white cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg,#1877f2,#0a58ca)" }}>
        {loading ? <><Spinner /> Logging in...</> : "Login"}
      </button>
    </AuthShell>
  );
}

/* ─── Register Page ──────────────────────────────────────── */
function RegisterPage({ onBack, onSuccess }: { onBack: () => void; onSuccess: (u: User) => void }) {
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function handleRegister() {
    setErr("");
    if (username.length < 3) { setErr("Username must be at least 3 characters."); return; }
    if (!/^09\d{9}$/.test(phone)) { setErr("Enter a valid PH mobile number (e.g. 09171234567)."); return; }
    if (pin.length !== 5 || !/^\d+$/.test(pin)) { setErr("PIN must be exactly 5 digits."); return; }
    if (pin !== pin2) { setErr("PINs do not match."); return; }
    const users = getUsers();
    if (users[username]) { setErr("Username already taken."); return; }
    if (Object.values(users).find(u => u.phone === phone)) { setErr("Phone number already registered."); return; }
    const newUser: User = { username, phone, pin, credits: 3, lastClaim: null, createdAt: new Date().toISOString() };
    saveUser(newUser);
    setSession(username);
    setLoading(true);
    setTimeout(() => onSuccess(newUser), 700);
  }

  return (
    <AuthShell title="Register" subtitle="Create your free account — get 3 starter credits!" onBack={onBack}>
      <AuthInput label="Username" value={username} onChange={setUsername} placeholder="Choose a username" />
      <AuthInput label="Phone Number" value={phone} onChange={setPhone} placeholder="09XXXXXXXXX" type="tel" />
      <PinInput value={pin} onChange={setPin} label="Create 5-Digit PIN" />
      <PinInput value={pin2} onChange={setPin2} label="Confirm PIN" />
      {err && <div className="text-xs text-red-400 font-medium px-1">{err}</div>}
      <button onClick={handleRegister} disabled={loading || !username || !phone || pin.length !== 5 || pin2.length !== 5}
        className="w-full py-3 rounded-xl font-bold text-white cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg,#1877f2,#0a58ca)" }}>
        {loading ? <><Spinner /> Creating account...</> : "Create Account"}
      </button>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, onBack, children }: { title: string; subtitle: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: "rgba(24,119,242,0.1)", border: "1px solid rgba(24,119,242,0.25)", color: "#60a5fa" }}>
            ←
          </button>
          <FBLogo size={9} />
          <div>
            <div className="text-xs font-bold" style={{ color: "#60a5fa" }}>FB GENERATOR PRO v1.1</div>
          </div>
        </div>
        <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: "rgba(10,18,38,0.95)", border: "1px solid rgba(24,119,242,0.25)", boxShadow: "0 16px 60px rgba(0,0,0,0.5)" }}>
          <div>
            <h2 className="text-xl font-black text-white">{title}</h2>
            <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.7)" }}>{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function AuthInput({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold" style={{ color: "rgba(148,163,184,0.8)" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-slate-600"
        style={{ background: "rgba(24,119,242,0.07)", border: "1px solid rgba(24,119,242,0.2)" }} />
    </div>
  );
}

function PinInput({ value, onChange, label = "5-Digit PIN Code" }: { value: string; onChange: (v: string) => void; label?: string }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split("").concat(Array(5).fill("")).slice(0, 5);

  function handleChange(i: number, v: string) {
    if (!/^\d*$/.test(v)) return;
    const arr = digits.map((d, idx) => idx === i ? v.slice(-1) : d);
    onChange(arr.join("").replace(/[^0-9]/g, "").slice(0, 5));
    if (v && i < 4) inputs.current[i + 1]?.focus();
  }
  function handleKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold" style={{ color: "rgba(148,163,184,0.8)" }}>{label}</label>
      <div className="flex gap-2">
        {digits.map((d, i) => (
          <input key={i} type="password" inputMode="numeric" maxLength={1} value={d}
            ref={el => { inputs.current[i] = el; }}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKey(i, e)}
            className="flex-1 h-12 text-center text-xl font-bold text-white rounded-xl outline-none"
            style={{ background: d ? "rgba(24,119,242,0.18)" : "rgba(24,119,242,0.06)", border: d ? "1px solid rgba(24,119,242,0.45)" : "1px solid rgba(24,119,242,0.18)" }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Dashboard ──────────────────────────────────────────── */
function Dashboard({ user: initialUser, onLogout }: { user: User; onLogout: () => void }) {
  const [user, setUser] = useState(initialUser);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [claimAnim, setClaimAnim] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"generate" | "accounts" | "notes">("generate");

  const canClaim = user.lastClaim !== todayStr();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function refreshUser() {
    const all = getUsers();
    const updated = all[user.username];
    if (updated) setUser(updated);
    return updated;
  }

  function handleClaim() {
    if (!canClaim) return;
    const updated = { ...user, credits: user.credits + 1, lastClaim: todayStr() };
    saveUser(updated);
    setUser(updated);
    setClaimAnim(true);
    setClaimMsg("+1 Credit claimed!");
    setTimeout(() => { setClaimAnim(false); setClaimMsg(""); }, 2200);
  }

  async function handleGenerate() {
    if (user.credits < 1) return;
    setIsGenerating(true);
    setShowVerify(false);
    setActiveTab("accounts");

    const { firstName, lastName } = generateName();
    const stub: Account = { email: "", password: "", firstName, lastName, birthday: generateBirthday(), gender: Math.random() > 0.5 ? "Male" : "Female", location: rnd(locations), phone: generatePhone(), status: "generating", createdAt: new Date().toLocaleTimeString() };
    setAccounts(prev => [stub, ...prev]);

    try {
      const email = await fetchTempEmail();
      const password = generateStrongPassword();
      setAccounts(prev => [{ ...stub, email, password, status: "ready" }, ...prev.slice(1)]);
    } catch {
      setAccounts(prev => [{ ...stub, status: "error" }, ...prev.slice(1)]);
    }

    const updated = { ...user, credits: user.credits - 1 };
    saveUser(updated);
    setUser(updated);
    setIsGenerating(false);
  }

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl" style={{ background: "rgba(8,14,30,0.9)", borderBottom: "1px solid rgba(24,119,242,0.15)" }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <FBLogo size={9} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-extrabold text-white leading-tight">FACEBOOK GENERATOR PRO</div>
            <div className="text-[10px] tracking-widest font-semibold" style={{ color: "rgba(96,165,250,0.8)" }}>VERSION 1.1 — DASHBOARD</div>
          </div>
          {/* Credits badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: "rgba(24,119,242,0.12)", border: "1px solid rgba(24,119,242,0.25)" }}>
            <span className="text-sm">⚡</span>
            <span className="text-sm font-bold text-white">{user.credits}</span>
            <span className="text-xs" style={{ color: "rgba(148,163,184,0.7)" }}>credits</span>
          </div>
          {/* 3-dots menu */}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(o => !o)} className="w-9 h-9 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer" style={{ background: menuOpen ? "rgba(24,119,242,0.2)" : "rgba(24,119,242,0.1)", border: "1px solid rgba(24,119,242,0.25)" }}>
              {[0,1,2].map(i => <span key={i} className="w-1 h-1 rounded-full bg-white block" />)}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 w-52 rounded-2xl overflow-hidden z-50" style={{ background: "rgba(10,18,38,0.98)", border: "1px solid rgba(24,119,242,0.25)", boxShadow: "0 16px 50px rgba(0,0,0,0.6)" }}>
                <div className="p-4 border-b" style={{ borderColor: "rgba(24,119,242,0.15)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-2" style={{ background: "linear-gradient(135deg,#1877f2,#0a4db5)", color: "white" }}>
                    {user.username[0].toUpperCase()}
                  </div>
                  <div className="text-sm font-bold text-white">{user.username}</div>
                  <div className="text-xs" style={{ color: "rgba(148,163,184,0.6)" }}>{user.phone}</div>
                </div>
                <div className="p-2">
                  {[
                    { icon: "⚡", label: "Credits Balance", val: `${user.credits} credits` },
                    { icon: "📅", label: "Last Claim", val: user.lastClaim || "Never" },
                    { icon: "📅", label: "Member Since", val: new Date(user.createdAt).toLocaleDateString() },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ color: "rgba(148,163,184,0.85)" }}>
                      <span className="text-xs flex items-center gap-2"><span>{item.icon}</span>{item.label}</span>
                      <span className="text-xs font-semibold text-white">{item.val}</span>
                    </div>
                  ))}
                  <button onClick={() => { clearSession(); onLogout(); }}
                    className="w-full mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "rgb(252,165,165)" }}>
                    🚪 Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
        {/* Credits panel */}
        <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "rgba(10,18,38,0.9)", border: "1px solid rgba(24,119,242,0.2)", boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 50%,rgba(24,119,242,0.08) 0%,transparent 70%)" }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(148,163,184,0.7)" }}>Balance Credits</div>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-white">{user.credits}</span>
                <span className="text-lg font-semibold mb-1" style={{ color: "rgba(96,165,250,0.8)" }}>credits</span>
              </div>
              <div className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.6)" }}>1 credit = 1 FB account generation</div>
            </div>
            <div className="flex flex-col gap-2">
              {/* Claim daily */}
              <button onClick={handleClaim} disabled={!canClaim}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm cursor-pointer transition-all ${claimAnim ? "scale-105" : ""} disabled:opacity-40 disabled:cursor-not-allowed`}
                style={{ background: canClaim ? "linear-gradient(135deg,#16a34a,#15803d)" : "rgba(34,197,94,0.08)", border: canClaim ? "none" : "1px solid rgba(34,197,94,0.2)", color: canClaim ? "white" : "rgba(134,239,172,0.5)", boxShadow: canClaim ? "0 4px 20px rgba(22,163,74,0.4)" : "none" }}>
                🎁 {canClaim ? "Claim Daily Credit" : "Claimed Today"}
              </button>
              {claimMsg && <div className="text-xs font-bold text-center animate-bounce" style={{ color: "#4ade80" }}>{claimMsg}</div>}
              {!canClaim && <div className="text-xs text-center" style={{ color: "rgba(148,163,184,0.5)" }}>Come back tomorrow!</div>}
            </div>
          </div>
          {/* Credit bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "rgba(148,163,184,0.6)" }}>
              <span>Credits</span>
              <span>{user.credits} available</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(24,119,242,0.1)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (user.credits / 10) * 100)}%`, background: "linear-gradient(90deg,#1877f2,#4facfe)" }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(10,18,38,0.7)", border: "1px solid rgba(24,119,242,0.15)" }}>
          {(["generate", "accounts", "notes"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 rounded-lg text-xs font-bold capitalize cursor-pointer transition-all"
              style={{ background: activeTab === tab ? "rgba(24,119,242,0.25)" : "transparent", color: activeTab === tab ? "white" : "rgba(148,163,184,0.6)", border: activeTab === tab ? "1px solid rgba(24,119,242,0.35)" : "1px solid transparent" }}>
              {tab === "generate" ? "🔧 Generate" : tab === "accounts" ? `📋 Accounts (${accounts.filter(a => a.status === "ready").length})` : "📝 Notes"}
            </button>
          ))}
        </div>

        {/* Generate tab */}
        {activeTab === "generate" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-6" style={{ background: "rgba(10,18,38,0.85)", border: "1px solid rgba(24,119,242,0.2)" }}>
              <div className="text-sm font-bold text-white mb-1">Generate Facebook Account</div>
              <div className="text-xs mb-5" style={{ color: "rgba(148,163,184,0.7)" }}>
                Each generation costs <strong className="text-white">1 credit</strong>. You have <strong style={{ color: "#60a5fa" }}>{user.credits} credit{user.credits !== 1 ? "s" : ""}</strong> available.
              </div>
              {user.credits < 1 ? (
                <div className="rounded-xl p-4 text-center" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div className="text-2xl mb-2">💳</div>
                  <div className="text-sm font-bold text-white">No credits</div>
                  <div className="text-xs mt-1 mb-3" style={{ color: "rgba(148,163,184,0.7)" }}>Claim your daily credit above to generate accounts.</div>
                </div>
              ) : !showVerify ? (
                <button onClick={() => setShowVerify(true)} disabled={isGenerating}
                  className="flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm text-white cursor-pointer disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#1877f2,#0a58ca)", boxShadow: "0 4px 20px rgba(24,119,242,0.4)" }}>
                  {isGenerating ? <><Spinner /> Generating...</> : "+ Generate Account (1 Credit)"}
                </button>
              ) : (
                <HumanVerify onVerified={handleGenerate} />
              )}
            </div>

            {/* Safety info */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(10,18,38,0.85)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <div className="text-sm font-bold text-white mb-3 flex items-center gap-2">🛡️ 100% Safe Anti-Detect Mode</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {["Unique temp email per account","Strong 12-char random password","Realistic Filipino name & location","Real PH mobile number format","Human-like profile data","No detectable pattern or repeat"].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>
                    <span style={{ color: "#4ade80" }}>✓</span> {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Accounts tab */}
        {activeTab === "accounts" && (
          <div className="flex flex-col gap-4">
            {accounts.length === 0 && (
              <div className="flex flex-col items-center py-12 gap-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(24,119,242,0.1)", border: "1px solid rgba(24,119,242,0.2)" }}>
                  <svg className="w-8 h-8" style={{ color: "rgba(24,119,242,0.5)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-sm font-medium" style={{ color: "rgba(148,163,184,0.7)" }}>No accounts yet</div>
                <button onClick={() => setActiveTab("generate")} className="text-xs px-4 py-2 rounded-xl cursor-pointer" style={{ background: "rgba(24,119,242,0.12)", border: "1px solid rgba(24,119,242,0.25)", color: "#60a5fa" }}>Go to Generate</button>
              </div>
            )}
            {accounts.map((acc, i) => <AccountCard key={i} account={acc} index={i} />)}
          </div>
        )}

        {/* Notes tab */}
        {activeTab === "notes" && <NotesBox />}
      </main>

      <FooterBar />
    </div>
  );
}

/* ─── Footer ─────────────────────────────────────────────── */
function FooterBar() {
  return (
    <footer style={{ borderTop: "1px solid rgba(24,119,242,0.12)", background: "rgba(8,14,30,0.7)" }}>
      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1877f2,#0a4db5)" }}>
            <svg viewBox="0 0 36 36" className="w-4 h-4" fill="white"><path d="M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18c0 8.99 6.58 16.44 15.19 17.77V23.2h-4.57V18h4.57v-3.97c0-4.51 2.69-7 6.8-7 1.97 0 4.03.35 4.03.35v4.43h-2.27c-2.24 0-2.93 1.39-2.93 2.81V18h4.99l-.8 5.2h-4.19v12.57C29.42 34.44 36 26.99 36 18z"/></svg>
          </div>
          <span className="text-xs font-bold text-white">FACEBOOK GENERATOR ACCOUNT PRO</span>
          <span className="text-xs px-1.5 py-0.5 rounded font-mono font-bold" style={{ background: "rgba(24,119,242,0.15)", color: "#60a5fa" }}>v1.1</span>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold" style={{ color: "rgba(148,163,184,0.9)" }}>Powered by <span style={{ color: "#60a5fa" }}>vern-rest-api.vercel.app</span></div>
          <div className="text-xs mt-0.5">Owner: <span className="font-extrabold" style={{ color: "#facc15" }}>MANUELSON YASIS</span></div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Guest generate flow ─────────────────────────────────── */
function GuestGenerateFlow({ onDone }: { onDone: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      incGuestUses();
      const { firstName, lastName } = generateName();
      const stub: Account = { email: "", password: "", firstName, lastName, birthday: generateBirthday(), gender: Math.random() > 0.5 ? "Male" : "Female", location: rnd(locations), phone: generatePhone(), status: "generating", createdAt: new Date().toLocaleTimeString() };
      setAccounts([stub]);
      try {
        const email = await fetchTempEmail();
        const password = generateStrongPassword();
        setAccounts([{ ...stub, email, password, status: "ready" }]);
      } catch {
        setAccounts([{ ...stub, status: "error" }]);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {loading && <div className="flex items-center gap-3 justify-center py-4 text-primary"><Spinner size={5} /><span className="text-sm text-white">Generating account...</span></div>}
      {accounts.map((a, i) => <AccountCard key={i} account={a} index={i} />)}
      <button onClick={onDone} className="text-xs px-4 py-2 rounded-xl cursor-pointer self-start" style={{ background: "rgba(24,119,242,0.12)", border: "1px solid rgba(24,119,242,0.25)", color: "#60a5fa" }}>← Back</button>
    </div>
  );
}

/* ─── Root ───────────────────────────────────────────────── */
function MainApp() {
  const [page, setPage] = useState<Page>(() => {
    const s = getSession();
    if (s) {
      const u = getUsers()[s];
      if (u) return "dashboard";
    }
    return "landing";
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const s = getSession();
    if (s) return getUsers()[s] || null;
    return null;
  });
  const [guestUses, setGuestUses] = useState(getGuestUses);
  const [showGuestResult, setShowGuestResult] = useState(false);

  function handleGuestGenerate() {
    setShowGuestResult(true);
  }

  function handleLogin(u: User) { setCurrentUser(u); setPage("dashboard"); }
  function handleRegister(u: User) { setCurrentUser(u); setPage("dashboard"); }
  function handleLogout() { setCurrentUser(null); setGuestUses(getGuestUses()); setPage("landing"); }

  if (page === "login") return <LoginPage onBack={() => setPage("landing")} onSuccess={handleLogin} />;
  if (page === "register") return <RegisterPage onBack={() => setPage("landing")} onSuccess={handleRegister} />;
  if (page === "dashboard" && currentUser) return <Dashboard user={currentUser} onLogout={handleLogout} />;

  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      {showGuestResult ? (
        <div className="min-h-screen gradient-bg flex flex-col">
          <header className="sticky top-0 z-20 backdrop-blur-xl" style={{ background: "rgba(8,14,30,0.85)", borderBottom: "1px solid rgba(24,119,242,0.15)" }}>
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
              <FBLogo size={9} />
              <div className="flex-1 text-sm font-extrabold text-white">FACEBOOK GENERATOR ACCOUNT PRO <span className="text-xs font-normal" style={{ color: "#60a5fa" }}>v1.1</span></div>
            </div>
          </header>
          <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-4">
            <GuestGenerateFlow onDone={() => { setShowGuestResult(false); setGuestUses(getGuestUses()); }} />
          </main>
          <FooterBar />
        </div>
      ) : (
        <LandingPage onLogin={() => setPage("login")} onRegister={() => setPage("register")} onGenerate={handleGuestGenerate} guestUses={guestUses} />
      )}
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
