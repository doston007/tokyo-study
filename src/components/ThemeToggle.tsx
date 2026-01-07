import { Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-600/50 text-slate-700 dark:text-slate-300 rounded-lg transition-all border border-slate-300 dark:border-transparent shadow-sm"
      title={theme === "dark" ? "Кундузги режим" : "Тунги режим"}
      aria-label="Переключить тему"
    >
      {theme === "dark" ? (
        <>
          <Sun className="w-4 h-4" />
          <span className="text-sm font-medium">Кундузги</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" />
          <span className="text-sm font-medium">Тунги</span>
        </>
      )}
    </button>
  );
};

