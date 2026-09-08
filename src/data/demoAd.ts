/**
 * Demo advertisement specification.
 * Exactly ONE declarative ad specification adapted automatically across all surfaces.
 */

import { defineAd } from '../engine/spec';
import { AdSpec } from '../engine/types';

// Embedded crisp SVG graphics to ensure 100% offline reliability and crisp rendering
export const HEADPHONE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%236366f1"/>
      <stop offset="50%" stop-color="%23a855f7"/>
      <stop offset="100%" stop-color="%23ec4899"/>
    </linearGradient>
    <linearGradient id="cupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%231e293b"/>
      <stop offset="100%" stop-color="%230f172a"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <!-- Background Glow -->
  <circle cx="200" cy="200" r="140" fill="url(%23g1)" opacity="0.15" filter="url(%23glow)" />
  <!-- Headband Arc -->
  <path d="M 100 230 C 100 110, 300 110, 300 230" stroke="url(%23g1)" stroke-width="18" stroke-linecap="round" fill="none"/>
  <path d="M 115 210 C 115 130, 285 130, 285 210" stroke="%23334155" stroke-width="6" stroke-linecap="round" fill="none"/>
  <!-- Left Ear Cup Mount -->
  <rect x="80" y="210" width="40" height="75" rx="20" fill="url(%23cupGrad)" stroke="url(%23g1)" stroke-width="4"/>
  <rect x="70" y="225" width="22" height="45" rx="11" fill="%2364748b"/>
  <!-- Right Ear Cup Mount -->
  <rect x="280" y="210" width="40" height="75" rx="20" fill="url(%23cupGrad)" stroke="url(%23g1)" stroke-width="4"/>
  <rect x="308" y="225" width="22" height="45" rx="11" fill="%2364748b"/>
  <!-- Sound Waves Accent -->
  <path d="M 50 235 Q 40 247 50 260" stroke="%23818cf8" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7"/>
  <path d="M 35 225 Q 20 247 35 270" stroke="%23c084fc" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.4"/>
  <path d="M 350 235 Q 360 247 350 260" stroke="%23818cf8" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7"/>
  <path d="M 365 225 Q 380 247 365 270" stroke="%23c084fc" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.4"/>
</svg>`;

export const LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" fill="none">
  <defs>
    <linearGradient id="logoG" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="%23818cf8"/>
      <stop offset="100%" stop-color="%23c084fc"/>
    </linearGradient>
  </defs>
  <!-- Diamond Icon -->
  <polygon points="24,10 38,30 24,50 10,30" fill="url(%23logoG)"/>
  <polygon points="24,18 32,30 24,42 16,30" fill="%230f172a"/>
  <!-- AURA Wordmark -->
  <text x="56" y="38" font-family="system-ui, sans-serif" font-weight="800" font-size="28" letter-spacing="6" fill="%23f8fafc">AURA</text>
  <circle cx="200" cy="24" r="3" fill="%2338bdf8"/>
</svg>`;

export const DEMO_AD: AdSpec = defineAd({
  id: 'aura-pro-headphones',
  name: 'AURA Pro Noise-Cancelling Headphones Launch',
  elements: [
    {
      id: 'product-image',
      type: 'image',
      role: 'hero',
      priority: 1,
      src: HEADPHONE_SVG,
      alt: 'AURA Studio Pro Noise-Cancelling Headphones',
      aspectRatio: 1.0, // Square bounding box for headphone hero
    },
    {
      id: 'headline',
      type: 'text',
      role: 'primary',
      priority: 1,
      content: 'Sound Without Limits',
    },
    {
      id: 'price',
      type: 'text',
      role: 'secondary',
      priority: 2,
      content: '₹7,999',
      styleHint: {
        accent: true,
        badge: true,
      },
    },
    {
      id: 'cta',
      type: 'button',
      role: 'action',
      priority: 1, // High priority action
      content: 'Shop Now',
      variant: 'primary',
    },
    {
      id: 'logo',
      type: 'image',
      role: 'branding',
      priority: 3, // Lowest priority, first to shrink or drop under tight constraint
      src: LOGO_SVG,
      alt: 'AURA Brand Logo',
      aspectRatio: 4.0, // Wide logo aspect ratio (240 / 60)
    },
  ],
});
