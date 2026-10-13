import { CheckCircle2, Loader2, Circle, Clock, FileText, Scale } from 'lucide-react';
import { AnalysisStep } from '../types';

interface ProgressStepsProps {
  currentStep: AnalysisStep;
  elapsedSeconds: number;
  paperName?: string;
  paperIndex?: number;
  totalPapers?: number;
  progressPercent?: number;
  isComparisonMode?: boolean;
}

export function ProgressSteps({ 
  currentStep, 
  elapsedSeconds,
  paperName,
  paperIndex,
  totalPapers,
  progressPercent,
  isComparisonMode = false,
}: ProgressStepsProps) {
  const analysisSteps: { id: 'uploading' | 'reading' | 'analyzing'; label: string; desc: string }[] = [
    {
      id: 'uploading',
      label: '1. Streaming Upload',
      desc: progressPercent !== undefined && progressPercent > 0 && progressPercent < 100
        ? `Transmitting PDF securely to backend (${progressPercent}%)`
        : 'Transmitting PDF document to secure backend API',
    },
    {
      id: 'reading',
      label: '2. Long-Context Ingestion',
      desc: 'Loading complete document text, tables, and equations via Gemini Files API',
    },
    {
      id: 'analyzing',
      label: '3. Grounded Academic Extraction',
      desc: 'Extracting verbatim findings, exact quotations, and author-acknowledged limitations',
    },
  ];

  const comparisonSteps: { id: 'uploading' | 'reading' | 'analyzing'; label: string; desc: string }[] = [
    {
      id: 'uploading',
      label: '1. Cross-Paper Alignment',
      desc: 'Aggregating structured methodologies, findings, and benchmark metrics',
    },
    {
      id: 'reading',
      label: '2. Comparative Dimension Mapping',
      desc: 'Mapping problem formulations, architectural tradeoffs, and empirical datasets',
    },
    {
      id: 'analyzing',
      label: '3. Scholarly Synthesis & Trade-off Matrix',
      desc: 'Generating comparative matrix, shared assumptions, and practical researcher guide',
    },
  ];

  const steps = isComparisonMode ? comparisonSteps : analysisSteps;

  const getStepStatus = (stepId: 'uploading' | 'reading' | 'analyzing') => {
    const order = ['uploading', 'reading', 'analyzing', 'completed'];
    const currentIndex = order.indexOf(currentStep);
    const stepIndex = order.indexOf(stepId);

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full max-w-2xl mx-auto my-8 p-6 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs transition-colors">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-100 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            {isComparisonMode ? (
              <Scale className="w-5 h-5 text-blue-900 dark:text-blue-400" />
            ) : (
              <FileText className="w-5 h-5 text-blue-900 dark:text-blue-400" />
            )}
            <h2 className="font-serif-heading text-lg font-semibold text-stone-900 dark:text-stone-100">
              {isComparisonMode
                ? 'Synthesizing Cross-Paper Literature Review'
                : totalPapers && totalPapers > 1 && paperIndex !== undefined
                ? `Analyzing Paper ${paperIndex + 1} of ${totalPapers}`
                : 'Processing Research Paper PDF'}
            </h2>
          </div>
          <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 truncate max-w-md">
            {isComparisonMode
              ? `Generating multi-dimensional comparison across ${totalPapers || 'selected'} papers`
              : paperName || 'Direct end-to-end PDF processing with Gemini long-context'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-mono shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>{elapsedSeconds}s</span>
        </div>
      </div>

      {/* Progress Bar if uploading */}
      {currentStep === 'uploading' && progressPercent !== undefined && progressPercent > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-stone-700 dark:text-stone-300 mb-1">
            <span>Upload progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-900 dark:bg-blue-500 transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {steps.map((step) => {
          const status = getStepStatus(step.id);
          return (
            <div
              key={step.id}
              className={`flex items-start gap-4 p-3.5 rounded-lg transition-all duration-300 ${
                status === 'active'
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60'
                  : status === 'completed'
                  ? 'bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800'
                  : 'opacity-40 border border-transparent'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {status === 'completed' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                )}
                {status === 'active' && (
                  <Loader2 className="w-5 h-5 text-blue-900 dark:text-blue-400 animate-spin" />
                )}
                {status === 'pending' && (
                  <Circle className="w-5 h-5 text-stone-400 dark:text-stone-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      status === 'active'
                        ? 'text-blue-900 dark:text-blue-300'
                        : status === 'completed'
                        ? 'text-stone-900 dark:text-stone-200'
                        : 'text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  {status === 'active' && (
                    <span className="text-[11px] font-medium text-blue-800 dark:text-blue-300 animate-pulse">
                      Processing...
                    </span>
                  )}
                  {status === 'completed' && (
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      Completed
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-700 dark:text-stone-300">
        <span>Target turnaround: &lt; 45 seconds</span>
        <span>Secure server-side API processing</span>
      </div>
    </div>
  );
}
