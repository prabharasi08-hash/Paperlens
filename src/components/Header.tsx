import { Moon, Sun, BookOpenText, Bot, Sparkles } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onReset?: () => void;
  hasPapers?: boolean;
  onOpenAgent?: () => void;
}

export function Header({ 
  darkMode, 
  onToggleDarkMode, 
  onReset,
  hasPapers = false,
  onOpenAgent,
}: HeaderProps) {
  return (
    <header className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        <div 
          onClick={onReset}
          className="flex items-center gap-3 cursor-pointer group select-none"
          title="PaperLens Home"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-900 dark:bg-blue-800 text-white flex items-center justify-center shadow-xs">
            <BookOpenText className="w-5 h-5 text-blue-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif-heading text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 group-hover:text-blue-900 dark:group-hover:text-blue-400 transition-colors">
                PaperLens
              </span>
              <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                v1.0
              </span>
            </div>
            <p className="text-xs text-stone-700 dark:text-stone-300">
              Autonomous AI research agent & rapid PDF triage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenAgent && (
            <button
              type="button"
              onClick={onOpenAgent}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-900 dark:text-stone-100 border border-stone-300/80 dark:border-stone-700 transition-all shadow-2xs group"
              title="Open AI Research Agent"
            >
              <div className="w-5 h-5 rounded bg-blue-900 dark:bg-blue-700 text-white flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-blue-200" />
              </div>
              <span>AI Agent</span>
              {hasPapers && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border border-stone-200 dark:border-stone-700"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-700" />}
          </button>
        </div>
      </div>
    </header>
  );
}
