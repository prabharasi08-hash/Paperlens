import { 
  FileText, 
  Plus, 
  Scale, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Library,
  Bot,
  Sparkles
} from 'lucide-react';
import { PaperItem } from '../types';

interface WorkbenchBarProps {
  papers: PaperItem[];
  activePaperId: string | null;
  isComparisonActive: boolean;
  isComparing: boolean;
  onSelectPaper: (paperId: string) => void;
  onOpenComparison: () => void;
  onAddPaperClick: () => void;
  onRemovePaper: (paperId: string) => void;
  onOpenAgent?: () => void;
}

export function WorkbenchBar({
  papers,
  activePaperId,
  isComparisonActive,
  isComparing,
  onSelectPaper,
  onOpenComparison,
  onAddPaperClick,
  onRemovePaper,
  onOpenAgent,
}: WorkbenchBarProps) {
  if (papers.length === 0) return null;

  const completedPapersCount = papers.filter((p) => p.status === 'completed' && p.analysis).length;
  const canCompare = completedPapersCount >= 2;

  return (
    <div className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-2.5 mb-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Workbench Papers Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
          <div className="flex items-center gap-1 text-xs font-semibold text-stone-700 dark:text-stone-300 px-2 select-none shrink-0">
            <Library className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
            <span>Workbench:</span>
          </div>

          {papers.map((paper, idx) => {
            const isActive = !isComparisonActive && activePaperId === paper.id;
            const title = paper.analysis?.metadata.title || paper.fileName;

            return (
              <div
                key={paper.id}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none border shrink-0 max-w-[220px] ${
                  isActive
                    ? 'bg-blue-900 text-white border-blue-900 shadow-2xs'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
                onClick={() => onSelectPaper(paper.id)}
                title={title}
              >
                {/* Status Indicator */}
                {paper.status === 'completed' ? (
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-200' : 'text-emerald-600 dark:text-emerald-400'}`} />
                ) : paper.status === 'error' ? (
                  <AlertCircle className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-red-200' : 'text-amber-500'}`} />
                ) : (
                  <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${isActive ? 'text-blue-200' : 'text-blue-600'}`} />
                )}

                <span className="truncate">
                  {idx + 1}. {title}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePaper(paper.id);
                  }}
                  className={`p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-70 group-hover:opacity-100 ${
                    isActive ? 'text-white' : 'text-stone-500 dark:text-stone-400'
                  }`}
                  aria-label={`Remove ${title}`}
                  title="Remove paper from workbench"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Add Paper Button */}
          <button
            type="button"
            onClick={onAddPaperClick}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition-colors shrink-0"
            title="Add another PDF to compare"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Paper</span>
          </button>
        </div>

        {/* Right: AI Agent & Compare Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenAgent && (
            <button
              type="button"
              onClick={onOpenAgent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300/80 dark:border-stone-700 transition-all shadow-2xs group"
              title="Query AI Research Agent with workbench context"
            >
              <Bot className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400 group-hover:scale-110 transition-transform" />
              <span>AI Agent</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenComparison}
            disabled={!canCompare || isComparing}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs select-none ${
              isComparisonActive
                ? 'bg-blue-900 dark:bg-blue-800 text-white ring-2 ring-blue-500/50'
                : canCompare
                ? 'bg-blue-900 hover:bg-blue-950 dark:bg-blue-800 dark:hover:bg-blue-700 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700 cursor-not-allowed'
            }`}
            title={canCompare ? "Synthesize side-by-side comparison" : "Analyze at least 2 papers to compare"}
          >
            {isComparing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Scale className="w-3.5 h-3.5" />
            )}
            <span>
              {isComparing 
                ? 'Synthesizing...' 
                : isComparisonActive 
                ? `Comparing ${completedPapersCount} Papers` 
                : `Compare Papers (${completedPapersCount})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
