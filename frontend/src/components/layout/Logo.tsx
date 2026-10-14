export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="lw-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B5BFF" />
          <stop offset="1" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#lw-g)" />
      <path d="M13 24c3.200-5.200 7-7.800 11-7.800S31.800 18.800 35 24c-3.200 5.200-7 7.800-11 7.800S16.200 29.200 13 24Z" fill="none" stroke="#fff" strokeWidth="2.600" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="4.200" fill="#fff" />
    </svg>
  )
}

export function Logo({ size = 36, claro = false }: { size?: number; claro?: boolean }) {
  return (
    <span className={`logo ${claro ? 'logo-claro' : ''}`}>
      <LogoMark size={size} />
      <span className="logo-text" style={{ fontSize: size * 0.56 }}>
        Licita<b>Watch</b>
      </span>
    </span>
  )
}
