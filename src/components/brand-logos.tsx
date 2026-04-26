// Stylized SVG monograms for Brazilian banks/cards that don't have an official
// SimpleIcons SVG. These are decorative — they capture the brand essence
// (colors, wordmark style) without claiming to be the official logos.

interface LogoProps { size?: number }

const fontStack = "Outfit, Inter, system-ui, -apple-system, sans-serif"

// ─── Itaú ─── iconic orange/blue split square
export function ItauLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="9" rx="2" fill="#EC7000" />
      <rect x="2" y="13" width="20" height="9" rx="2" fill="#003399" />
      <text x="12" y="9.5" textAnchor="middle" fill="white" fontSize="5" fontWeight="700" fontFamily={fontStack}>i</text>
      <text x="12" y="20" textAnchor="middle" fill="white" fontSize="5" fontWeight="700" fontFamily={fontStack}>tau</text>
    </svg>
  )
}

// ─── Bradesco ─── red with "B" wordmark
export function BradescoLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#CC092F" />
      <text x="12" y="17" textAnchor="middle" fill="white" fontSize="14" fontWeight="800" fontFamily={fontStack} letterSpacing="-0.5">B</text>
    </svg>
  )
}

// ─── Banco do Brasil ─── yellow shield with bold "BB"
export function BancoDoBrasilLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#FAE128" />
      <text x="12" y="17" textAnchor="middle" fill="#003D8C" fontSize="11" fontWeight="900" fontFamily={fontStack} letterSpacing="-0.5">BB</text>
    </svg>
  )
}

// ─── Caixa ─── blue with orange triangle accent
export function CaixaLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#0070AF" />
      <polygon points="22,2 22,10 14,2" fill="#F39200" />
      <text x="12" y="18" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="800" fontFamily={fontStack} letterSpacing="0.5">CAIXA</text>
    </svg>
  )
}

// ─── Santander ─── red with stylized flame
export function SantanderLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#EC0000" />
      <path d="M12 5 C8 8 7 12 9 16 C8 13 9 11 12 9 C11 12 12 14 14 15 C13 12 14 9 17 7 C16 11 17 14 16 17 C18 14 18 9 12 5 Z" fill="white" opacity="0.95" />
    </svg>
  )
}

// ─── Inter ─── orange with lowercase "i"
export function InterLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#FF7A00" />
      <circle cx="12" cy="7.5" r="2" fill="white" />
      <rect x="10" y="10.5" width="4" height="9" rx="1" fill="white" />
    </svg>
  )
}

// ─── C6 Bank ─── black with golden "C6"
export function C6Logo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#000000" />
      <text x="12" y="16.5" textAnchor="middle" fill="#D2A26A" fontSize="9" fontWeight="800" fontFamily={fontStack}>C6</text>
    </svg>
  )
}

// ─── BTG Pactual ─── navy with white "BTG"
export function BTGLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#001E62" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="800" fontFamily={fontStack} letterSpacing="-0.3">BTG</text>
    </svg>
  )
}

// ─── PagBank ─── green with "P"
export function PagBankLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#00BF63" />
      <text x="12" y="17" textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily={fontStack} letterSpacing="-0.5">P</text>
    </svg>
  )
}

// ─── Will Bank ─── teal with "will"
export function WillLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#00C4B0" />
      <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="800" fontFamily={fontStack} letterSpacing="-0.3">will</text>
    </svg>
  )
}

// ─── Neon ─── mint green with "neon"
export function NeonLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#08DDA1" />
      <text x="12" y="16.5" textAnchor="middle" fill="#0E2540" fontSize="7" fontWeight="800" fontFamily={fontStack} letterSpacing="-0.3">neon</text>
    </svg>
  )
}

// ─── Original ─── orange with "O"
export function OriginalLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#EC7100" />
      <text x="12" y="17" textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily={fontStack} letterSpacing="-0.5">O</text>
    </svg>
  )
}

// ─── Safra ─── light blue with "Safra"
export function SafraLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#00A0E3" />
      <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="800" fontFamily={fontStack} letterSpacing="-0.2">Safra</text>
    </svg>
  )
}

// ─── XP ─── black with yellow "XP"
export function XPLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#000000" />
      <text x="12" y="17" textAnchor="middle" fill="#FCD700" fontSize="11" fontWeight="900" fontFamily={fontStack} letterSpacing="-0.5">XP</text>
    </svg>
  )
}

// ─── Sicoob ─── dark green with "SO"
export function SicoobLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#00603A" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="7" fontWeight="800" fontFamily={fontStack}>SO</text>
    </svg>
  )
}

// ─── Sicredi ─── forest green with "SR"
export function SicrediLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#1A5632" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="7" fontWeight="800" fontFamily={fontStack}>SR</text>
    </svg>
  )
}

// ─── BRB ─── blue with "BRB"
export function BRBLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#0066B2" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="7" fontWeight="800" fontFamily={fontStack}>BRB</text>
    </svg>
  )
}

// ─── Hipercard ─── red with "Hiper"
export function HipercardLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#B11E2C" />
      <text x="12" y="15" textAnchor="middle" fill="white" fontSize="6" fontWeight="800" fontFamily={fontStack}>Hiper</text>
    </svg>
  )
}

// ─── Elo ─── black with green/yellow circles overlapping
export function EloLogo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#000000" />
      <circle cx="9.5" cy="12" r="4.5" fill="#FCEC32" />
      <circle cx="14.5" cy="12" r="4.5" fill="#00A14B" opacity="0.85" />
      <circle cx="12" cy="12" r="2" fill="white" opacity="0.85" />
    </svg>
  )
}
