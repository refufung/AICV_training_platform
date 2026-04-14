/** Centralized color tokens — single source of truth for the whole app */

export const SEVERITY_HEX: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

export const SEVERITY_CLASSES: Record<string, string> = {
  low: 'bg-severity-low/20 text-green-400 border-severity-low/40',
  medium: 'bg-severity-medium/20 text-yellow-400 border-severity-medium/40',
  high: 'bg-severity-high/20 text-orange-400 border-severity-high/40',
  critical: 'bg-severity-critical/20 text-red-400 border-severity-critical/40',
};

export const SEVERITY_DOT: Record<string, string> = {
  low: 'bg-severity-low',
  medium: 'bg-severity-medium',
  high: 'bg-severity-high',
  critical: 'bg-severity-critical',
};

export const STATUS_CLASSES: Record<string, string> = {
  new: 'bg-neon-cyan/15 text-cyan-400 border-neon-cyan/30',
  reviewed: 'bg-neon-purple/15 text-purple-400 border-neon-purple/30',
  repairing: 'bg-neon-orange/15 text-orange-400 border-neon-orange/30',
  fixed: 'bg-neon-green/15 text-green-400 border-neon-green/30',
};

export const GLOW_MAP: Record<string, string> = {
  cyan: 'shadow-glow-cyan border-glow-cyan',
  purple: 'shadow-glow-purple border-glow-purple',
  green: 'shadow-glow-green border-glow-green',
  orange: 'shadow-glow-orange border-glow-orange',
  red: 'shadow-glow-red border-glow-red',
  blue: 'shadow-glow-blue',
};

/** Layer accent colors matching the architecture diagram */
export const LAYER_ACCENT: Record<string, string> = {
  capture: 'neon-orange',   // Layer 1: field inspection
  backend: 'neon-purple',   // Layer 2: API + DB
  bim: 'neon-cyan',         // Layer 3-4: BIM integration
  analytics: 'neon-green',  // Layer 4: dashboard/reports
  simulator: 'neon-magenta', // Layer 5: simulator
};
