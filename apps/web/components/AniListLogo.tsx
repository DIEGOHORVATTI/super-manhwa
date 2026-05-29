/**
 * AniList brand mark, inline SVG (single path, viewBox 0 0 24 24). `fill` follows
 * `currentColor` so callers set the colour — the brand blue is `#02A9FF`.
 */
export function AniListLogo({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M6.361 2.943 0 21.056h4.942l1.077-3.133H11.4l1.052 3.133H22.9c.71 0 1.1-.392 1.1-1.101V17.53c0-.71-.39-1.1-1.1-1.1h-6.483V4.045c0-.71-.392-1.1-1.101-1.1h-2.422c-.71 0-1.101.39-1.101 1.1v1.064l-.758-2.166zm2.324 5.948 1.688 5.018H7.144z" />
    </svg>
  );
}
