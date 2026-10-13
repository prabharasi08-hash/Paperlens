import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { ProgressSteps } from './components/ProgressSteps';
import { AnalysisView } from './components/AnalysisView';
import { ComparisonView } from './components/ComparisonView';
import { WorkbenchBar } from './components/WorkbenchBar';
import { ErrorBanner } from './components/ErrorBanner';
import { ResearchAgentDrawer } from './components/ResearchAgentDrawer';
import { 
  PaperAnalysis, 
  PaperItem, 
  PaperComparison, 
  AnalysisStep, 
  AnalysisError,
  AgentMode
} from './types';
import { createSampleResearchPdf } from './utils/samplePaper';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('paperlens_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Multi-paper state collection
  const [papers, setPapers] = useState<PaperItem[]>([]);
  const [activePaperId, setActivePaperId] = useState<string | null>(null);
  const [comparison, setComparison] = useState<PaperComparison | null>(null);
  const [isComparisonActive, setIsComparisonActive] = useState<boolean>(false);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // Global processing indicators
  const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);
  const [activeProcessingPaper, setActiveProcessingPaper] = useState<{
    id: string;
    name: string;
    index: number;
    total: number;
    step: AnalysisStep;
    uploadPercent: number;
  } | null>(null);

  const [error, setError] = useState<AnalysisError | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showAddPaperDialog, setShowAddPaperDialog] = useState<boolean>(false);

  // AI Research Agent drawer state
  const [isAgentOpen, setIsAgentOpen] = useState<boolean>(false);
  const [agentInitialPrompt, setAgentInitialPrompt] = useState<string>('');
  const [agentInitialMode, setAgentInitialMode] = useState<AgentMode>('general');

  const timerRef = useRef<number | null>(null);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenAgent = (prompt?: string, mode?: AgentMode) => {
    if (prompt) setAgentInitialPrompt(prompt);
    if (mode) setAgentInitialMode(mode);
    setIsAgentOpen(true);
  };

  // Synchronize dark mode class on HTML root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('paperlens_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('paperlens_theme', 'light');
    }
  }, [darkMode]);

  // Elapsed timer during paper or comparison processing
  useEffect(() => {
    if (isProcessingQueue || isComparing) {
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedSeconds(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isProcessingQueue, isComparing]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Core API call: Upload file via FormData (supports up to 100 MB with streaming)
  const uploadAndAnalyzeFile = async (
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<PaperAnalysis> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload-and-analyze');

      // Upload progress tracking
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject({
              status: xhr.status,
              message: data.error || 'Failed to analyze paper.',
              type: data.type || (xhr.status === 429 ? 'rate_limit' : 'api_error'),
              canRetry: data.canRetry !== false,
            });
          }
        } catch {
          reject({
            status: xhr.status,
            message: `Server returned HTTP ${xhr.status}.`,
            type: 'api_error',
            canRetry: true,
          });
        }
      };

      xhr.onerror = () => {
        reject({
          message: 'Network error occurred while uploading PDF to server.',
          type: 'generic',
          canRetry: true,
        });
      };

      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('pdf', file, file.name);
      formData.append('fileName', file.name);
      xhr.send(formData);
    });
  };

  // Process a list of File objects in sequence
  const processFiles = async (incomingFiles: File[], autoCompare = false) => {
    if (incomingFiles.length === 0) return;

    setError(null);
    setIsProcessingQueue(true);

    const newPaperItems: PaperItem[] = incomingFiles.map((file) => ({
      id: `paper_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: Date.now(),
      status: 'idle',
    }));

    setPapers((prev) => [...prev, ...newPaperItems]);
    setShowAddPaperDialog(false);

    // Analyze each paper sequentially
    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];
      const paperItem = newPaperItems[i];

      setActiveProcessingPaper({
        id: paperItem.id,
        name: file.name,
        index: i,
        total: incomingFiles.length,
        step: 'uploading',
        uploadPercent: 0,
      });

      // Update paper status to uploading
      setPapers((prev) =>
        prev.map((p) =>
          p.id === paperItem.id ? { ...p, status: 'uploading', uploadProgress: 0 } : p
        )
      );

      try {
        // Step timer simulations for reading/analyzing states
        const readingTimer = setTimeout(() => {
          setActiveProcessingPaper((curr) =>
            curr && curr.id === paperItem.id ? { ...curr, step: 'reading' } : curr
          );
          setPapers((prev) =>
            prev.map((p) => (p.id === paperItem.id ? { ...p, status: 'reading' } : p))
          );
        }, 1500);

        const analyzingTimer = setTimeout(() => {
          setActiveProcessingPaper((curr) =>
            curr && curr.id === paperItem.id ? { ...curr, step: 'analyzing' } : curr
          );
          setPapers((prev) =>
            prev.map((p) => (p.id === paperItem.id ? { ...p, status: 'analyzing' } : p))
          );
        }, 4000);

        const analysisResult = await uploadAndAnalyzeFile(file, (percent) => {
          setActiveProcessingPaper((curr) =>
            curr && curr.id === paperItem.id ? { ...curr, uploadPercent: percent } : curr
          );
          setPapers((prev) =>
            prev.map((p) => (p.id === paperItem.id ? { ...p, uploadProgress: percent } : p))
          );
        });

        clearTimeout(readingTimer);
        clearTimeout(analyzingTimer);

        // Update paper item with completed analysis
        setPapers((prev) =>
          prev.map((p) =>
            p.id === paperItem.id
              ? {
                  ...p,
                  status: 'completed',
                  analysis: analysisResult,
                  uploadProgress: 100,
                }
              : p
          )
        );

        // Set as active paper if first one
        if (i === 0 && !activePaperId) {
          setActivePaperId(paperItem.id);
        }
      } catch (err: any) {
        setPapers((prev) =>
          prev.map((p) =>
            p.id === paperItem.id
              ? {
                  ...p,
                  status: 'error',
                  error: {
                    message: err?.message || 'Failed to process document.',
                    type: err?.type || 'generic',
                    canRetry: err?.canRetry !== false,
                  },
                }
              : p
          )
        );

        setError({
          message: `Failed to analyze "${file.name}": ${err?.message || 'Unknown error'}`,
          type: err?.type || 'generic',
          canRetry: true,
        });
      }
    }

    setIsProcessingQueue(false);
    setActiveProcessingPaper(null);

    // If autoCompare is requested, trigger comparison synthesis
    if (autoCompare) {
      setTimeout(() => {
        triggerComparison();
      }, 400);
    }
  };

  // Convert raw base64 sample PDF to File object and run analysis
  const handleLoadSamplePaper = (paperId: string) => {
    const sample = createSampleResearchPdf(paperId);
    const byteCharacters = atob(sample.base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const file = new File([byteArray], sample.fileName, { type: 'application/pdf' });

    processFiles([file], false);
  };

  // Load 2 classic sample papers (Vaswani Transformers + Devlin BERT) for instant comparison
  const handleLoadCompareSamples = () => {
    const sample1 = createSampleResearchPdf('transformer');
    const sample2 = createSampleResearchPdf('bert');

    const toFile = (base64: string, name: string) => {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      return new File([new Uint8Array(byteNumbers)], name, { type: 'application/pdf' });
    };

    const file1 = toFile(sample1.base64, sample1.fileName);
    const file2 = toFile(sample2.base64, sample2.fileName);

    processFiles([file1, file2], true);
  };

  // Trigger Multi-Paper Comparison via backend endpoint /api/compare
  const triggerComparison = async () => {
    // Get all completed papers with analyses
    const completed = papers.filter((p) => p.status === 'completed' && p.analysis);
    if (completed.length < 2) {
      setError({
        message: 'At least 2 analyzed research papers are required to generate a comparison.',
        type: 'generic',
        canRetry: false,
      });
      return;
    }

    setError(null);
    setIsComparing(true);
    setElapsedSeconds(0);

    try {
      const payload = {
        papers: completed.map((p) => ({
          id: p.id,
          fileName: p.fileName,
          title: p.analysis?.metadata.title || p.fileName,
          analysis: p.analysis,
        })),
      };

      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.error || 'Failed to generate cross-paper comparison.',
          type: data.type || 'api_error',
        };
      }

      setComparison(data);
      setIsComparisonActive(true);
    } catch (err: any) {
      setError({
        message: err?.message || 'An error occurred while synthesizing paper comparison.',
        type: 'api_error',
        canRetry: true,
      });
    } finally {
      setIsComparing(false);
    }
  };

  const handleSelectPaper = (paperId: string) => {
    setActivePaperId(paperId);
    setIsComparisonActive(false);
  };

  const handleRemovePaper = (paperId: string) => {
    setPapers((prev) => {
      const updated = prev.filter((p) => p.id !== paperId);
      if (activePaperId === paperId) {
        setActivePaperId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });

    // Invalidate stale comparison if paper removed
    setComparison(null);
    if (isComparisonActive) {
      setIsComparisonActive(false);
    }
  };

  const handleReset = () => {
    setPapers([]);
    setActivePaperId(null);
    setComparison(null);
    setIsComparisonActive(false);
    setError(null);
    setShowAddPaperDialog(false);
  };

  // Get active paper
  const activePaper = papers.find((p) => p.id === activePaperId) || papers[0] || null;
  const completedPapersCount = papers.filter((p) => p.status === 'completed' && p.analysis).length;
  const hasPapers = papers.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      <Header 
        darkMode={darkMode} 
        onToggleDarkMode={toggleDarkMode} 
        onReset={handleReset}
        hasPapers={hasPapers}
        onOpenAgent={() => handleOpenAgent()}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Error notification banner */}
        {error && (
          <ErrorBanner
            error={error}
            onRetry={error.canRetry ? () => (isComparing ? triggerComparison() : null) : undefined}
            onDismiss={() => setError(null)}
          />
        )}

        {/* Multi-Paper Workbench Navigation Bar (visible once papers are uploaded) */}
        {hasPapers && (
          <WorkbenchBar
            papers={papers}
            activePaperId={activePaperId}
            isComparisonActive={isComparisonActive}
            isComparing={isComparing}
            onSelectPaper={handleSelectPaper}
            onOpenComparison={() => {
              if (comparison) {
                setIsComparisonActive(true);
              } else {
                triggerComparison();
              }
            }}
            onAddPaperClick={() => hiddenFileInputRef.current?.click()}
            onRemovePaper={handleRemovePaper}
            onOpenAgent={() => handleOpenAgent()}
          />
        )}

        {/* Hidden File Input for Add Paper */}
        <input
          ref={hiddenFileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const filesArray = Array.from(e.target.files);
              processFiles(filesArray, false);
            }
          }}
        />

        {/* STATE 1: Empty state / Initial Upload Zone */}
        {!hasPapers && !isProcessingQueue && (
          <UploadZone
            onFilesSelected={(files) => processFiles(files, files.length >= 2)}
            onLoadSamplePaper={handleLoadSamplePaper}
            onLoadCompareSamples={handleLoadCompareSamples}
            onError={(validationErr) => setError(validationErr)}
            isLoading={isProcessingQueue}
          />
        )}

        {/* STATE 2: In-flight processing progress */}
        {isProcessingQueue && activeProcessingPaper && (
          <div className="py-6">
            <ProgressSteps
              currentStep={activeProcessingPaper.step}
              elapsedSeconds={elapsedSeconds}
              paperName={activeProcessingPaper.name}
              paperIndex={activeProcessingPaper.index}
              totalPapers={activeProcessingPaper.total}
              progressPercent={activeProcessingPaper.uploadPercent}
              isComparisonMode={false}
            />
          </div>
        )}

        {/* STATE 3: In-flight comparison synthesis progress */}
        {isComparing && (
          <div className="py-6">
            <ProgressSteps
              currentStep="analyzing"
              elapsedSeconds={elapsedSeconds}
              totalPapers={completedPapersCount}
              isComparisonMode={true}
            />
          </div>
        )}

        {/* STATE 4: Multi-Paper Comparative View */}
        {!isComparing && !isProcessingQueue && isComparisonActive && comparison && (
          <ComparisonView
            comparison={comparison}
            papers={papers.filter((p) => p.status === 'completed' && p.analysis)}
            onBackToWorkbench={() => setIsComparisonActive(false)}
            onSelectPaper={(pId) => handleSelectPaper(pId)}
            onOpenAgent={handleOpenAgent}
          />
        )}

        {/* STATE 5: Individual Paper Detailed Analysis View */}
        {!isComparing && !isProcessingQueue && !isComparisonActive && activePaper && activePaper.analysis && (
          <AnalysisView
            analysis={activePaper.analysis}
            fileName={activePaper.fileName}
            fileSize={activePaper.fileSize}
            onReset={handleReset}
            onCompareClick={completedPapersCount >= 2 ? () => {
              if (comparison) {
                setIsComparisonActive(true);
              } else {
                triggerComparison();
              }
            } : () => hiddenFileInputRef.current?.click()}
            canCompare={completedPapersCount >= 2}
            onOpenAgent={handleOpenAgent}
          />
        )}

        {/* Fallback if paper in error state */}
        {!isComparing && !isProcessingQueue && !isComparisonActive && activePaper && activePaper.status === 'error' && (
          <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-8">
            <h3 className="text-base font-semibold text-red-600 dark:text-red-400 mb-2">
              Unable to analyze &quot;{activePaper.fileName}&quot;
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 max-w-md mx-auto mb-4">
              {activePaper.error?.message || 'An error occurred during analysis.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleRemovePaper(activePaper.id)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              >
                Remove from workbench
              </button>
              <button
                type="button"
                onClick={() => hiddenFileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-900 text-white hover:bg-blue-800 transition-colors"
              >
                Upload another PDF
              </button>
            </div>
          </div>
        )}
      </main>

      {/* AI Research Agent Drawer Component */}
      <ResearchAgentDrawer
        isOpen={isAgentOpen}
        onClose={() => setIsAgentOpen(false)}
        papers={papers}
        activePaperId={activePaperId}
        comparison={comparison}
        initialPrompt={agentInitialPrompt}
        initialMode={agentInitialMode}
      />

      {/* Academic Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-6 text-center text-xs text-stone-500 dark:text-stone-400 bg-white/50 dark:bg-stone-900/50">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PaperLens • Autonomous AI Research Agent & Grounded Triage</span>
          <span>Secured Server Backend • 100MB PDF Streaming • Gemini 3.8 Long Context</span>
        </div>
      </footer>
    </div>
  );
}
