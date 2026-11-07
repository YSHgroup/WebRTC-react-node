export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id="hg" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B6BFF" />
          <stop offset="1" stopColor="#4B2BE0" />
        </linearGradient>
      </defs>
      <path d="M24 4C13 4 5 11.6 5 21c0 5.2 2.5 9.8 6.5 12.9L10 43l8.6-4.6c1.7.4 3.5.6 5.4.6 11 0 19-7.6 19-17S35 4 24 4Z" fill="url(#hg)" />
      <circle cx="16" cy="21" r="2.6" fill="#fff" />
      <circle cx="24" cy="21" r="2.6" fill="#fff" />
      <circle cx="32" cy="21" r="2.6" fill="#fff" />
    </svg>
  )
}
