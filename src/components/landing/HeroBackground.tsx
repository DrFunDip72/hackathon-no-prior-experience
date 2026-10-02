import React from 'react';

/** BYU palette used by every variant. */
const NAVY = '0,46,93'; // #002E5D
const ROYAL = '0,98,184'; // #0062B8
const SKY = '108,172,228'; // #6CACE4

type CanonicalVariant = 'byu-aurora' | 'byu-deep' | 'byu-sky';

/** `gradient` and `byu` are the earlier names, kept so old links and callers keep working. */
export type HeroBackgroundVariant = CanonicalVariant | 'gradient' | 'byu';

const aliases: Record<HeroBackgroundVariant, CanonicalVariant> = {
  'byu-aurora': 'byu-aurora',
  'byu-deep': 'byu-deep',
  'byu-sky': 'byu-sky',
  gradient: 'byu-aurora',
  byu: 'byu-deep'
};

export function isHeroBackgroundVariant(value: string | null): value is HeroBackgroundVariant {
  return value !== null && Object.prototype.hasOwnProperty.call(aliases, value);
}

/**
 * Decorative color behind the landing hero and the onboarding chat.
 * Purely visual: absolutely positioned, aria-hidden, pointer-events-none, -z-10.
 * Place inside a `relative isolate` container (`isolate` keeps -z-10 above any ancestor background).
 * Fills whatever height the parent has, fades out toward the bottom, and is still under prefers-reduced-motion.
 *
 * - `byu-aurora` (default, the team's pick): navy, royal, and sky-blue glows drifting along the sides, over the mountain-ridge outline.
 * - `byu-deep`: bolder, navy-dominant glows with royal highlights, over an original mountain-ridge silhouette.
 * - `byu-sky`: light and airy; one soft sky-blue sweep running diagonally across, with a hint of navy in the corner.
 */
export function HeroBackground({ variant = 'byu-aurora' }: {variant?: HeroBackgroundVariant;}) {
  const resolved = aliases[variant] ?? 'byu-aurora';
  return (
    <div aria-hidden="true" data-variant={resolved} className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <style>{keyframes}</style>
      {resolved === 'byu-deep' ? <DeepLayer /> : resolved === 'byu-sky' ? <SkyLayer /> : <><AuroraLayer /><Ridgeline /></>}
    </div>);

}

const keyframes = `
@keyframes cc-hb-drift-a { 0% { transform: translate3d(0,0,0) scale(1); } 100% { transform: translate3d(6%,8%,0) scale(1.12); } }
@keyframes cc-hb-drift-b { 0% { transform: translate3d(0,0,0) scale(1.05); } 100% { transform: translate3d(-7%,6%,0) scale(0.92); } }
@keyframes cc-hb-drift-c { 0% { transform: translate3d(0,0,0) scale(0.95); } 100% { transform: translate3d(5%,-6%,0) scale(1.1); } }
.cc-hb-anim { will-change: transform; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
@media (prefers-reduced-motion: reduce) { .cc-hb-anim { animation: none !important; } }
`;

/** Fades the layer into the page below so it never ends on a hard edge, whatever the parent height. */
const fadeOut: React.CSSProperties = {
  maskImage: 'linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%)',
  WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%)'
};

/** A soft color pool. `closest-side` keeps the falloff inside the box, so no filter blur is needed. */
function Glow({ rgb, alpha, className, drift, seconds }: {rgb: string;alpha: number;className: string;drift: 'a' | 'b' | 'c';seconds: number;}) {
  return (
    <div
      className={`cc-hb-anim absolute rounded-full ${className}`}
      // Longhands only: the `animation` shorthand would reset the iteration/direction set by .cc-hb-anim.
      style={{
        background: `radial-gradient(closest-side, rgba(${rgb},${alpha}), transparent)`,
        animationName: `cc-hb-drift-${drift}`,
        animationDuration: `${seconds}s`
      }} />);

}

function AuroraLayer() {
  return (
    // Softer on phones, where the glows reach the body copy (keeps muted text at AA).
    <div className="absolute inset-0 opacity-70 sm:opacity-100" style={fadeOut}>
      {/* Left edge */}
      <Glow rgb={ROYAL} alpha={0.3} className="-left-[30%] -top-[10%] h-[70%] w-[75%] sm:-left-[12%] sm:w-[45%]" drift="a" seconds={18} />
      <Glow rgb={SKY} alpha={0.4} className="-left-[25%] top-[30%] h-[60%] w-[65%] sm:-left-[10%] sm:w-[38%]" drift="c" seconds={24} />
      {/* Right edge */}
      <Glow rgb={NAVY} alpha={0.22} className="-right-[30%] -top-[5%] h-[65%] w-[75%] sm:-right-[12%] sm:w-[45%]" drift="b" seconds={21} />
      <Glow rgb={SKY} alpha={0.36} className="-right-[25%] top-[35%] h-[55%] w-[60%] sm:-right-[8%] sm:w-[35%]" drift="a" seconds={27} />
    </div>);

}

function DeepLayer() {
  return (
    <>
      {/* Softer on phones, where the glows sit closer to the body copy (keeps muted text at AA). */}
      <div className="absolute inset-0 opacity-60 sm:opacity-100" style={fadeOut}>
        <Glow rgb={NAVY} alpha={0.42} className="-left-[50%] -top-[15%] h-[70%] w-[85%] sm:-left-[14%] sm:w-[50%]" drift="a" seconds={22} />
        <Glow rgb={ROYAL} alpha={0.45} className="-left-[40%] top-[32%] h-[55%] w-[65%] sm:-left-[10%] sm:w-[36%]" drift="c" seconds={26} />
        <Glow rgb={NAVY} alpha={0.4} className="-right-[50%] -top-[10%] h-[70%] w-[85%] sm:-right-[14%] sm:w-[50%]" drift="b" seconds={24} />
        <Glow rgb={ROYAL} alpha={0.42} className="-right-[40%] top-[38%] h-[50%] w-[60%] sm:-right-[8%] sm:w-[34%]" drift="a" seconds={30} />
      </div>
      <Ridgeline />
    </>);

}

function SkyLayer() {
  return (
    <div className="absolute inset-0" style={fadeOut}>
      {/* One long, soft band tilted from upper left to lower right. */}
      <div className="absolute -inset-x-[20%] top-[5%] h-[70%] -rotate-[14deg]">
        <Glow rgb={SKY} alpha={0.3} className="inset-x-0 top-0 h-full" drift="c" seconds={28} />
      </div>
      <Glow rgb={NAVY} alpha={0.12} className="-right-[30%] -top-[25%] h-[60%] w-[70%] sm:-right-[10%] sm:w-[40%]" drift="b" seconds={32} />
    </div>);

}

/**
 * Layered mountain silhouette along the bottom of the hero, a nod to the Wasatch Front above campus.
 * Original abstract artwork, not a logo.
 */
function Ridgeline() {
  return (
    <svg
      viewBox="0 0 1440 240"
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 h-28 w-full sm:h-44"
      fill="none">

      <path
        d="M0 170 L120 120 L210 150 L330 80 L440 135 L560 95 L660 140 L780 70 L900 130 L1010 90 L1120 140 L1240 85 L1350 125 L1440 100 V240 H0 Z"
        fill="#002E5D"
        fillOpacity="0.04" />

      <path
        d="M0 200 L150 150 L260 185 L400 120 L520 175 L640 130 L720 160 L800 105 L860 132 L940 98 L1060 170 L1180 135 L1300 180 L1440 145 V240 H0 Z"
        fill="#002E5D"
        fillOpacity="0.06" />

      <path
        d="M0 200 L150 150 L260 185 L400 120 L520 175 L640 130 L720 160 L800 105 L860 132 L940 98 L1060 170 L1180 135 L1300 180 L1440 145"
        stroke="#002E5D"
        strokeOpacity="0.14"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke" />

    </svg>);

}
