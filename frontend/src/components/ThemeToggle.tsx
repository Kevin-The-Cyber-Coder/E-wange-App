import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /** Renders a full-width sidebar row instead of an icon button. */
  full?: boolean;
  className?: string;
}

/**
 * Switches between the light and dark palettes and remembers the choice.
 */
export function ThemeToggle({ full = false, className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme !== "light" : true;
  const next = isDark ? "light" : "dark";
  const label = `Switch to ${next} mode`;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className={cn(
        "flex items-center gap-3 rounded-xl text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground hover:bg-secondary/60",
        full ? "w-full px-4 py-3" : "h-10 w-10 justify-center border border-border bg-card shadow-sm",
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {full && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}

export default ThemeToggle;
