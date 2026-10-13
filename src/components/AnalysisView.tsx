import React, { useState } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  ArrowLeft, 
  BookOpen, 
  FlaskConical, 
  Sparkles, 
  AlertOctagon, 
  Quote, 
  MapPin, 
  Tag, 
  Calendar, 
  Building2, 
  Users,
  FileText,
  Scale,
  Bot,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { PaperAnalysis, AgentMode } from '../types';
import { generateMarkdown, downloadMarkdownFile } from '../utils/markdown';

interface AnalysisViewProps {
  analysis: PaperAnalysis;
  fileName: string;
  fileSize: number;
  onReset: () => void;
  onCompareClick?: () => void;
  canCompare?: boolean;
  onOpenAgent?: (prompt?: string, mode?: AgentMode) => void;
}

export function AnalysisView({ 
  analysis, 
  fileName, 
  fileSize, 
  onReset,
  onCompareClick,
  canCompare,
  onOpenAgent,
}: AnalysisViewProps) {
  const [copied, setCopied] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDownload = () => {
    const mdContent = generateMarkdown(analysis, fileName);
    const safeTitle = (analysis.metadata.title || fileName || 'paper')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 40);
    downloadMarkdownFile(mdContent, `PaperLens-${safeTitle}.md`);
  };

  const handleCopyMarkdown = async () => {
    const mdContent = generateMarkdown(analysis, fileName);
    try {
      await navigator.clipboard.writeText(mdContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
    }
  };

  const title = analysis.metadata.title || fileName.replace(/\.pdf$/i, '');
  const authors = analysis.metadata.authors && analysis.metadata.authors.length > 0
    ? analysis.metadata.authors.join(', ')
    : 'Not found in paper.';
  const year = analysis.metadata.year ? analysis.metadata.year.toString() : 'Not found in paper.';
  const venue = analysis.metadata.venue || 'Not found in paper.';
  const keywords = analysis.keywords && analysis.keywords.length > 0 ? analysis.keywords : [];

  return (
    <div className="w-full max-w-5xl mx-auto my-6 px-4 pb-16 space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200 dark:border-stone-800">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Analyze another paper</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenAgent && (
            <button
              type="button"
              onClick={() => onOpenAgent(`Provide a comprehensive peer-review critique of "${title}", scrutinizing baseline fairness, dataset limitations, and theoretical validity.`, 'reviewer')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-blue-950 dark:text-blue-200 text-xs font-semibold shadow-2xs transition-colors"
              title="Open AI Research Agent for this paper"
            >
              <Bot className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
              <span>Ask AI Agent</span>
            </button>
          )}

          {onCompareClick && (
            <button
              type="button"
              onClick={onCompareClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-semibold shadow-2xs transition-colors"
              title="Compare this paper with others in your workbench"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>{canCompare ? "Compare Papers" : "Add Paper to Compare"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-medium transition-colors"
            title="Copy analysis in Markdown format"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400">Copied Markdown</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Markdown</span>
          </button>
        </div>
      </div>

      {/* File Badge Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-blue-900 dark:text-blue-400 shrink-0" />
          <span className="font-medium text-stone-900 dark:text-stone-200 truncate">{fileName}</span>
          {fileSize > 0 && <span className="text-stone-400 dark:text-stone-500">({formatFileSize(fileSize)})</span>}
        </div>
        <div className="text-[11px] text-stone-500 dark:text-stone-400">
          Analysis grounded strictly in uploaded PDF text
        </div>
      </div>

      {/* CARD 1: OVERVIEW */}
      <section 
        id="overview-card"
        className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-xs transition-colors"
      >
        <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-stone-100 dark:border-stone-800 text-blue-900 dark:text-blue-400">
          <BookOpen className="w-5 h-5" />
          <h2 className="font-serif-heading text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Card 1: Overview
          </h2>
        </div>

        {/* Paper Title */}
        <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold text-stone-950 dark:text-stone-50 leading-tight">
          {title}
        </h1>

        {/* Metadata Details */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-stone-100 dark:border-stone-800 text-xs">
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-stone-500 dark:text-stone-400 block font-medium">Authors</span>
              <span className="text-stone-800 dark:text-stone-200 font-semibold">{authors}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-stone-500 dark:text-stone-400 block font-medium">Year</span>
              <span className="text-stone-800 dark:text-stone-200 font-semibold">{year}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-stone-500 dark:text-stone-400 block font-medium">Venue / Archive</span>
              <span className="text-stone-800 dark:text-stone-200 font-semibold">{venue}</span>
            </div>
          </div>
        </div>

        {/* Keywords */}
        <div className="mt-6">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
            <Tag className="w-3.5 h-3.5" />
            <span>Keywords</span>
          </div>
          {keywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700"
                >
                  {kw}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-500 italic">Not found in paper.</p>
          )}
        </div>

        {/* Summary (max 120 words) */}
        <div className="mt-6 pt-6 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-900 dark:text-blue-400">
              Executive Summary (≤ 120 words)
            </span>
            <span className="text-[11px] text-stone-400 font-mono">
              {analysis.summary ? `${analysis.summary.trim().split(/\s+/).length} words` : ''}
            </span>
          </div>
          <p className="text-sm sm:text-base text-stone-800 dark:text-stone-200 leading-relaxed font-sans">
            {analysis.summary || 'Not found in paper.'}
          </p>
        </div>

        {/* Research Problem */}
        <div className="mt-6 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-900 dark:text-blue-300 block mb-1">
            Core Research Problem & Gap
          </span>
          <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
            {analysis.research_problem || 'Not found in paper.'}
          </p>
        </div>
      </section>

      {/* CARD 2: METHODOLOGY */}
      <section 
        id="methodology-card"
        className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-xs transition-colors"
      >
        <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-stone-100 dark:border-stone-800 text-blue-900 dark:text-blue-400">
          <FlaskConical className="w-5 h-5" />
          <h2 className="font-serif-heading text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Card 2: Methodology
          </h2>
        </div>

        <div className="prose dark:prose-invert max-w-none">
          <p className="text-sm sm:text-base text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-line">
            {analysis.methodology || 'Not found in paper.'}
          </p>
        </div>
      </section>

      {/* CARD 3: FINDINGS */}
      <section 
        id="findings-card"
        className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-xs transition-colors"
      >
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-400">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-serif-heading text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Card 3: Key Findings
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onOpenAgent && (
              <button
                type="button"
                onClick={() => onOpenAgent(`Fact-check and verify each of the key empirical findings of "${title}" against verbatim evidence and experimental tables in the paper.`, 'factcheck')}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-emerald-700 dark:text-emerald-300 border border-stone-200 dark:border-stone-700 transition-colors"
                title="Ask AI Agent to fact-check findings against verbatim text"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verify Quotes</span>
              </button>
            )}
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              {analysis.key_findings ? `${analysis.key_findings.length} findings identified` : ''}
            </span>
          </div>
        </div>

        {analysis.key_findings && analysis.key_findings.length > 0 ? (
          <div className="space-y-6">
            {analysis.key_findings.map((kf, index) => (
              <div 
                key={index} 
                className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-900 dark:bg-blue-800 text-white text-xs font-bold shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <h3 className="font-serif-heading text-base font-bold text-stone-900 dark:text-stone-100">
                      {kf.finding || 'Not found in paper.'}
                    </h3>
                  </div>
                </div>

                {/* Verbatim Evidence Quote */}
                <div className="ml-9 p-3 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-900 dark:text-blue-400 mb-1">
                    <Quote className="w-3 h-3" />
                    <span>Verbatim Evidence Quote (≤ 25 words)</span>
                  </div>
                  <blockquote className="text-xs sm:text-sm italic text-stone-700 dark:text-stone-300 font-serif leading-relaxed">
                    &ldquo;{kf.evidence_quote || 'Not found in paper.'}&rdquo;
                  </blockquote>

                  {/* Location Coordinate */}
                  <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
                    <MapPin className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400 shrink-0" />
                    <span className="font-medium text-stone-500 dark:text-stone-400">Location in paper:</span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">{kf.location || 'Not found in paper.'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500 italic">Not found in paper.</p>
        )}
      </section>

      {/* CARD 4: LIMITATIONS */}
      <section 
        id="limitations-card"
        className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-xs transition-colors"
      >
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-400">
            <AlertOctagon className="w-5 h-5" />
            <h2 className="font-serif-heading text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Card 4: Limitations & Boundary Conditions
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onOpenAgent && (
              <button
                type="button"
                onClick={() => onOpenAgent(`Design 2-3 precise ablation experiments and follow-up studies specifically overcoming the limitations identified in "${title}".`, 'experiment')}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-purple-700 dark:text-purple-300 border border-stone-200 dark:border-stone-700 transition-colors"
                title="Ask AI Agent to design follow-up experiments for these limitations"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Design Experiments</span>
              </button>
            )}
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              {analysis.limitations ? `${analysis.limitations.length} items analyzed` : ''}
            </span>
          </div>
        </div>

        {analysis.limitations && analysis.limitations.length > 0 ? (
          <div className="space-y-4">
            {analysis.limitations.map((lim, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border transition-colors ${
                  lim.stated_by_authors
                    ? 'bg-stone-50/80 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800'
                    : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        lim.stated_by_authors
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {lim.stated_by_authors ? 'Author Acknowledged' : 'Unstated by Authors'}
                    </span>
                    {lim.location && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                        <MapPin className="w-3 h-3" />
                        {lim.location}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
                  {lim.limitation || 'Not found in paper.'}
                </p>
                {!lim.stated_by_authors && (
                  <p className="text-xs text-amber-800 dark:text-amber-400/90 mt-1">
                    * Not explicitly articulated in the authors&apos; limitations section; identified through methodological constraints.
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500 italic">Not found in paper.</p>
        )}
      </section>

      {/* Bottom Download Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-stone-100 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800">
        <div>
          <h3 className="font-serif-heading text-base font-bold text-stone-900 dark:text-stone-100">
            Keep this analysis for your literature review
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Export the complete structured breakdown including quotes and page citations as Markdown.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Markdown (.md)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
