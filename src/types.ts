export interface PaperMetadata {
  title: string | null;
  authors: string[];
  year: number | null;
  venue: string | null;
}

export interface KeyFinding {
  finding: string;
  evidence_quote: string;
  location: string;
}

export interface PaperLimitation {
  limitation: string;
  stated_by_authors: boolean;
  location: string | null;
}

export interface PaperAnalysis {
  metadata: PaperMetadata;
  summary: string;
  research_problem: string;
  methodology: string;
  key_findings: KeyFinding[];
  limitations: PaperLimitation[];
  keywords: string[];
}

export interface PaperItem {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  analysis?: PaperAnalysis;
  status: 'idle' | 'uploading' | 'reading' | 'analyzing' | 'completed' | 'error';
  uploadProgress?: number;
  error?: AnalysisError;
}

export interface ComparisonDimension {
  dimension: string; // e.g., "Problem Formulation", "Core Architecture & Methodology", "Empirical Evaluation & Benchmarks", "Key Quantitative Results", "Principal Strengths", "Critical Limitations"
  values: {
    paper_id: string;
    paper_title: string;
    summary: string;
  }[];
}

export interface PaperComparison {
  title: string;
  executive_synthesis: string;
  matrix: ComparisonDimension[];
  shared_foundations: string[];
  methodological_tradeoffs: {
    tradeoff_area: string;
    analysis: string;
  }[];
  decision_guide: {
    use_case: string;
    recommended_paper: string;
    rationale: string;
  }[];
}

export type AnalysisStep = 'idle' | 'uploading' | 'reading' | 'analyzing' | 'completed' | 'error';

export interface AnalysisError {
  message: string;
  type?: 'oversized' | 'invalid_type' | 'scanned_pdf' | 'api_error' | 'malformed_json' | 'rate_limit' | 'high_demand' | 'generic';
  canRetry?: boolean;
}

// AI Research Agent Types
export type AgentMode =
  | 'general'    // Interactive Scholarly Inquirer
  | 'reviewer'   // Peer-Review & Adversarial Critique
  | 'experiment' // Ablation & Follow-up Experiment Design
  | 'technical'  // Algorithmic & Mathematical Deep-Dive
  | 'synthesis'  // Multi-Paper Gap & Conflict Analysis
  | 'factcheck'  // Verbatim Evidence & Claim Verifier
  | 'bibtex';    // Literature Review Note & BibTeX Generator

export interface AgentThoughtStep {
  step: string;
  detail: string;
}

export interface AgentCitation {
  quote: string;
  location?: string;
  paperTitle?: string;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  mode: AgentMode;
  content: string;
  thoughtSteps?: AgentThoughtStep[];
  actionsTaken?: string[];
  citations?: AgentCitation[];
  suggestedFollowups?: string[];
  timestamp: number;
  targetPaperId?: string | 'all';
}

export interface AgentResponsePayload {
  agent_role: string;
  thought_steps: AgentThoughtStep[];
  actions_taken: string[];
  response_markdown: string;
  citations: AgentCitation[];
  suggested_followups: string[];
}

