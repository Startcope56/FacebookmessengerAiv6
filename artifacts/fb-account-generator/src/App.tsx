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
};

function generateName(): { firstName: string; lastName: string } {
  const firstNames = [
    "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie",
    "Avery", "Quinn", "Blake", "Cameron", "Drew", "Emery", "Hayden",
    "Jesse", "Kendall", "Lee", "Logan", "Mason", "Noel", "Parker",
    "Reagan", "Sage", "Skylar", "Peyton", "Robin", "Shannon", "Sydney",
    "Tanner", "Tyler", "Sam", "River", "Phoenix", "Max", "Charlie"
  ];
  const lastNames = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Wilson", "Anderson", "Taylor", "Thomas", "Jackson", "White",
    "Harris", "Martin", "Thompson", "Moore", "Allen", "Clark", "Lewis",
    "Robinson", "Walker", "Hall", "Young", "King", "Wright", "Lopez",
    "Hill", "Scott", "Green", "Adams", "Nelson", "Carter", "Mitchell"
  ];
  return {
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
  };
}

function generateBirthday(): string {
  const year = 1985 + Math.floor(Math.random() * 25);
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
  return `${month}/${day}/${year}`;
}

function generateGender(): string {
  return Math.random() > 0.5 ? "Male" : "Female";
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
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-2 px-2 py-0.5 text-xs rounded bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 transition-all cursor-pointer"
      title="Copy"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function AccountCard({
  account,
  index,
}: {
  account: Account;
  index: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-lg flex flex-col gap-3 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-t-xl" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Account #{index + 1}
        </span>
        <span className="text-xs text-muted-foreground">{account.createdAt}</span>
      </div>

      {account.status === "generating" && (
        <div className="flex items-center gap-2 py-4 justify-center text-primary">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm text-muted-foreground">Generating account info...</span>
        </div>
      )}

      {account.status === "error" && (
        <div className="flex items-center gap-2 py-4 justify-center text-destructive">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">Failed to generate email. Please try again.</span>
        </div>
      )}

      {account.status === "ready" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow label="Email / Username" value={account.email} copyable />
          <InfoRow label="Password" value={account.password} copyable />
          <InfoRow label="First Name" value={account.firstName} copyable />
          <InfoRow label="Last Name" value={account.lastName} copyable />
          <InfoRow label="Birthday" value={account.birthday} />
          <InfoRow label="Gender" value={account.gender} />
        </div>
      )}

      {account.status === "ready" && (
        <div className="mt-2 rounded-lg bg-primary/10 border border-primary/20 p-3 text-xs text-primary leading-relaxed">
          <strong>Tip:</strong> Use the email above as your Facebook email and the same value as your password.
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="flex items-center gap-1 bg-secondary/50 rounded-lg px-3 py-1.5 border border-border">
        <span className="text-sm text-foreground font-mono flex-1 truncate">{value}</span>
        {copyable && <CopyButton text={value} />}
      </div>
    </div>
  );
}

function FBIcon() {
  return (
    <svg viewBox="0 0 36 36" className="w-8 h-8" fill="#1877F2">
      <path d="M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18c0 8.99 6.58 16.44 15.19 17.77V23.2h-4.57V18h4.57v-3.97c0-4.51 2.69-7 6.8-7 1.97 0 4.03.35 4.03.35v4.43h-2.27c-2.24 0-2.93 1.39-2.93 2.81V18h4.99l-.8 5.2h-4.19v12.57C29.42 34.44 36 26.99 36 18z" />
    </svg>
  );
}

function MainApp() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [count, setCount] = useState(1);
  const [apiStatus, setApiStatus] = useState<"unknown" | "ok" | "error">("unknown");

  useEffect(() => {
    fetch(TEMP_MAIL_API)
      .then((r) => {
        if (r.ok) setApiStatus("ok");
        else setApiStatus("error");
      })
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
      };
    });

    setAccounts((prev) => [...newAccounts, ...prev]);

    const filledAccounts = await Promise.all(
      newAccounts.map(async (acc) => {
        try {
          const email = await fetchTempEmail();
          return {
            ...acc,
            email,
            password: email,
            status: "ready" as const,
          };
        } catch {
          return { ...acc, status: "error" as const };
        }
      })
    );

    setAccounts((prev) => {
      const rest = prev.slice(newAccounts.length);
      return [...filledAccounts, ...rest];
    });

    setIsGenerating(false);
  }, [isGenerating, count]);

  const clearAll = () => setAccounts([]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <FBIcon />
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">FB Account Generator</h1>
            <p className="text-xs text-muted-foreground">Auto-generates Facebook account info using temp email</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${apiStatus === "ok" ? "bg-green-400" : apiStatus === "error" ? "bg-red-400" : "bg-yellow-400 animate-pulse"}`} />
            <span className="text-xs text-muted-foreground">
              {apiStatus === "ok" ? "API Online" : apiStatus === "error" ? "API Error" : "Checking API..."}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 mb-8 shadow-xl">
          <h2 className="text-base font-semibold text-foreground mb-1">Generate Accounts</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Click generate to create Facebook account info with a free temporary email address. The email is also used as the password.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground">How many?</label>
              <div className="flex items-center gap-1 bg-secondary/50 border border-border rounded-lg overflow-hidden">
                <button
                  className="px-3 py-2 text-primary hover:bg-primary/10 transition-colors font-bold cursor-pointer"
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                >-</button>
                <span className="px-4 py-2 font-mono text-sm font-bold min-w-[2.5rem] text-center">{count}</span>
                <button
                  className="px-3 py-2 text-primary hover:bg-primary/10 transition-colors font-bold cursor-pointer"
                  onClick={() => setCount((c) => Math.min(10, c + 1))}
                >+</button>
              </div>
              <span className="text-xs text-muted-foreground">(max 10)</span>
            </div>

            <button
              onClick={generateAccounts}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg cursor-pointer"
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Generate Account{count > 1 ? "s" : ""}
                </>
              )}
            </button>

            {accounts.length > 0 && (
              <button
                onClick={clearAll}
                className="px-4 py-2.5 text-sm rounded-xl border border-destructive/40 text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {accounts.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium">No accounts generated yet</p>
            <p className="text-xs mt-1">Click "Generate Account" above to get started</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {accounts.map((account, i) => (
            <AccountCard key={i} account={account} index={i} />
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Uses <span className="text-primary font-medium">vern-rest-api.vercel.app</span> for temporary email generation
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
