import { useTheme as useNextTheme } from 'next-themes';

export type Theme =
  | 'light'
  | 'dark'
  | 'system'
  | 'high-contrast'
  | 'sepia'
  | 'ocean'
  | 'forest'
  | 'purple'
  | 'sunset'
  | 'monochrome'
  | 'amoled'
  | 'cyberpunk'
  | 'coffee'
  | 'matrix'
  | 'sky'
  | 'tokyo-night'
  | 'dune'
  | 'sapphire';

export interface ThemeOption {
  value: Theme;
  label: string;
  description: string;
  icon: string;
  category: 'standard' | 'accessibility' | 'color' | 'dark' | 'vibrant' | 'scifi';
}

export const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Clarity (Light)',
    description: 'Clean and bright interface',
    icon: '☀️',
    category: 'standard',
  },
  {
    value: 'dark',
    label: 'Midnight (Dark)',
    description: 'Easy on the eyes in low light',
    icon: '🌙',
    category: 'standard',
  },
  {
    value: 'system',
    label: 'Auto (System)',
    description: 'Follows your system preference',
    icon: '💻',
    category: 'standard',
  },
  {
    value: 'high-contrast',
    label: 'High Contrast',
    description: 'Maximum readability',
    icon: '🔲',
    category: 'accessibility',
  },
  {
    value: 'monochrome',
    label: 'Focus (Mono)',
    description: 'Distraction-free grayscale',
    icon: '⚫',
    category: 'accessibility',
  },
  {
    value: 'sepia',
    label: 'Reader (Sepia)',
    description: 'Warm tones for comfortable reading',
    icon: '📜',
    category: 'color',
  },
  {
    value: 'ocean',
    label: 'Deep Ocean',
    description: 'Professional blue theme',
    icon: '🌊',
    category: 'color',
  },
  {
    value: 'sky',
    label: 'Sky',
    description: 'Airy and light blue',
    icon: '☁️',
    category: 'color',
  },
  {
    value: 'forest',
    label: 'Evergreen',
    description: 'Natural green theme',
    icon: '🌲',
    category: 'color',
  },
  {
    value: 'coffee',
    label: 'Espresso',
    description: 'Rich brown and tan tones',
    icon: '☕',
    category: 'color',
  },
  {
    value: 'purple',
    label: 'Twilight',
    description: 'Modern purple aesthetics',
    icon: '🌆',
    category: 'vibrant',
  },
  {
    value: 'tokyo-night',
    label: 'Crimson Night',
    description: 'Deep red and dark tones',
    icon: '🏮',
    category: 'vibrant',
  },
  {
    value: 'dune',
    label: 'Solar Flare',
    description: 'Amber and yellow energy',
    icon: '⚠️',
    category: 'vibrant',
  },
  {
    value: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'Neon vibrant colors',
    icon: '⚡',
    category: 'scifi',
  },
  {
    value: 'matrix',
    label: 'The Matrix',
    description: 'Digital rain code style',
    icon: '🧬',
    category: 'scifi',
  },
  {
    value: 'sunset',
    label: 'Sunset',
    description: 'Warm dark gradient',
    icon: '🌅',
    category: 'dark',
  },
  {
    value: 'amoled',
    label: 'True Black',
    description: 'Battery saver for OLED',
    icon: '📱',
    category: 'dark',
  },
  {
    value: 'sapphire',
    label: 'Sapphire',
    description: 'Vibrant electric blue',
    icon: '💎',
    category: 'vibrant',
  },
];

export const useTheme = () => {
  const { theme, setTheme } = useNextTheme();

  return {
    theme: theme as Theme,
    setTheme,
    themeOptions,
  };
};
