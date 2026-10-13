/**
 * Generates valid academic research paper PDFs in raw PDF-1.4 format
 * containing genuine text streams, sections, findings, and citations
 * so users can test PaperLens single-paper analysis and multi-paper comparison instantly.
 */

export interface SamplePaperOption {
  id: string;
  title: string;
  authors: string;
  year: number;
  venue: string;
  fileName: string;
  description: string;
}

export const SAMPLE_PAPERS_LIST: SamplePaperOption[] = [
  {
    id: "transformer",
    title: "Attention Is All You Need",
    authors: "Vaswani et al.",
    year: 2017,
    venue: "NeurIPS 2017",
    fileName: "Vaswani_et_al_Attention_Is_All_You_Need.pdf",
    description: "The foundational self-attention architecture dispensing with recurrence and convolution entirely.",
  },
  {
    id: "bert",
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    authors: "Devlin, Chang, Lee, Toutanova",
    year: 2019,
    venue: "NAACL 2019",
    fileName: "Devlin_et_al_BERT_Language_Understanding.pdf",
    description: "Bidirectional transformer pre-training using masked language modeling and next sentence prediction.",
  },
  {
    id: "flashattention",
    title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
    authors: "Dao, Fu, Ermon, Rudra, Re",
    year: 2022,
    venue: "NeurIPS 2022",
    fileName: "Dao_et_al_FlashAttention_Exact_IO_Aware.pdf",
    description: "IO-aware exact attention algorithm leveraging GPU SRAM/HBM memory hierarchy via tiling and recomputation.",
  },
];

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function createPageContent(lines: string[]): string {
  let stream = "BT\n/F1 10 Tf\n14 TL\n50 750 Td\n";
  for (const line of lines) {
    if (line.startsWith("Title:") || line.startsWith("PaperLens Benchmark:")) {
      stream += `/F2 14 Tf\n(${escapePdfText(line)}) Tj\n/F1 10 Tf\nT*\nT*\n`;
    } else if (
      line.startsWith("Abstract") ||
      line.startsWith("1. ") ||
      line.startsWith("2. ") ||
      line.startsWith("3. ") ||
      line.startsWith("4. ") ||
      line.startsWith("5. ")
    ) {
      stream += `T*\n/F2 12 Tf\n(${escapePdfText(line)}) Tj\n/F1 10 Tf\nT*\n`;
    } else {
      stream += `(${escapePdfText(line)}) Tj\nT*\n`;
    }
  }
  stream += "ET";
  return stream;
}

function buildPdfFromPages(page1Lines: string[], page2Lines: string[]): { base64: string; sizeBytes: number } {
  const stream1 = createPageContent(page1Lines);
  const stream2 = createPageContent(page2Lines);

  const pdfBody = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 7 0 R /F2 8 0 R >> >> >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R /F2 8 0 R >> >> >>
endobj
5 0 obj
<< /Length ${stream1.length} >>
stream
${stream1}
endstream
endobj
6 0 obj
<< /Length ${stream2.length} >>
stream
${stream2}
endstream
endobj
7 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
8 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
xref
0 9
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000234 00000 n 
0000000353 00000 n 
0000000450 00000 n 
0000000550 00000 n 
0000000624 00000 n 
trailer
<< /Size 9 /Root 1 0 R >>
startxref
700
%%EOF`;

  const bytes = new TextEncoder().encode(pdfBody);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return { base64, sizeBytes: bytes.byteLength };
}

export function createSampleResearchPdf(paperId = "transformer"): {
  base64: string;
  fileName: string;
  sizeBytes: number;
} {
  if (paperId === "bert") {
    const page1 = [
      "Title: BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
      "Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova",
      "Google AI Language - Published at NAACL-HLT 2019",
      "",
      "Abstract",
      "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder",
      "Representations from Transformers. Unlike recent language representation models, BERT is designed to",
      "pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left",
      "and right context in all layers. As a result, the pre-trained BERT model can be fine-tuned with just one",
      "additional output layer to create state-of-the-art models for a wide range of tasks.",
      "",
      "1. Introduction",
      "Language model pre-training has been shown to be effective for improving many natural language",
      "processing tasks. There are two existing strategies for applying pre-trained language representations",
      "to downstream tasks: feature-based and fine-tuning. However, standard language models are unidirectional,",
      "severely limiting the choice of architectures during pre-training. We alleviate the unidirectionality",
      "constraint by using a 'masked language model' (MLM) pre-training objective.",
      "",
      "2. Methodology and Architecture",
      "BERT's model architecture is a multi-layer bidirectional Transformer encoder based on the original",
      "implementation described in Vaswani et al. (2017). We use two model sizes: BERT_BASE (L=12, H=768,",
      "A=12, Total Parameters=110M) and BERT_LARGE (L=24, H=1024, A=16, Total Parameters=340M). We pre-train",
      "BERT using two unsupervised tasks: Masked LM (where 15% of the input tokens are masked at random) and",
      "Next Sentence Prediction (NSP), which trains the model to understand sentence relationships.",
    ];

    const page2 = [
      "3. Key Findings and Benchmark Results",
      "BERT advances the state of the art for eleven natural language processing tasks. On the GLUE benchmark,",
      "BERT_LARGE achieves a score of 80.5%, representing a 7.7% absolute improvement over the previous best",
      "system OpenAI GPT. On SQuAD v1.1, BERT achieves 93.2 F1 score, outperforming human performance (91.2).",
      "Table 1 shows that BERT_LARGE achieves 86.8% accuracy on MultiNLI, beating previous systems by 4.6%.",
      "",
      "4. Limitations and Discussion",
      "Despite its empirical success, BERT has noteworthy limitations stated by the authors. In Section 5.3,",
      "we note that the pre-training task suffers from a mismatch with fine-tuning because the [MASK] token",
      "never appears during fine-tuning. Furthermore, because BERT processes full sequences bidirectionally with",
      "a fixed maximum sequence length of 512 tokens, it cannot directly handle long documents without chunking.",
      "Additionally, pre-training BERT_LARGE required 64 TPU chips for 4 days, creating steep resource barriers.",
      "",
      "5. Conclusion",
      "BERT demonstrates the importance of bidirectional pre-training for language representations, providing",
      "a single pre-trained architecture that generalizes across diverse language understanding tasks.",
    ];

    const { base64, sizeBytes } = buildPdfFromPages(page1, page2);
    return {
      base64,
      fileName: "Devlin_et_al_BERT_Language_Understanding.pdf",
      sizeBytes,
    };
  }

  if (paperId === "flashattention") {
    const page1 = [
      "Title: FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
      "Tri Dao, Daniel Y. Fu, Stefano Ermon, Atri Rudra, Christopher Re",
      "Stanford University - Published at NeurIPS 2022",
      "",
      "Abstract",
      "Transformers are slow and memory-hungry on long sequences, since the time and memory complexity of",
      "self-attention is quadratic in sequence length. We propose FlashAttention, an IO-aware exact attention",
      "algorithm that uses tiling to reduce the number of memory reads/writes between GPU high bandwidth",
      "memory (HBM) and GPU on-chip SRAM. We analyze the IO complexity of FlashAttention, proving that it",
      "requires fewer HBM accesses than standard attention and is asymptotically optimal.",
      "",
      "1. Introduction",
      "Scaling Transformers to longer sequences is critical for language, vision, and genomics. Existing",
      "approximate attention methods trade off model quality to reduce compute complexity, but often fail",
      "to achieve wall-clock speedup because they do not account for IO operations between memory tiers.",
      "Compute is no longer the sole bottleneck on modern GPUs; memory bandwidth is the primary limiter.",
      "",
      "2. Methodology and IO-Aware Design",
      "Standard attention materializes the full N x N attention matrix in GPU HBM. FlashAttention computes",
      "exact attention by tiling the input matrices Q, K, V into blocks that fit entirely within fast SRAM.",
      "To compute softmax incrementally without materializing the full row, we employ online softmax scaling,",
      "storing only normalization statistics. In the backward pass, we recompute attention on the fly from",
      "stored blocks rather than caching large intermediate activation matrices.",
    ];

    const page2 = [
      "3. Key Findings and Benchmark Results",
      "FlashAttention yields a 2-4x wall-clock speedup compared to standard attention and 10-20x speedup for",
      "longer sequences up to 64K tokens, while achieving exact attention with zero approximation error.",
      "As shown in Table 2, FlashAttention trains GPT-2 (1.5B parameters) 3x faster than Megatron-LM on A100 GPUs.",
      "On the Long Range Arena (LRA) benchmark, FlashAttention is 2.4x faster than standard Transformer and",
      "outperforms all approximate attention baselines in both speed and classification accuracy.",
      "",
      "4. Limitations and Discussion",
      "The authors acknowledge several explicit limitations in Section 6. First, FlashAttention requires",
      "low-level CUDA kernel implementations finely tuned for specific GPU architectures (SRAM size and",
      "warp scheduling), limiting portability across hardware. Second, while IO complexity is reduced from",
      "O(N^2) to O(N^2 / SRAM), the arithmetic FLOP count remains quadratic O(N^2 * d). Third, for very",
      "short sequence lengths (e.g. N < 128), standard attention implementations in cuBLAS remain competitive.",
      "",
      "5. Conclusion",
      "FlashAttention demonstrates that considering the GPU memory hierarchy is essential for deep learning",
      "performance, yielding fast and exact attention for modern Transformer workloads.",
    ];

    const { base64, sizeBytes } = buildPdfFromPages(page1, page2);
    return {
      base64,
      fileName: "Dao_et_al_FlashAttention_Exact_IO_Aware.pdf",
      sizeBytes,
    };
  }

  // Default: Vaswani et al.
  const page1 = [
    "Title: Attention Is All You Need",
    "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez",
    "Google Brain and Google Research - Published at NeurIPS 2017",
    "",
    "Abstract",
    "The dominant sequence transduction models are based on complex recurrent or convolutional neural",
    "networks that include an encoder and a decoder. The best performing models also connect the encoder",
    "and decoder through an attention mechanism. We propose a new simple network architecture, the",
    "Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions",
    "entirely. Experiments on two machine translation tasks show these models to be superior in quality",
    "while being more parallelizable and requiring significantly less time to train.",
    "",
    "1. Introduction",
    "Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular,",
    "have been firmly established as state of the art approaches in sequence modeling and transduction",
    "problems. Recurrent models typically factor computation along the symbol positions of the input and",
    "output sequences. This inherent sequential nature precludes parallelization within training examples,",
    "which becomes critical at longer sequence lengths.",
    "",
    "2. Methodology and Model Architecture",
    "The Transformer follows an encoder-decoder structure using stacked self-attention and point-wise,",
    "fully connected layers for both the encoder and decoder. The encoder is composed of a stack of N = 6",
    "identical layers. Each layer has two sub-layers: a multi-head self-attention mechanism, and a simple,",
    "position-wise fully connected feed-forward network. We employ residual connections around each of the",
    "two sub-layers, followed by layer normalization. Attention is computed as Scaled Dot-Product Attention:",
    "Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V.",
  ];

  const page2 = [
    "3. Key Empirical Findings and Results",
    "On the WMT 2014 English-to-German translation task, the big transformer model outperforms the best",
    "previously reported models (including ensembles) by more than 2.0 BLEU, establishing a new state of",
    "the art BLEU score of 28.4 on the test set. On the WMT 2014 English-to-French translation task, our",
    "big model achieves a BLEU score of 41.8, outperforming all previously published single models at",
    "less than 1/4 the training cost of the previous state-of-the-art models.",
    "",
    "Table 2 shows the results on English-to-German. The Transformer (base model) achieves 27.3 BLEU with",
    "a training cost of 3.3 x 10^18 FLOPs, representing an order of magnitude reduction in training cost.",
    "",
    "4. Limitations and Discussion",
    "While the Transformer offers unprecedented computational efficiency and translation quality, several",
    "inherent limitations remain. First, as noted in Section 6, the self-attention mechanism exhibits",
    "quadratic computational complexity O(n^2) with respect to input sequence length n, which constrains",
    "its direct application to ultra-long context sequences without memory partitioning. Second, because",
    "the model contains no recurrence and no convolution, it relies entirely on positional encodings to inject",
    "order information into the sequence, which may struggle with generalizing to sequence lengths strictly",
    "longer than those encountered during training.",
    "",
    "5. Conclusion",
    "In this work, we presented the Transformer, the first sequence transduction model based entirely on",
    "attention. It trains significantly faster than architectures based on recurrent or convolutional layers.",
  ];

  const { base64, sizeBytes } = buildPdfFromPages(page1, page2);
  return {
    base64,
    fileName: "Vaswani_et_al_Attention_Is_All_You_Need.pdf",
    sizeBytes,
  };
}
