import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ComponentProps } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

/**
 * ThemeProvider - Global theme management with system preference support
 * 
 * USAGE:
 * Wrap your app with <ThemeProvider> at the root level.
 * The provider supports three modes: 'light', 'dark', and 'system' (default).
 * 
 * HOW IT WORKS:
 * - Reads OS preference using prefers-color-scheme media query
 * - Persists user choice in localStorage
 * - Applies 'dark' class to <html> element for dark mode
 * - Reacts to OS theme changes in real-time when 'system' is selected
 * 
 * CONSUMING THEME IN COMPONENTS:
 * ```tsx
 * import { useTheme } from "next-themes";
 * const { theme, setTheme, resolvedTheme } = useTheme();
 * // theme: 'light' | 'dark' | 'system'
 * // resolvedTheme: 'light' | 'dark' (actual applied theme)
 * ```
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="imperio-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
