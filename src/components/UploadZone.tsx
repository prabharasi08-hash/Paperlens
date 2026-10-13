import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { 
  Upload, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  HardDrive, 
  Scale, 
  X 
} from 'lucide-react';
import { SAMPLE_PAPERS_LIST } from '../utils/samplePaper';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSamplePaper: (paperId: string) => void;
  onLoadCompareSamples: () => void;
  onError: (error: { message: string; type: 'oversized' | 'invalid_type' | 'generic'; canRetry?: boolean }) => void;
  isLoading: boolean;
}

export function UploadZone({
  onFilesSelected,
  onLoadSamplePaper,
  onLoadCompareSamples,
  onError,
  isLoading,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB max size

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const validateAndAddFiles = (incomingFiles: FileList | File[]) => {
    const valid: File[] = [];

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];

      // Validate MIME type or .pdf extension
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        onError({
          message: `"${file.name}" is not a PDF file. PaperLens only accepts PDF documents (.pdf).`,
          type: 'invalid_type',
          canRetry: false,
        });
        continue;
      }

      // Validate 100MB limit
      if (file.size > MAX_SIZE_BYTES) {
        const actualSizeMb = (file.size / (1024 * 1024)).toFixed(1);
        onError({
          message: `File size exceeds the 100 MB limit. "${file.name}" is ${actualSizeMb} MB.`,
          type: 'oversized',
          canRetry: false,
        });
        continue;
      }

      valid.push(file);
    }

    if (valid.length > 0) {
      setStagedFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const newOnes = valid.filter((f) => !existingNames.has(f.name));
        return [...prev, ...newOnes];
      });
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleProceed = () => {
    if (stagedFiles.length > 0) {
      onFilesSelected(stagedFiles);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-4 px-2 sm:px-4">
      {/* Editorial Heading */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Secure Backend • 100MB Large PDFs • Multi-Paper Comparison</span>
        </div>
        <h1 className="font-serif-heading text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Analyze & Compare Academic Research Papers
        </h1>
        <p className="mt-3 text-sm sm:text-base text-stone-700 dark:text-stone-300 max-w-2xl mx-auto leading-relaxed font-normal">
          Upload single or multiple research papers up to 100 MB. PaperLens processes full documents through long-context Gemini, generating verbatim findings, verified limitations, and cross-paper comparative matrices.
        </p>
      </div>

      {/* Main Upload Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 bg-white dark:bg-stone-900 ${
          isDragging
            ? 'border-blue-900 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-4 ring-blue-100 dark:ring-blue-950'
            : stagedFiles.length > 0
            ? 'border-blue-300 dark:border-blue-800 bg-blue-50/15 dark:bg-blue-950/10'
            : 'border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 hover:bg-stone-50/50 dark:hover:bg-stone-800/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isLoading}
        />

        <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-900 dark:text-blue-400 mb-4">
          <Upload className="w-7 h-7 stroke-[1.75]" />
        </div>

        <h3 className="font-serif-heading text-lg font-semibold text-stone-900 dark:text-stone-100">
          {isDragging
            ? 'Drop research paper PDFs here'
            : 'Drop research paper PDFs here, or click to browse'}
        </h3>
        <p className="text-xs text-stone-700 dark:text-stone-300 mt-1.5 max-w-md mx-auto">
          Select single or multiple PDFs • Up to 100 MB per file • Direct streaming with secure backend API
        </p>

        {/* Staged Files List */}
        {stagedFiles.length > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-6 max-w-xl mx-auto space-y-2 text-left"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300 px-1">
              <span>{stagedFiles.length} file{stagedFiles.length > 1 ? 's' : ''} ready to analyze:</span>
              <span className="text-[11px] text-blue-900 dark:text-blue-400 font-medium">Click &quot;Analyze&quot; below</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 p-1">
              {stagedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-2.5 px-3 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="p-1.5 rounded bg-blue-900 text-white shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="font-semibold text-stone-900 dark:text-stone-100 block truncate">
                        {file.name}
                      </span>
                      <span className="text-[11px] text-stone-600 dark:text-stone-300">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStagedFile(idx);
                    }}
                    className="p-1 rounded text-stone-600 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Actions Bar */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Quick Sample Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onLoadCompareSamples}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-2xs"
            title="Load 2 landmark papers (Attention + BERT) to compare side-by-side"
          >
            <Scale className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
            <span>Compare 2 Sample Papers (Attention vs. BERT)</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5">
            {SAMPLE_PAPERS_LIST.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => onLoadSamplePaper(sample.id)}
                disabled={isLoading}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-stone-800 hover:bg-white dark:hover:bg-stone-800 transition-colors"
                title={`Load ${sample.title}`}
              >
                {sample.authors.split(' ')[0]} ({sample.year})
              </button>
            ))}
          </div>
        </div>

        {/* Start Analysis Button */}
        {stagedFiles.length > 0 && !isLoading && (
          <button
            type="button"
            onClick={handleProceed}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold shadow-xs transition-colors"
          >
            <span>
              {stagedFiles.length > 1
                ? `Analyze & Compare ${stagedFiles.length} Papers`
                : 'Analyze Paper'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Core Architectural Pillars */}
      <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-400 mb-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Secured Backend API
            </span>
          </div>
          <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
            API keys and tokens remain strictly isolated on the Node server. Rate-limiting and error sanitization protect upstream services.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-400 mb-1.5">
            <HardDrive className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              100 MB Large PDFs
            </span>
          </div>
          <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
            Multipart streaming and Gemini Files API ingestion support dissertation-length manuscripts and high-density academic proceedings.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-400 mb-1.5">
            <Scale className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Multi-Paper Comparison
            </span>
          </div>
          <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
            Synthesize side-by-side matrices, evaluate trade-offs, and discover convergences across 2 to 8 peer-reviewed research papers.
          </p>
        </div>
      </div>
    </div>
  );
}
