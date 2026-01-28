import Image from "next/image";
import Link from "next/link";

const languageOptions = [
  "English",
  "Français",
  "Español",
  "Português",
  "Deutsch",
  "العربية",
  "中文",
  "日本語",
];

export function PrimaryNav() {
  return (
    <header className="border-b border-white/30 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="WhiteBox" width={40} height={40} />
          <div className="leading-tight">
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--wb-navy)]">
              WhiteBox
            </div>
            <div className="text-xs text-slate-500">Grievance mechanism</div>
          </div>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <select
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
            aria-label="Language"
            defaultValue="English"
          >
            {languageOptions.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
          <Link
            href="/login"
            className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:border-slate-300"
          >
            Log in
          </Link>
          <Link
            href="/org/signup"
            className="rounded-full bg-[var(--wb-navy)] px-4 py-2 text-white hover:bg-[var(--wb-cobalt)]"
          >
            Sign up organisation
          </Link>
        </div>
      </div>
    </header>
  );
}
