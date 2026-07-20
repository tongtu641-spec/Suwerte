export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="suwerte-g" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffdf95" />
          <stop offset="1" stopColor="#f6c14b" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="26" height="26" rx="9" fill="url(#suwerte-g)" />
      {/* four-point luck spark */}
      <path
        d="M16 8.5c.7 3.4 1.6 4.3 5 5-3.4.7-4.3 1.6-5 5-.7-3.4-1.6-4.3-5-5 3.4-.7 4.3-1.6 5-5Z"
        fill="#16183a"
      />
      <circle cx="11" cy="21.5" r="1.4" fill="#16183a" />
      <circle cx="21.5" cy="20.5" r="1" fill="#16183a" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <Logo />
      <span
        className="text-[1.35rem] leading-none text-ink-text"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
      >
        Suwerte
      </span>
    </span>
  );
}
