import { Link } from 'react-router-dom';

/**
 * The Doorway mark: a door frame with its door swung open. Original glyph, icon-only and decorative.
 * Size it with className (defaults to 28px).
 * The tab icon (public/favicon.svg) is a copy of this artwork, so update both together.
 */
export function LogoMark({ className = 'h-7 w-7' }: {className?: string;}) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <rect width="28" height="28" rx="8" fill="#002E5D" />
      {/* Frame */}
      <path
        d="M9 20.5V8.6A1.6 1.6 0 0 1 10.6 7h6.8A1.6 1.6 0 0 1 19 8.6v11.9"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round" />

      {/* Open door leaf, hinged on the left, and its handle */}
      <path d="M9.9 8.4 15.6 10v12.2l-5.7-1.7Z" fill="#fff" />
      <circle cx="14.2" cy="15.6" r="0.95" fill="#002E5D" />
      {/* Threshold */}
      <path d="M6.5 21.5h15" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>);

}

export function Logo({ to = '/' }: {to?: string;}) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-navy">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-ink">Doorway</span>
    </Link>);

}
