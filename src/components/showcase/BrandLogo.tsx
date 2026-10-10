import Image from 'next/image';

/** One shared asset keeps the SIGARA identity consistent across the workspace. */
export default function BrandLogo({ className = '', size = 56, priority = false, decorative = false }: { className?: string; size?: number; priority?: boolean; decorative?: boolean }) {
  return <Image src="/brand/bang-jakes.png" alt={decorative ? '' : 'Bang Jakes — logo SIGARA'} width={size} height={size} className={`brand-logo ${className}`} priority={priority} />;
}
