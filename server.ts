import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup secure temporary upload folder
const SECURE_TEMP_DIR = path.join(os.tmpdir(), "paperlens_secure_uploads");
if (!fs.existsSync(SECURE_TEMP_DIR)) {
  fs.mkdirSync(SECURE_TEMP_DIR, { recursive: true });
}

// Multer storage for handling large PDF files up to 100MB
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, SECURE_TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const randomSuffix = crypto.randomBytes(16).toString("hex");
    const sanitizedName = (file.originalname || "paper.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `paper_${Date.now()}_${randomSuffix}_${sanitizedName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max file size
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type: Only PDF research papers are accepted."));
    }
  },
});

// JSON body parser for legacy payloads or metadata
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Security headers middleware
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// In-Memory Rate Limiter to protect backend APIs
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

function apiRateLimiter(maxRequests = 30, windowMs = 60 * 1000) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "global";
    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", maxRequests - 1);
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        error: "Too many requests. Please wait a moment before sending another request.",
        retryAfter,
        type: "rate_limit",
        canRetry: true,
      });
    }

    record.count++;
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", maxRequests - record.count);
    next();
  };
}

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Helper to sanitize error messages so credentials/tokens are never exposed
function sanitizeErrorMessage(err: any): string {
  if (!err) return "An unexpected error occurred.";
  let msg = err.message || String(err);
  if (process.env.GEMINI_API_KEY) {
    msg = msg.replaceAll(process.env.GEMINI_API_KEY, "[REDACTED_API_KEY]");
  }
  return msg;
}

// Helper to verify PDF magic bytes (%PDF-)
function isValidPdfHeader(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  return buffer.slice(0, 5).toString("utf-8").startsWith("%PDF");
}

// Lazy initialization of GoogleGenAI on backend only
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured on the server.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    is_scanned_unreadable: {
      type: Type.BOOLEAN,
      description: "True if the PDF consists of scanned raster images or unreadable bitmap without decipherable text.",
    },
    metadata: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Full title of the paper, or null if not found",
        },
        authors: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of authors, or empty array if not found",
        },
        year: {
          type: Type.INTEGER,
          description: "Publication or preprint year (4 digits), or null if not found",
        },
        venue: {
          type: Type.STRING,
          description: "Conference, journal, or preprint archive (e.g., NeurIPS, IEEE, arXiv), or null if not found",
        },
      },
      required: ["authors"],
    },
    summary: {
      type: Type.STRING,
      description: "High-level summary of the research in maximum 120 words.",
    },
    research_problem: {
      type: Type.STRING,
      description: "The primary research problem, gap, or research question addressed.",
    },
    methodology: {
      type: Type.STRING,
      description: "The core methodology, theoretical framework, experimental design, or dataset used.",
    },
    key_findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          finding: {
            type: Type.STRING,
            description: "Clear statement of the finding or outcome.",
          },
          evidence_quote: {
            type: Type.STRING,
            description: "Verbatim quote from the paper supporting this finding, maximum 25 words.",
          },
          location: {
            type: Type.STRING,
            description: "Exact location in the paper, e.g. 'Section 4.1', 'Page 6', 'Table 2'.",
          },
        },
        required: ["finding", "evidence_quote", "location"],
      },
      description: "Key findings from the paper with verbatim quotes and locations.",
    },
    limitations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          limitation: {
            type: Type.STRING,
            description: "The limitation, threat to validity, or boundary condition.",
          },
          stated_by_authors: {
            type: Type.BOOLEAN,
            description: "True if explicitly acknowledged by authors; false if not stated by authors.",
          },
          location: {
            type: Type.STRING,
            description: "Section or page number if stated by authors, or null if not stated.",
          },
        },
        required: ["limitation", "stated_by_authors"],
      },
      description: "Identified limitations of the work.",
    },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "5 to 8 topic or discipline keywords.",
    },
  },
  required: [
    "summary",
    "research_problem",
    "methodology",
    "key_findings",
    "limitations",
    "keywords",
  ],
};

const comparisonSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Academic title synthesizing the comparative scope of the papers.",
    },
    executive_synthesis: {
      type: Type.STRING,
      description: "A 130 to 200 word high-level comparative synthesis across the papers, contextualizing their distinct objectives, philosophies, and paradigm shifts.",
    },
    matrix: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dimension: {
            type: Type.STRING,
            description: "Comparison dimension (e.g. 'Problem Formulation & Objectives', 'Architectural & Methodological Core', 'Datasets & Empirical Benchmarks', 'Key Quantitative Outcomes', 'Primary Strengths & Advantages', 'Critical Limitations & Bottlenecks')",
          },
          values: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                paper_id: { type: Type.STRING },
                paper_title: { type: Type.STRING },
                summary: { type: Type.STRING, description: "Grounded, precise comparative assessment of this paper on this dimension." },
              },
              required: ["paper_id", "paper_title", "summary"],
            },
          },
        },
        required: ["dimension", "values"],
      },
      description: "Comprehensive side-by-side comparison matrix covering all analyzed papers.",
    },
    shared_foundations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 to 5 commonalities, shared assumptions, or converging insights across the papers.",
    },
    methodological_tradeoffs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tradeoff_area: { type: Type.STRING, description: "Core point of divergence or trade-off, e.g. 'Computational Complexity vs Pre-training Efficiency' or 'Memory Hierarchy IO vs Model Expressivity'" },
          analysis: { type: Type.STRING, description: "Detailed comparative evaluation explaining how the papers choose different trade-offs." },
        },
        required: ["tradeoff_area", "analysis"],
      },
      description: "Key methodological divergences and trade-offs.",
    },
    decision_guide: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          use_case: { type: Type.STRING, description: "Specific research or deployment scenario, e.g. 'Resource-constrained training', 'Deep contextual representation', 'Long-sequence inference'" },
          recommended_paper: { type: Type.STRING, description: "The paper or technique best suited for this use case." },
          rationale: { type: Type.STRING, description: "Academic rationale grounding why this paper is recommended for this scenario." },
        },
        required: ["use_case", "recommended_paper", "rationale"],
      },
      description: "Practical decision guide for researchers selecting between approaches.",
    },
  },
  required: [
    "title",
    "executive_synthesis",
    "matrix",
    "shared_foundations",
    "methodological_tradeoffs",
    "decision_guide",
  ],
};

const SYSTEM_INSTRUCTION = `You are PaperLens, an academic research paper analysis assistant designed for graduate students and early-career researchers.
Analyze the provided research paper PDF directly.

GROUNDING RULES:
- Use only information in the PDF. Never use outside knowledge.
- Every key finding must include a verbatim quote (maximum 25 words) and its exact location (e.g. section number or page number).
- If a field is not in the paper, return null or an empty array. Never guess or hallucinate.
- Mark limitations the authors did not state as stated_by_authors: false. If stated by authors, provide the location; otherwise location must be null.
- If the PDF has no readable text (e.g., pure scanned image without text layer), set is_scanned_unreadable to true.
- Tone: neutral, concise, plain academic English. No hype or marketing language.
- Summary must be at most 120 words.
- Keywords must contain between 5 and 8 items.`;

const COMPARISON_SYSTEM_INSTRUCTION = `You are PaperLens Comparative Synthesizer, an academic literature review assistant for researchers.
You will be provided with structured extractions and details from multiple peer-reviewed research papers.
Your task is to produce a rigorous, grounded, side-by-side comparative analysis.

COMPARISON GUIDELINES:
- Ground every statement strictly in the provided paper analyses.
- Formulate a clean, multidimensional matrix assessing each paper across:
  1. Problem Formulation & Scope
  2. Architecture & Methodological Core
  3. Evaluation & Datasets
  4. Key Quantitative Outcomes
  5. Primary Strengths
  6. Critical Limitations
- Highlight real methodological trade-offs (e.g., computational speed vs parameter footprint, generality vs domain specialization).
- In the decision guide, provide nuanced recommendations for specific research scenarios.
- Keep tone objective, analytical, and scholarly.`;

const agentResponseSchema = {
  type: Type.OBJECT,
  properties: {
    agent_role: {
      type: Type.STRING,
      description: "Academic specialist role assumed (e.g. 'Senior Peer Reviewer', 'Empirical ML Architect', 'Literature Synthesis Scholar')",
    },
    thought_steps: {
      type: Type.ARRAY,
      description: "Step-by-step reasoning and investigative phases followed by the agent to answer the prompt.",
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.STRING, description: "Title of reasoning phase, e.g. '1. Baseline & Dataset Scrutiny'" },
          detail: { type: Type.STRING, description: "Specific evidence inspected or logical deduction made" },
        },
        required: ["step", "detail"],
      },
    },
    actions_taken: {
      type: Type.ARRAY,
      description: "Tools or analytical actions executed by the agent (e.g. ['cross_reference_tables', 'evaluate_author_limitations', 'inspect_bleu_significance'])",
      items: { type: Type.STRING },
    },
    response_markdown: {
      type: Type.STRING,
      description: "Detailed, scholarly, high-rigor markdown response answering the prompt with equations, tables, code blocks, or structured critique.",
    },
    citations: {
      type: Type.ARRAY,
      description: "Direct verbatim quotes or section citations extracted from papers to substantiate findings.",
      items: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING, description: "Direct verbatim sentence or phrase from paper" },
          location: { type: Type.STRING, description: "Section, page, or table location" },
          paperTitle: { type: Type.STRING, description: "Title of the cited paper" },
        },
        required: ["quote"],
      },
    },
    suggested_followups: {
      type: Type.ARRAY,
      description: "3 highly insightful follow-up research questions or experiment proposals the user could ask next.",
      items: { type: Type.STRING },
    },
  },
  required: [
    "agent_role",
    "thought_steps",
    "actions_taken",
    "response_markdown",
    "citations",
    "suggested_followups",
  ],
};

const AGENT_SYSTEM_INSTRUCTION = `You are PaperLens AI Research Agent, an autonomous, world-class academic research copilot, peer reviewer, and computational scientist.
You assist university professors, PhD researchers, and graduate students in deeply scrutinizing, evaluating, fact-checking, and extending academic research papers.

GUIDELINES FOR AGENT MODES:
1. 'reviewer' (Peer-Review & Adversarial Critique):
   - Act as an elite Area Chair or Reviewer at top venues (NeurIPS, ICML, ACL, Nature, IEEE).
   - Scrutinize methodological soundness, baseline fairness, ablation thoroughness, statistical significance, and threats to internal/external validity.
   - Separate author-acknowledged limitations from unstated failure modes or computational bottlenecks.

2. 'experiment' (Ablation & Follow-up Experiment Design):
   - Propose 2-3 precise, testable hypotheses directly addressing the papers' gaps or limitations.
   - Detail experimental controls, baseline comparisons, evaluation metrics, and expected outcomes.
   - Outline compute requirements and potential risks.

3. 'technical' (Algorithmic & Mathematical Deep Dive):
   - Break down mathematical formulations (e.g., attention complexity O(N^2), gradients, loss functions).
   - Provide concrete pseudocode, algorithmic walkthroughs, and architectural bottlenecks.

4. 'synthesis' (Multi-Paper Gap & Conflict Analysis):
   - Compare multiple papers in the workbench. Identify points of consensus, conflicting findings, and trade-offs.
   - Highlight where one paper's technique could solve another paper's limitation.

5. 'factcheck' (Verbatim Evidence & Claim Verifier):
   - Verify user inquiries against verbatim quotes in the papers.
   - Clearly state whether a claim is: [DIRECTLY SUPPORTED WITH QUOTE], [PLAUSIBLY INFERRED], or [UNSUPPORTED / ABSENT].

6. 'bibtex' (Literature Review & Citation Generator):
   - Generate standard, clean BibTeX citation entries for the papers.
   - Provide a publication-ready literature review paragraph synthesizing the papers in academic prose with citations.

7. 'general' (Interactive Scholarly Inquirer):
   - Respond thoroughly, scholarly, and objectively to any query regarding the papers.

ALWAYS:
- Formulate 3-5 distinct 'thought_steps' explaining your analytical reasoning trail.
- List simulated 'actions_taken' reflecting what evidence was parsed.
- Include verbatim evidence quotes in 'citations' whenever referencing specific numbers or author statements.
- Propose 3 proactive, actionable 'suggested_followups' to spur further research.`;

// Helper to generate content with model fallback and intelligent rate-limit / high-demand handling
async function generateContentWithFallback(
  ai: any,
  params: {
    contents: any[];
    systemInstruction?: string;
    responseSchema?: any;
    responseMimeType?: string;
  }
): Promise<string> {
  // Ordered by verified live availability, resistance to 503 traffic spikes, and independent quota tiers
  const candidateModels = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
  ];
  let lastErr: any = null;

  for (const model of candidateModels) {
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            responseMimeType: params.responseMimeType || "application/json",
            responseSchema: params.responseSchema,
          },
        });
        const text = response.text;
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      } catch (err: any) {
        lastErr = err;
        const errMsg = err?.message || String(err);
        const status = err?.status;
        const isUnavailableOrThrottled =
          status === 429 ||
          status === 503 ||
          errMsg.includes("429") ||
          errMsg.includes("503") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("Quota exceeded") ||
          errMsg.includes("quota");

        console.warn(`[PaperLens] Model ${model} attempt ${attempt} warning:`, errMsg);

        if (isUnavailableOrThrottled) {
          // If this specific model has hit a 503 high demand spike or 429 quota exhaustion,
          // immediately failover to the next candidate model in the pool.
          console.log(`[PaperLens] Model ${model} is throttled or experiencing high demand (${status || "503/429"}), transitioning to next candidate model...`);
          break;
        }

        // For non-throttled transient network blips, wait briefly before retrying
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  }

  throw lastErr || new Error("Failed to generate content from Gemini models.");
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "PaperLens",
    maxFileSizeBytes: 100 * 1024 * 1024,
    features: {
      backendSecurity: true,
      largeFileSupport: true,
      multiPaperComparison: true,
      aiResearchAgent: true,
    },
  });
});

// Multipart file upload and analysis endpoint (supports large files up to 100MB)
app.post("/api/upload-and-analyze", apiRateLimiter(30), upload.any(), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const file = req.file || files.find((f) => f.fieldname === "file" || f.fieldname === "pdf") || files[0];
  let geminiUploadedFileName: string | null = null;

  if (!file) {
    return res.status(400).json({
      error: "No file received. Please upload a valid PDF research paper.",
      canRetry: true,
    });
  }

  const filePath = file.path;

  try {
    // Validate PDF magic bytes
    const headerBuffer = Buffer.alloc(10);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, headerBuffer, 0, 10, 0);
    fs.closeSync(fd);

    if (!isValidPdfHeader(headerBuffer)) {
      return res.status(400).json({
        error: "Invalid file format: The uploaded file does not have a valid PDF header (%PDF-).",
        type: "invalid_type",
        canRetry: false,
      });
    }

    const ai = getGeminiClient();
    const fileName = req.body.fileName || file.originalname || "uploaded_paper.pdf";
    const fileSize = file.size;

    console.log(`[PaperLens] Processing uploaded paper: ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);

    // Use Gemini Files API for reliable handling of large PDFs up to 100MB+
    const uploadResult = await ai.files.upload({
      file: filePath,
      config: {
        mimeType: "application/pdf",
      },
    });
    geminiUploadedFileName = uploadResult.name || null;

    const responseText = await generateContentWithFallback(ai, {
      contents: [
        {
          fileData: {
            fileUri: uploadResult.uri,
            mimeType: uploadResult.mimeType || "application/pdf",
          },
        },
        {
          text: `Analyze this research paper titled or identified as "${fileName}".
Extract the metadata, summary (<= 120 words), research problem, methodology, key findings with verbatim quotes and locations, limitations with author attribution, and 5-8 keywords according to the response schema.`,
        },
      ],
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    });

    const resultData = JSON.parse(responseText);

    if (resultData.is_scanned_unreadable) {
      return res.status(422).json({
        error: "This PDF appears to be a scanned document or image without a machine-readable text layer. Selectable text is required.",
        type: "scanned_pdf",
      });
    }

    res.json(resultData);
  } catch (error: any) {
    console.error("[PaperLens] Upload and analyze error:", error);
    const sanitized = sanitizeErrorMessage(error);
    const isRateLimit =
      sanitized.includes("429") ||
      sanitized.includes("RESOURCE_EXHAUSTED") ||
      sanitized.includes("quota");
    const isHighDemand =
      sanitized.includes("503") ||
      sanitized.includes("UNAVAILABLE") ||
      sanitized.includes("high demand");

    if (isRateLimit) {
      return res.status(429).json({
        error: "Gemini API rate limit reached. Please wait a moment before retrying.",
        type: "rate_limit",
        canRetry: true,
      });
    }

    if (isHighDemand) {
      return res.status(503).json({
        error: "Gemini models are temporarily experiencing high demand. Please try again in a few moments.",
        type: "high_demand",
        canRetry: true,
      });
    }

    res.status(500).json({
      error: sanitized,
      canRetry: true,
    });
  } finally {
    // Delete local temporary disk file securely
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.error("[PaperLens] Failed to unlink temp file:", cleanupErr);
      }
    }

    // Clean up Gemini cloud file asynchronously
    if (geminiUploadedFileName) {
      const fileNameToDelete = geminiUploadedFileName;
      try {
        const ai = getGeminiClient();
        ai.files.delete({ name: fileNameToDelete }).catch((delErr) => {
          console.warn("[PaperLens] Could not delete cloud file:", delErr?.message);
        });
      } catch {
        // Ignore cleanup client creation errors
      }
    }
  }
});

// JSON endpoint for base64 uploads (backwards compatibility)
app.post("/api/analyze", apiRateLimiter(25), async (req, res) => {
  try {
    const { pdfBase64, fileName, mimeType = "application/pdf" } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({
        error: "Missing PDF file data. Please upload a research paper PDF.",
      });
    }

    const ai = getGeminiClient();
    const cleanedBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, "");

    // Verify PDF header in base64
    const sampleBuffer = Buffer.from(cleanedBase64.slice(0, 30), "base64");
    if (!isValidPdfHeader(sampleBuffer)) {
      return res.status(400).json({
        error: "Invalid file format: Data does not represent a valid PDF (%PDF- header missing).",
        type: "invalid_type",
      });
    }

    const responseText = await generateContentWithFallback(ai, {
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "application/pdf",
            data: cleanedBase64,
          },
        },
        {
          text: `Analyze this research paper titled or identified as "${fileName || "uploaded paper"}".
Extract the metadata, summary (<= 120 words), research problem, methodology, key findings with verbatim quotes and locations, limitations with author attribution, and 5-8 keywords according to the response schema.`,
        },
      ],
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    });

    const resultData = JSON.parse(responseText.trim());

    if (!resultData) {
      return res.status(500).json({
        error: "Failed to generate structured paper analysis.",
        canRetry: true,
      });
    }

    if (resultData.is_scanned_unreadable) {
      return res.status(422).json({
        error: "This PDF appears to be a scanned document or image without a machine-readable text layer.",
        type: "scanned_pdf",
      });
    }

    res.json(resultData);
  } catch (error: any) {
    console.error("[PaperLens] Analysis error:", error);
    const sanitized = sanitizeErrorMessage(error);
    const isRateLimit =
      sanitized.includes("429") ||
      sanitized.includes("RESOURCE_EXHAUSTED") ||
      sanitized.includes("quota");
    const isHighDemand =
      sanitized.includes("503") ||
      sanitized.includes("UNAVAILABLE") ||
      sanitized.includes("high demand");

    if (isRateLimit) {
      return res.status(429).json({
        error: "Gemini API rate limit reached. Please wait a moment before retrying.",
        type: "rate_limit",
        canRetry: true,
      });
    }

    if (isHighDemand) {
      return res.status(503).json({
        error: "Gemini models are temporarily experiencing high demand. Please try again in a few moments.",
        type: "high_demand",
        canRetry: true,
      });
    }

    res.status(500).json({
      error: sanitized,
      canRetry: true,
    });
  }
});

// Multi-Paper Comparison Endpoint
app.post("/api/compare", apiRateLimiter(20), async (req, res) => {
  try {
    const { papers } = req.body;

    if (!Array.isArray(papers) || papers.length < 2) {
      return res.status(400).json({
        error: "Comparison requires at least 2 analyzed research papers.",
      });
    }

    if (papers.length > 8) {
      return res.status(400).json({
        error: "A maximum of 8 papers can be compared simultaneously.",
      });
    }

    const ai = getGeminiClient();

    // Prepare structured comparison input for Gemini
    const papersContext = papers.map((p, idx) => {
      const meta = p.metadata || p.analysis?.metadata || {};
      const title = meta.title || p.title || p.fileName || `Paper ${idx + 1}`;
      const authors = Array.isArray(meta.authors)
        ? meta.authors.join(", ")
        : Array.isArray(p.analysis?.metadata?.authors)
        ? p.analysis.metadata.authors.join(", ")
        : "Unknown";
      const year = meta.year || p.analysis?.metadata?.year || "Unknown";
      const venue = meta.venue || p.analysis?.metadata?.venue || "Unknown";
      const summary = p.summary || p.analysis?.summary || "N/A";
      const research_problem = p.research_problem || p.analysis?.research_problem || "N/A";
      const methodology = p.methodology || p.analysis?.methodology || "N/A";
      const key_findings = p.key_findings || p.analysis?.key_findings || [];
      const limitations = p.limitations || p.analysis?.limitations || [];
      const keywords = p.keywords || p.analysis?.keywords || [];

      return `PAPER ${idx + 1}:
ID: ${p.id || `paper_${idx + 1}`}
Title: ${title}
Authors: ${authors}
Year: ${year}
Venue: ${venue}
Summary: ${summary}
Research Problem: ${research_problem}
Methodology: ${methodology}
Key Findings:
${key_findings.map((f: any, fIdx: number) => `  - Finding ${fIdx + 1}: ${f.finding} (Quote: "${f.evidence_quote}" at ${f.location})`).join("\n")}
Limitations:
${limitations.map((l: any) => `  - ${l.limitation} (${l.stated_by_authors ? `Stated by authors at ${l.location}` : "Inferred"})`).join("\n")}
Keywords: ${Array.isArray(keywords) ? keywords.join(", ") : "None"}`;
    }).join("\n\n---\n\n");

    const prompt = `Synthesize a rigorous academic comparison of the following ${papers.length} research papers:

${papersContext}

Follow the response schema to produce:
1. A concise academic comparison title.
2. A dense, scholarly executive comparative synthesis (130-200 words).
3. A multi-dimensional comparison matrix evaluating every paper across:
   - "Problem Formulation & Objectives"
   - "Architectural & Methodological Core"
   - "Datasets & Empirical Benchmarks"
   - "Key Quantitative Outcomes"
   - "Primary Strengths & Advantages"
   - "Critical Limitations & Bottlenecks"
4. 3 to 5 commonalities or shared foundational assumptions.
5. Key methodological divergences and trade-offs.
6. A scenario-based decision guide recommending which paper/method is optimal for specific practical or research conditions.`;

    const responseText = await generateContentWithFallback(ai, {
      contents: [{ text: prompt }],
      systemInstruction: COMPARISON_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: comparisonSchema,
    });

    const comparisonData = JSON.parse(responseText.trim());
    res.json(comparisonData);
  } catch (error: any) {
    console.error("[PaperLens] Comparison error:", error);
    const sanitized = sanitizeErrorMessage(error);
    const isRateLimit =
      sanitized.includes("429") ||
      sanitized.includes("RESOURCE_EXHAUSTED") ||
      sanitized.includes("quota");
    const isHighDemand =
      sanitized.includes("503") ||
      sanitized.includes("UNAVAILABLE") ||
      sanitized.includes("high demand");

    if (isRateLimit) {
      return res.status(429).json({
        error: "Gemini API rate limit reached. Please wait a moment before retrying comparison.",
        type: "rate_limit",
        canRetry: true,
      });
    }

    if (isHighDemand) {
      return res.status(503).json({
        error: "Gemini models are temporarily experiencing high demand. Please try again in a few moments.",
        type: "high_demand",
        canRetry: true,
      });
    }

    res.status(500).json({
      error: sanitized,
      canRetry: true,
    });
  }
});

// AI Research Agent reasoning and execution endpoint
app.post("/api/agent", apiRateLimiter(40), async (req, res) => {
  const { message, mode = "general", activePaperId, papers = [], comparison, history = [] } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({
      error: "A valid inquiry or prompt is required for the AI Research Agent.",
      canRetry: true,
    });
  }

  let ai;
  try {
    ai = getGeminiClient();
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || "Gemini API client not initialized. GEMINI_API_KEY required.",
      canRetry: false,
    });
  }

  try {
    // Format structured papers context
    const papersContext = (papers || []).map((p: any, idx: number) => {
      const meta = p.metadata || p.analysis?.metadata || {};
      const title = meta.title || p.title || p.fileName || `Paper ${idx + 1}`;
      const authors = Array.isArray(meta.authors)
        ? meta.authors.join(", ")
        : Array.isArray(p.analysis?.metadata?.authors)
        ? p.analysis.metadata.authors.join(", ")
        : "Unknown";
      const year = meta.year || p.analysis?.metadata?.year || "Unknown";
      const venue = meta.venue || p.analysis?.metadata?.venue || "Unknown";
      const summary = p.summary || p.analysis?.summary || "N/A";
      const research_problem = p.research_problem || p.analysis?.research_problem || "N/A";
      const methodology = p.methodology || p.analysis?.methodology || "N/A";
      const key_findings = p.key_findings || p.analysis?.key_findings || [];
      const limitations = p.limitations || p.analysis?.limitations || [];
      const keywords = p.keywords || p.analysis?.keywords || [];
      const isTarget = activePaperId && (p.id === activePaperId || p.fileName === activePaperId);

      return `PAPER ${idx + 1}${isTarget ? " [CURRENT FOCUS PAPER]" : ""}:
ID: ${p.id || `paper_${idx + 1}`}
Title: ${title}
Authors: ${authors}
Year: ${year}
Venue: ${venue}
Summary: ${summary}
Research Problem: ${research_problem}
Methodology: ${methodology}
Key Findings & Verbatim Quotes:
${key_findings.map((f: any, fIdx: number) => `  - Finding ${fIdx + 1}: ${f.finding} (Quote: "${f.evidence_quote}" at ${f.location})`).join("\n")}
Limitations:
${limitations.map((l: any) => `  - ${l.limitation} (${l.stated_by_authors ? `Stated by authors at ${l.location}` : "Inferred by analysis"})`).join("\n")}
Keywords: ${Array.isArray(keywords) ? keywords.join(", ") : "None"}`;
    }).join("\n\n---\n\n");

    let comparisonContext = "";
    if (comparison && comparison.matrix) {
      comparisonContext = `\n\nEXISTING COMPARATIVE SYNTHESIS:\nTitle: ${comparison.title || "Multi-Paper Matrix"}\nExecutive Summary: ${comparison.executive_synthesis || ""}\nMatrix Dimensions: ${comparison.matrix.map((m: any) => m.dimension).join(", ")}`;
    }

    const conversationHistory = (history || [])
      .slice(-6)
      .map((h: any) => `${h.role === "user" ? "USER" : "SCHOLAR_AGENT"}: ${h.content}`)
      .join("\n");

    const prompt = `AVAILABLE PAPERS IN REPOSITORY (${papers.length} papers loaded):
${papersContext || "No papers currently uploaded. Address general academic questions."}
${comparisonContext}

${conversationHistory ? `RECENT CONVERSATION HISTORY:\n${conversationHistory}\n` : ""}

ACTIVE AGENT MODE: '${mode}'
FOCUS PAPER ID: ${activePaperId || "All papers in workbench"}
USER RESEARCH QUERY / TASK:
"${message.trim()}"

Execute your agentic workflow:
1. Provide 3-5 structured 'thought_steps' explaining your reasoning process, hypotheses checked, and evidence parsed.
2. List 'actions_taken' detailing analytical operations performed.
3. Deliver a rigorous, publication-grade, well-organized 'response_markdown' with clear academic prose, markdown formatting, equations/tables if relevant, and verbatim quotes.
4. Extract exact 'citations' with quote, location, and paperTitle.
5. Suggest 3 proactive 'suggested_followups' that advance the research discussion.`;

    const responseText = await generateContentWithFallback(ai, {
      contents: [{ text: prompt }],
      systemInstruction: AGENT_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: agentResponseSchema,
    });

    const agentData = JSON.parse(responseText.trim());
    res.json(agentData);
  } catch (error: any) {
    console.error("[PaperLens] AI Agent error:", error);
    const sanitized = sanitizeErrorMessage(error);
    const isRateLimit =
      sanitized.includes("429") ||
      sanitized.includes("RESOURCE_EXHAUSTED") ||
      sanitized.includes("quota");
    const isHighDemand =
      sanitized.includes("503") ||
      sanitized.includes("UNAVAILABLE") ||
      sanitized.includes("high demand");

    if (isRateLimit) {
      return res.status(429).json({
        error: "Gemini API rate limit reached. Please wait a few moments before retrying agent query.",
        type: "rate_limit",
        canRetry: true,
      });
    }

    if (isHighDemand) {
      return res.status(503).json({
        error: "Gemini models are temporarily experiencing high demand. Please try again in a few moments.",
        type: "high_demand",
        canRetry: true,
      });
    }

    res.status(500).json({
      error: sanitized,
      canRetry: true,
    });
  }
});

// Vite middleware / production serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PaperLens server running on http://localhost:${PORT}`);
  });
}

start();
