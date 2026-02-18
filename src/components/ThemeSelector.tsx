import React from 'react';
import { useTheme, themeOptions } from '@/hooks/use-theme';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Moon, Sun } from 'lucide-react';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useTheme();

  // Group themes by category
  const groups = {
    standard: themeOptions.filter(t => t.category === 'standard'),
    color: themeOptions.filter(t => t.category === 'color'),
    vibrant: themeOptions.filter(t => t.category === 'vibrant'),
    scifi: themeOptions.filter(t => t.category === 'scifi'),
    dark: themeOptions.filter(t => t.category === 'dark'),
    accessibility: themeOptions.filter(t => t.category === 'accessibility'),
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'light':
        return <Sun className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {getThemeIcon()}
        <div>
          <p className="text-sm font-medium">Theme</p>
          <p className="text-xs text-muted-foreground">
            Choose your preferred interface theme
          </p>
        </div>
      </div>

      <Select value={theme} onValueChange={(val: any) => setTheme(val)}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Select theme" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          <SelectGroup>
            <SelectLabel>Standard</SelectLabel>
            {groups.standard.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>

          <SelectGroup>
            <SelectLabel>Colors</SelectLabel>
            {groups.color.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>

          {groups.vibrant.length > 0 && (
            <SelectGroup>
              <SelectLabel>Vibrant</SelectLabel>
              {groups.vibrant.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {groups.scifi.length > 0 && (
            <SelectGroup>
              <SelectLabel>Sci-Fi</SelectLabel>
              {groups.scifi.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          <SelectGroup>
            <SelectLabel>Dark Modes</SelectLabel>
            {groups.dark.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>

          <SelectGroup>
            <SelectLabel>Accessibility</SelectLabel>
            {groups.accessibility.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
