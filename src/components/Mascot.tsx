export function Mascot({ mood = 'happy', className }: { mood?: 'happy' | 'sad'; className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden>
      <rect x="6" y="14" width="54" height="16" rx="8" fill="#fbbf24" stroke="#18181b" strokeWidth="3.5" />
      <rect x="6" y="22" width="66" height="44" rx="10" fill="#f59e0b" stroke="#18181b" strokeWidth="3.5" />
      <circle className="mascot-eye" cx="30" cy="44" r="4" fill="#18181b" />
      <circle className="mascot-eye" cx="50" cy="44" r="4" fill="#18181b" style={{ animationDelay: '0.15s' }} />
      {mood === 'happy' ? (
        <path d="M32 54 Q40 60 48 54" stroke="#18181b" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M34 58 Q40 54 46 58" stroke="#18181b" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}
      <circle cx="62" cy="44" r="5" fill="#fde68a" stroke="#18181b" strokeWidth="3" />
    </svg>
  );
}
