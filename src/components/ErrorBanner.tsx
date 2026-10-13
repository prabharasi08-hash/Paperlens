import { AlertCircle, RefreshCw, FileX, ImageOff, XCircle, Clock } from 'lucide-react';
import { AnalysisError } from '../types';

interface ErrorBannerProps {
  error: AnalysisError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ error, onRetry, onDismiss }: ErrorBannerProps) {
  const getIcon = () => {
    switch (error.type) {
      case 'scanned_pdf':
        return <ImageOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'rate_limit':
      case 'high_demand':
        return <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'invalid_type':
      case 'oversized':
        return <FileX className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
      default:
        return <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    if (error.type === 'scanned_pdf' || error.type === 'rate_limit' || error.type === 'high_demand') {
      return 'border-amber-300 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/30';
    }
    return 'border-rose-300 dark:border-rose-800/70 bg-rose-50/80 dark:bg-rose-950/30';
  };

  return (
    <div className={`w-full max-w-2xl mx-auto my-6 p-4 rounded-xl border ${getBorderColor()} shadow-xs transition-colors`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            {error.type === 'scanned_pdf'
              ? 'Unreadable Scanned PDF Detected'
              : error.type === 'rate_limit'
              ? 'Gemini API Rate Limit / Quota Cooldown'
              : error.type === 'high_demand'
              ? 'AI Models Experiencing High Demand'
              : error.type === 'oversized'
              ? 'File Exceeds Size Limit'
              : error.type === 'invalid_type'
              ? 'Unsupported File Format'
              : 'Analysis Could Not Be Completed'}
          </h3>
          <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">
            {error.message}
          </p>

          <div className="mt-3 flex items-center gap-3">
            {error.canRetry && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-medium shadow-xs transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Analysis</span>
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Dismiss</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
