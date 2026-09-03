/** Self-contained brand logos for the UPI pay options (no external URLs — works offline). */
export function PayLogo({ method, size = 22 }: { method: 'phonepe' | 'gpay' | 'paytm'; size?: number }) {
  if (method === 'phonepe') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" aria-label="PhonePe">
        <rect width="48" height="48" rx="11" fill="#5F259F" />
        <circle cx="24" cy="24" r="13" fill="#fff" opacity="0.12" />
        <text x="24" y="30" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">Pe</text>
      </svg>
    );
  }
  if (method === 'paytm') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" aria-label="Paytm">
        <rect width="48" height="48" rx="11" fill="#fff" stroke="#e3e8ef" />
        <text x="24" y="29" textAnchor="middle" fontSize="12.5" fontWeight="800" fontFamily="Arial, sans-serif">
          <tspan fill="#002970">Pay</tspan><tspan fill="#00BAF2">tm</tspan>
        </text>
      </svg>
    );
  }
  // Google Pay — official 4-colour "G"
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label="Google Pay">
      <rect width="48" height="48" rx="11" fill="#fff" stroke="#e3e8ef" />
      <g transform="translate(10 10) scale(0.58)">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
      </g>
    </svg>
  );
}

/** The three UPI options shown in the pay sheet. */
export const UPI_OPTIONS: { key: 'phonepe' | 'gpay' | 'paytm'; label: string }[] = [
  { key: 'phonepe', label: 'PhonePe' },
  { key: 'gpay', label: 'Google Pay' },
  { key: 'paytm', label: 'Paytm' },
];
