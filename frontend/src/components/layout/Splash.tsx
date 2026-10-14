import { useEffect, useState } from 'react'

/** Splash Art de entrada: aparece al abrir la página y luego da paso a LicitaWatch. */
export function Splash({ onDone }: { onDone: () => void }) {
  const [saliendo, setSaliendo] = useState(false)
  useEffect(() => {
    const a = setTimeout(() => setSaliendo(true), 2600)
    const b = setTimeout(onDone, 3250)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [onDone])
  return (
    <div className={`splash ${saliendo ? 'out' : ''}`} role="presentation">
      <div className="splash-orb orb-a" />
      <div className="splash-orb orb-b" />
      <div className="splash-orb orb-c" />
      <div className="splash-center">
        <svg className="splash-mark" viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="sp-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3B5BFF" />
              <stop offset="1" stopColor="#14B8A6" />
            </linearGradient>
          </defs>
          <rect className="sp-tile" x="6" y="6" width="108" height="108" rx="32" fill="url(#sp-g)" />
          <path className="sp-eye" d="M26 60c8-13 19-19.500 34-19.500S86 47 94 60c-8 13-19 19.500-34 19.500S34 73 26 60Z" fill="none" stroke="#fff" strokeWidth="6" strokeLinejoin="round" />
          <circle className="sp-pupil" cx="60" cy="60" r="10" fill="#fff" />
        </svg>
        <h1 className="splash-word">
          <span>Licita</span><b>Watch</b>
        </h1>
        <p className="splash-tag">Licitaciones privadas B2B · Chile</p>
        <div className="splash-bar"><i /></div>
      </div>
    </div>
  )
}
