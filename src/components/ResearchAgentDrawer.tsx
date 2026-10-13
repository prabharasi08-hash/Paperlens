import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  ShieldAlert, 
  FlaskConical, 
  Cpu, 
  Scale, 
  CheckCircle2, 
  BookMarked, 
  MessageSquare, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Quote, 
  ArrowRight,
  Maximize2,
  Minimize2,
  Trash2,
  Library,
  FileText
} from 'lucide-react';
import { 
  PaperItem, 
  PaperComparison, 
  AgentMode, 
  AgentMessage, 
  AgentThoughtStep, 
  AgentCitation 
} from '../types';

interface ResearchAgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  papers: PaperItem[];
  activePaperId: string | null;
  comparison: PaperComparison | null;
  initialPrompt?: string;
  initialMode?: AgentMode;
}

const AGENT_MODES: {
  id: AgentMode;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
  examplePrompts: string[];
}[] = [
  {
    id: 'reviewer',
    label: 'Peer-Review Critique',
    shortLabel: 'Critique',
    description: 'Adversarial peer-review scrutinizing methodology, baselines, and unstated assumptions.',
    icon: ShieldAlert,
    badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900',
    examplePrompts: [
      'Conduct a thorough peer review critiquing the baseline comparisons and threats to validity.',
      'What are the most critical unstated assumptions or failure modes of this method?',
      'Are the claimed empirical gains statistically meaningful or potentially overfitted?',
    ],
  },
  {
    id: 'experiment',
    label: 'Ablation & Experiment Design',
    shortLabel: 'Experiments',
    description: 'Propose testable research hypotheses, ablation studies, and new evaluations.',
    icon: FlaskConical,
    badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900',
    examplePrompts: [
      'Design an ablation experiment isolating which component contributes most to empirical performance.',
      'Propose 2 novel follow-up research hypotheses directly addressing the authors’ limitations.',
      'How would you stress-test this architecture on out-of-distribution benchmarks?',
    ],
  },
  {
    id: 'technical',
    label: 'Technical Deep-Dive',
    shortLabel: 'Algorithm',
    description: 'Scrutinize mathematical equations, computational complexity, and runtime bottlenecks.',
    icon: Cpu,
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900',
    examplePrompts: [
      'Break down the algorithmic complexity and mathematical formulation of the core mechanism.',
      'What are the memory and compute bottlenecks during training versus inference?',
      'Provide clean pseudocode explaining the step-by-step data tensor transformations.',
    ],
  },
  {
    id: 'synthesis',
    label: 'Cross-Paper Gap Analysis',
    shortLabel: 'Synthesis',
    description: 'Identify conflicting findings, complementary architectures, and unaddressed niches.',
    icon: Scale,
    badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    examplePrompts: [
      'Where do these papers fundamentally disagree or present conflicting empirical outcomes?',
      'Could the methodology in Paper 1 overcome the primary limitation in Paper 2?',
      'Synthesize a unified architectural paradigm combining the best aspects of both papers.',
    ],
  },
  {
    id: 'factcheck',
    label: 'Claim & Quote Verifier',
    shortLabel: 'Fact-Check',
    description: 'Verify user inquiries against verbatim textual evidence and exact locations.',
    icon: CheckCircle2,
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
    examplePrompts: [
      'Verify if the authors actually claimed state-of-the-art results and extract the exact quote.',
      'Did the authors disclose hardware, training duration, or compute infrastructure details?',
      'Is the claim regarding sequence length scaling supported by experimental tables in the paper?',
    ],
  },
  {
    id: 'bibtex',
    label: 'BibTeX & Literature Review',
    shortLabel: 'Citations',
    description: 'Generate standard BibTeX entries and a publication-ready literature review paragraph.',
    icon: BookMarked,
    badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900',
    examplePrompts: [
      'Generate publication-ready BibTeX citation entries and a synthesized literature review paragraph.',
      'Draft an introduction section paragraph placing these papers in academic context.',
      'Format a concise executive summary suitable for a lab meeting presentation slide.',
    ],
  },
  {
    id: 'general',
    label: 'Interactive Scholarly Inquirer',
    shortLabel: 'Q&A',
    description: 'Open-ended academic conversation grounded on the loaded papers.',
    icon: MessageSquare,
    badgeColor: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700',
    examplePrompts: [
      'Summarize the core paradigm shift introduced by these authors.',
      'What background knowledge is required before implementing this system from scratch?',
      'If you were an early-career PhD student, what research question would you tackle next?',
    ],
  },
];

export function ResearchAgentDrawer({
  isOpen,
  onClose,
  papers,
  activePaperId,
  comparison,
  initialPrompt,
  initialMode = 'general',
}: ResearchAgentDrawerProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<AgentMode>(initialMode);
  const [targetScope, setTargetScope] = useState<string>(activePaperId || 'all');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [activeThoughtSteps, setActiveThoughtSteps] = useState<AgentThoughtStep[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [openThoughtsMap, setOpenThoughtsMap] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync initial prompt/mode if provided when opened
  useEffect(() => {
    if (initialMode) setSelectedMode(initialMode);
    if (initialPrompt && initialPrompt.trim()) {
      setInputQuery(initialPrompt);
    }
  }, [initialMode, initialPrompt, isOpen]);

  // Sync default target paper
  useEffect(() => {
    if (activePaperId && papers.some((p) => p.id === activePaperId)) {
      setTargetScope(activePaperId);
    } else if (papers.length > 0) {
      setTargetScope('all');
    }
  }, [activePaperId, papers]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isExecuting, activeThoughtSteps]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const completedPapers = papers.filter((p) => p.status === 'completed' && p.analysis);
  const currentPaper = completedPapers.find((p) => p.id === targetScope);

  const toggleThoughts = (id: string) => {
    setOpenThoughtsMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleSend = async (queryToSend?: string, modeToUse?: AgentMode) => {
    const text = (queryToSend || inputQuery).trim();
    const mode = modeToUse || selectedMode;
    if (!text || isExecuting) return;

    const userMessageId = `user_${Date.now()}`;
    const userMessage: AgentMessage = {
      id: userMessageId,
      role: 'user',
      mode,
      content: text,
      timestamp: Date.now(),
      targetPaperId: targetScope,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsExecuting(true);

    // Dynamic simulated thinking steps for researcher feedback
    setActiveThoughtSteps([
      { step: '1. Ingesting Research Context', detail: `Parsing ${targetScope === 'all' ? `${completedPapers.length} loaded papers` : currentPaper?.analysis?.metadata.title || 'focused paper'}...` },
      { step: '2. Retrieving Grounded Evidence', detail: 'Cross-referencing methodology, quantitative benchmarks, and verbatim quotes...' },
      { step: '3. Academic Synthesis & Verification', detail: `Executing scholarly reasoning in '${mode}' mode...` },
    ]);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode,
          activePaperId: targetScope === 'all' ? undefined : targetScope,
          papers: completedPapers,
          comparison,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Agent error (${response.status})`);
      }

      const data = await response.json();

      const assistantMessageId = `assistant_${Date.now()}`;
      const assistantMessage: AgentMessage = {
        id: assistantMessageId,
        role: 'assistant',
        mode,
        content: data.response_markdown || 'No response generated.',
        thoughtSteps: data.thought_steps || [],
        actionsTaken: data.actions_taken || [],
        citations: data.citations || [],
        suggestedFollowups: data.suggested_followups || [],
        timestamp: Date.now(),
        targetPaperId: targetScope,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      // Default thoughts to open on newly received message
      setOpenThoughtsMap((prev) => ({
        ...prev,
        [assistantMessageId]: true,
      }));
    } catch (err: any) {
      const errorMessageId = `err_${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: errorMessageId,
          role: 'assistant',
          mode,
          content: `**Agent Execution Notice:** ${err.message || 'Unable to complete research query. Please try again.'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsExecuting(false);
      setActiveThoughtSteps([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-title"
    >
      <div 
        className={`bg-white dark:bg-stone-900 h-full flex flex-col shadow-2xl border-l border-stone-200 dark:border-stone-800 transition-all duration-300 ${
          isExpanded ? 'w-full max-w-5xl' : 'w-full sm:max-w-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-900 dark:bg-blue-800 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="agent-title" className="text-sm font-bold text-stone-900 dark:text-stone-100 font-serif-heading">
                  PaperLens AI Research Agent
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Grounded
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Autonomous academic reasoning • Gemini 3.8 Flash • {completedPapers.length} paper{completedPapers.length === 1 ? '' : 's'} in context
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title="Clear conversation history"
                aria-label="Clear conversation history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden sm:inline-flex p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title={isExpanded ? 'Contract to standard drawer' : 'Expand to wide workspace'}
              aria-label={isExpanded ? 'Contract to standard drawer' : 'Expand to wide workspace'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Close Research Agent drawer"
              aria-label="Close Research Agent drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Grounding & Target Paper Scope Selector */}
        <div className="px-5 py-2.5 bg-stone-100/70 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
            <Library className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
            <span className="font-semibold text-stone-700 dark:text-stone-300">Focus Target:</span>
            <select
              value={targetScope}
              onChange={(e) => setTargetScope(e.target.value)}
              className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 px-2 py-1 rounded border border-stone-200 dark:border-stone-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Entire Workbench ({completedPapers.length} papers)</option>
              {completedPapers.map((paper, idx) => (
                <option key={paper.id} value={paper.id}>
                  {idx + 1}. {paper.analysis?.metadata.title || paper.fileName}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-stone-500 dark:text-stone-400">
            {comparison ? '✓ Cross-paper matrix available' : 'Single & cross-paper inquiry'}
          </div>
        </div>

        {/* Mode Selector Strip */}
        <div className="px-5 py-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
          {AGENT_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setSelectedMode(mode.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all border ${
                  isSelected
                    ? 'bg-blue-900 text-white border-blue-900 shadow-2xs'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
                title={mode.description}
              >
                <Icon className={`w-3 h-3 ${isSelected ? 'text-blue-200' : 'text-stone-500 dark:text-stone-400'}`} />
                <span>{mode.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Welcome Screen / Quick Presets if empty */}
          {messages.length === 0 && (
            <div className="py-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif-heading mb-1">
                Autonomous Research Copilot
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 max-w-md mx-auto mb-6">
                Ask deep peer-review questions, design ablation experiments, verify empirical claims, or synthesize comparative literature notes directly from the text.
              </p>

              {/* Preset Action Grid */}
              <div className="text-left max-w-xl mx-auto space-y-2">
                <div className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-1">
                  Recommended Agent Tasks:
                </div>
                {AGENT_MODES.filter((m) => m.id !== 'general').slice(0, 4).map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setSelectedMode(mode.id);
                        handleSend(mode.examplePrompts[0], mode.id);
                      }}
                      className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all text-left group flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 group-hover:text-blue-900 dark:group-hover:text-blue-300 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 group-hover:text-blue-900 dark:group-hover:text-blue-400">
                            {mode.label}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-blue-900 dark:group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                          &quot;{mode.examplePrompts[0]}&quot;
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conversation history */}
          {messages.map((message) => {
            const isUser = message.role === 'user';
            const isThoughtsOpen = openThoughtsMap[message.id] ?? false;

            return (
              <div
                key={message.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                {/* Message attribution */}
                <div className="flex items-center gap-2 px-1 text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  {isUser ? (
                    <span>Researcher</span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-blue-900 dark:text-blue-400">ScholarAgent</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 uppercase font-mono">
                        {message.mode}
                      </span>
                    </div>
                  )}
                </div>

                {/* Message Bubble Container */}
                <div
                  className={`max-w-[92%] rounded-2xl p-4 text-xs transition-all border ${
                    isUser
                      ? 'bg-blue-900 text-white border-blue-900 shadow-2xs rounded-br-xs'
                      : 'bg-stone-50 dark:bg-stone-850 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800 shadow-xs rounded-bl-xs w-full'
                  }`}
                >
                  {/* User message rendering */}
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed font-sans">{message.content}</p>
                  ) : (
                    <div className="space-y-3.5">
                      {/* Collapsible Agent Thought Steps */}
                      {message.thoughtSteps && message.thoughtSteps.length > 0 && (
                        <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white/70 dark:bg-stone-900/70 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleThoughts(message.id)}
                            className="w-full px-3 py-2 flex items-center justify-between text-left text-[11px] font-semibold text-stone-600 dark:text-stone-300 bg-stone-100/80 dark:bg-stone-800/80 hover:bg-stone-200/60 dark:hover:bg-stone-700/60 transition-colors"
                          >
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>Agent Investigative Trail ({message.thoughtSteps.length} phases)</span>
                            </div>
                            {isThoughtsOpen ? (
                              <ChevronUp className="w-3.5 h-3.5 text-stone-500" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                            )}
                          </button>

                          {isThoughtsOpen && (
                            <div className="p-3 space-y-2 border-t border-stone-200 dark:border-stone-800 text-[11px] font-mono bg-white dark:bg-stone-900">
                              {message.thoughtSteps.map((step, sIdx) => (
                                <div key={sIdx} className="space-y-0.5">
                                  <div className="text-blue-900 dark:text-blue-400 font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                    {step.step}
                                  </div>
                                  <div className="text-stone-600 dark:text-stone-400 pl-2.5 font-sans leading-relaxed">
                                    {step.detail}
                                  </div>
                                </div>
                              ))}

                              {message.actionsTaken && message.actionsTaken.length > 0 && (
                                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-1 font-sans">
                                  <span className="text-[10px] text-stone-400 uppercase font-semibold mr-1 self-center">
                                    Actions Executed:
                                  </span>
                                  {message.actionsTaken.map((act, aIdx) => (
                                    <span
                                      key={aIdx}
                                      className="px-1.5 py-0.5 rounded text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono"
                                    >
                                      {act}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Main Markdown Content */}
                      <div className="prose prose-xs dark:prose-invert max-w-none font-sans leading-relaxed text-stone-800 dark:text-stone-200 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-stone-900 dark:[&_h2]:text-stone-100 [&_h2]:border-b [&_h2]:border-stone-200 dark:[&_h2]:border-stone-800 [&_h2]:pb-1 [&_h2]:mt-3 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-stone-900 dark:[&_h3]:text-stone-100 [&_h3]:mt-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-blue-900 dark:[&_blockquote]:border-blue-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:bg-stone-200/60 dark:[&_code]:bg-stone-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[11px]">
                        <Markdown>{message.content}</Markdown>
                      </div>

                      {/* Grounded Citations Cards */}
                      {message.citations && message.citations.length > 0 && (
                        <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-1.5">
                          <div className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                            <Quote className="w-3 h-3 text-blue-900 dark:text-blue-400" />
                            <span>Grounded Verbatim Citations:</span>
                          </div>
                          <div className="space-y-1">
                            {message.citations.map((cite, cIdx) => (
                              <div
                                key={cIdx}
                                className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px]"
                              >
                                <p className="italic text-stone-700 dark:text-stone-300 font-serif leading-snug">
                                  &quot;{cite.quote}&quot;
                                </p>
                                <div className="mt-1 flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 font-sans">
                                  <span>{cite.paperTitle || 'Primary Paper'}</span>
                                  {cite.location && (
                                    <span className="font-mono bg-stone-100 dark:bg-stone-800 px-1 py-0.2 rounded">
                                      {cite.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Copy & Utility Actions */}
                      <div className="pt-1 flex items-center justify-between text-[11px] text-stone-500">
                        <button
                          type="button"
                          onClick={() => handleCopy(message.id, message.content)}
                          className="flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                        >
                          {copiedMessageId === message.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">Copied Markdown</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Response</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Suggested Proactive Follow-ups */}
                      {message.suggestedFollowups && message.suggestedFollowups.length > 0 && (
                        <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-1.5">
                          <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                            Suggested Next Research Steps:
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {message.suggestedFollowups.map((followup, fIdx) => (
                              <button
                                key={fIdx}
                                type="button"
                                onClick={() => handleSend(followup, message.mode)}
                                className="text-left text-[11px] p-2 rounded-lg bg-stone-100 dark:bg-stone-800/60 hover:bg-stone-200/80 dark:hover:bg-stone-700/80 text-stone-700 dark:text-stone-300 transition-colors flex items-center justify-between group"
                              >
                                <span className="line-clamp-2">{followup}</span>
                                <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-blue-900 dark:group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* In-flight Agent Execution Spinner */}
          {isExecuting && (
            <div className="flex flex-col items-start space-y-2">
              <div className="flex items-center gap-1.5 px-1 text-[11px] text-stone-500 font-medium">
                <span className="font-semibold text-blue-900 dark:text-blue-400">ScholarAgent</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 uppercase font-mono">
                  Thinking...
                </span>
              </div>

              <div className="w-full max-w-[92%] rounded-2xl rounded-bl-xs p-4 bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-900 dark:text-blue-400" />
                  <span>Agent executing autonomous reasoning trail...</span>
                </div>

                {activeThoughtSteps.length > 0 && (
                  <div className="space-y-1.5 text-[11px] font-mono pl-6 border-l-2 border-blue-900/30 dark:border-blue-400/30">
                    {activeThoughtSteps.map((s, idx) => (
                      <div key={idx} className="text-stone-600 dark:text-stone-400">
                        <span className="text-blue-900 dark:text-blue-400 font-semibold">{s.step}:</span> {s.detail}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Dock */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="relative rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-850 focus-within:ring-2 focus-within:ring-blue-900/30 focus-within:border-blue-900 dark:focus-within:border-blue-700 transition-all">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              placeholder={`Ask ScholarAgent in '${AGENT_MODES.find((m) => m.id === selectedMode)?.label}' mode (e.g. critique baseline, design ablation, check quotes)...`}
              className="w-full p-3 pr-12 text-xs bg-transparent text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none resize-none font-sans"
            />

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputQuery.trim() || isExecuting}
              className={`absolute right-2.5 bottom-2.5 p-2 rounded-lg transition-all ${
                inputQuery.trim() && !isExecuting
                  ? 'bg-blue-900 text-white hover:bg-blue-950 dark:bg-blue-800 dark:hover:bg-blue-700 shadow-xs'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed'
              }`}
              title="Send research query"
              aria-label="Send research query"
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
            <span>Press <kbd className="font-mono bg-stone-100 dark:bg-stone-800 px-1 py-0.2 rounded border border-stone-200 dark:border-stone-700">Enter</kbd> to execute • <kbd className="font-mono bg-stone-100 dark:bg-stone-800 px-1 py-0.2 rounded border border-stone-200 dark:border-stone-700">Shift+Enter</kbd> for newline</span>
            <span>Grounding: Strict Text Only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
