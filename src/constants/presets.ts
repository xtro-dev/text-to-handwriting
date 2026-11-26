import type { AppSettings, HandwritingPreset } from '../types/handwriting';

export function getTodayFormatted(): string {
  try {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Nov 25, 2026';
  }
}

export const DEFAULT_TEXT = `The quiet discipline of writing by hand forces your thoughts to move at the speed of ink rather than the speed of keys.

When you slow down to form each word, ideas settle differently. Connections appear between sentences that typed drafts tend to gloss over. A ruled notebook page does not ask for formatting bars or notifications — only a steady margin, decent ink, and room to think.

Key advantages of handwritten notes:
1. Stronger recall when summarizing concepts in your own words.
2. Clearer visual hierarchy through spacing, indentation, and rhythm.
3. Zero distractions between your mind and the page.

Try editing this text, switching paper styles on the right, or adjusting pen thickness, character variation, and baseline drift to craft your own natural handwriting look.`;

export const DEFAULT_SETTINGS: AppSettings = {
  handwriting: {
    fontId: 'kalam',
    fontSize: 20,
    inkColor: '#1d3c8e',
    penThickness: 1.0,
    letterSpacing: 0.2,
    wordSpacing: 1.5,
    lineSpacing: 32,
    snapToPaperLines: true,
    characterVariation: 0.45,
    baselineVariation: 0.42,
    inkImperfections: 0.45,
    marginJitter: 1.6,
    variationSeed: 104729,
  },
  page: {
    paperType: 'ruled',
    pageSize: 'a4',
    orientation: 'portrait',
    backgroundColor: '#fcfcfd',
    lineColor: '#bfd4ef',
    ruleSpacing: 32,
    marginTop: 92,
    marginRight: 48,
    marginBottom: 56,
    marginLeft: 96,
    showMarginLine: true,
    showHolePunches: true,
    paperTexture: true,
  },
  document: {
    alignment: 'left',
    paragraphSpacing: 12,
    firstLineIndent: 0,
    showTitle: true,
    title: 'Notes on Thinking in Ink',
    showDate: true,
    date: getTodayFormatted(),
    showHeader: false,
    headerText: '',
    showFooter: false,
    footerText: '',
    pageNumberPosition: 'bottom-right',
    pageNumberFormat: 'of-total',
  },
  humanize: {
    enabled: false,
    intensity: 'medium',
    strikeThroughFrequency: 28,
    correctionFrequency: 24,
    spacingVariation: 45,
    baselineVariation: 45,
  },
};

export const HANDWRITING_PRESETS: HandwritingPreset[] = [
  {
    id: 'student-notebook',
    name: 'Student Notebook',
    description: 'Blue ballpoint on ruled notebook paper',
    handwriting: {
      fontId: 'kalam',
      fontSize: 20,
      inkColor: '#1d3c8e',
      penThickness: 1.0,
      letterSpacing: 0.2,
      wordSpacing: 1.5,
      lineSpacing: 32,
      snapToPaperLines: true,
      characterVariation: 0.45,
      baselineVariation: 0.42,
      inkImperfections: 0.45,
      marginJitter: 1.6,
    },
    page: {
      paperType: 'ruled',
      backgroundColor: '#fcfcfd',
      lineColor: '#bfd4ef',
      ruleSpacing: 32,
      marginTop: 92,
      marginLeft: 96,
      marginRight: 48,
      marginBottom: 56,
      showMarginLine: true,
      showHolePunches: true,
      paperTexture: true,
    },
  },
  {
    id: 'fountain-letter',
    name: 'Fountain Pen Letter',
    description: 'Flowing cursive on warm cream stationery',
    handwriting: {
      fontId: 'la-belle-aurore',
      fontSize: 22,
      inkColor: '#162447',
      penThickness: 1.15,
      letterSpacing: 0.4,
      wordSpacing: 2.0,
      lineSpacing: 38,
      snapToPaperLines: false,
      characterVariation: 0.35,
      baselineVariation: 0.48,
      inkImperfections: 0.55,
      marginJitter: 1.8,
    },
    page: {
      paperType: 'cream',
      backgroundColor: '#f7f1e3',
      lineColor: '#d6cbb5',
      marginTop: 76,
      marginLeft: 76,
      marginRight: 72,
      marginBottom: 68,
      showMarginLine: false,
      showHolePunches: false,
      paperTexture: true,
    },
  },
  {
    id: 'quick-lecture',
    name: 'Quick Lecture Scratch',
    description: 'Fast scribbled college-ruled notes',
    handwriting: {
      fontId: 'caveat',
      fontSize: 21,
      inkColor: '#141416',
      penThickness: 0.9,
      letterSpacing: 0.1,
      wordSpacing: 1.2,
      lineSpacing: 27,
      snapToPaperLines: true,
      characterVariation: 0.65,
      baselineVariation: 0.62,
      inkImperfections: 0.52,
      marginJitter: 2.5,
    },
    page: {
      paperType: 'college-ruled',
      backgroundColor: '#ffffff',
      lineColor: '#bcd2ee',
      ruleSpacing: 27,
      marginTop: 88,
      marginLeft: 96,
      marginRight: 44,
      marginBottom: 52,
      showMarginLine: true,
      showHolePunches: true,
      paperTexture: false,
    },
  },
  {
    id: 'legal-memo',
    name: 'Yellow Legal Pad',
    description: 'Crisp pen on classic yellow legal stationery',
    handwriting: {
      fontId: 'patrick-hand',
      fontSize: 20,
      inkColor: '#1e40af',
      penThickness: 1.05,
      letterSpacing: 0.3,
      wordSpacing: 1.8,
      lineSpacing: 32,
      snapToPaperLines: true,
      characterVariation: 0.4,
      baselineVariation: 0.38,
      inkImperfections: 0.4,
      marginJitter: 1.4,
    },
    page: {
      paperType: 'legal',
      backgroundColor: '#fef3a6',
      lineColor: '#98c1ea',
      ruleSpacing: 32,
      marginTop: 94,
      marginLeft: 98,
      marginRight: 48,
      marginBottom: 56,
      showMarginLine: true,
      showHolePunches: false,
      paperTexture: true,
    },
  },
  {
    id: 'bullet-journal',
    name: 'Dot Grid Journal',
    description: 'Clean fine-liner on dotted journal paper',
    handwriting: {
      fontId: 'indie-flower',
      fontSize: 19,
      inkColor: '#383c44',
      penThickness: 0.95,
      letterSpacing: 0.3,
      wordSpacing: 2.0,
      lineSpacing: 28,
      snapToPaperLines: false,
      characterVariation: 0.42,
      baselineVariation: 0.35,
      inkImperfections: 0.32,
      marginJitter: 1.2,
    },
    page: {
      paperType: 'dotted',
      backgroundColor: '#fcfcfb',
      lineColor: '#94a3b8',
      ruleSpacing: 24,
      marginTop: 64,
      marginLeft: 64,
      marginRight: 64,
      marginBottom: 56,
      showMarginLine: false,
      showHolePunches: false,
      paperTexture: true,
    },
  },
  {
    id: 'vintage-parchment',
    name: 'Vintage Parchment',
    description: 'Sepia ink on weathered antique paper',
    handwriting: {
      fontId: 'cedarville-cursive',
      fontSize: 20,
      inkColor: '#5c3a21',
      penThickness: 1.1,
      letterSpacing: 0.4,
      wordSpacing: 2.2,
      lineSpacing: 36,
      snapToPaperLines: false,
      characterVariation: 0.42,
      baselineVariation: 0.56,
      inkImperfections: 0.65,
      marginJitter: 2.2,
    },
    page: {
      paperType: 'old-paper',
      backgroundColor: '#ead8b1',
      lineColor: '#bfa982',
      marginTop: 76,
      marginLeft: 76,
      marginRight: 72,
      marginBottom: 68,
      showMarginLine: false,
      showHolePunches: false,
      paperTexture: true,
    },
  },
  {
    id: 'architect-grid',
    name: 'Architect Engineering',
    description: 'Technical draft lettering on grid paper',
    handwriting: {
      fontId: 'architects-daughter',
      fontSize: 18,
      inkColor: '#141416',
      penThickness: 0.95,
      letterSpacing: 0.5,
      wordSpacing: 2.0,
      lineSpacing: 24,
      snapToPaperLines: false,
      characterVariation: 0.32,
      baselineVariation: 0.28,
      inkImperfections: 0.3,
      marginJitter: 1.0,
    },
    page: {
      paperType: 'grid',
      backgroundColor: '#ffffff',
      lineColor: '#cbd5e1',
      ruleSpacing: 24,
      marginTop: 60,
      marginLeft: 60,
      marginRight: 60,
      marginBottom: 56,
      showMarginLine: false,
      showHolePunches: false,
      paperTexture: false,
    },
  },
];

export interface SampleDocumentTemplate {
  id: string;
  label: string;
  title: string;
  text: string;
}

export const SAMPLE_TEMPLATES: SampleDocumentTemplate[] = [
  {
    id: 'welcome',
    label: 'Essay on Handwriting',
    title: 'Notes on Thinking in Ink',
    text: DEFAULT_TEXT,
  },
  {
    id: 'lecture',
    label: 'Biology Lecture Notes',
    title: 'Cellular Respiration — Bio 201',
    text: `Lecture 7: Cellular Energy & Metabolic Pathways

1. Glycolysis (Cytoplasm)
- Converts one 6-carbon glucose molecule into two 3-carbon pyruvate molecules.
- Net yield: 2 ATP and 2 NADH per glucose molecule.
- Occurs anaerobically (no oxygen required).

2. The Citric Acid Cycle (Mitochondrial Matrix)
- Pyruvate is oxidized into Acetyl-CoA before entering the cycle.
- Each turn produces 3 NADH, 1 FADH2, and 1 GTP/ATP, releasing CO2 as a byproduct.

3. Oxidative Phosphorylation (Inner Membrane)
- Electron transport chain builds a proton gradient across the inner membrane.
- ATP synthase harnesses proton flow to synthesize ~28-32 ATP molecules.

Exam Reminder: Focus on tracking carbon counts and electron carriers at each stage rather than memorizing enzyme names blindly.`,
  },
  {
    id: 'letter',
    label: 'Personal Letter',
    title: 'A Note from Kyoto',
    text: `Dear Maya,

I finally found a quiet wooden desk overlooking the canal this afternoon, with rain tapping steadily against the paper screen outside. Somehow it felt wrong to send this as a hurried text message, so I wanted to put proper ink to paper instead.

The morning walk along the Philosopher's Path was remarkably calm before the crowds arrived. Maples are just beginning to turn at the edges, and small coffee shops smell of roasted beans and cedarwood.

I picked up a small ceramic tea cup you would love — simple glaze, uneven rim, warm to hold. I will bring it back next Thursday when my flight lands.

Until then, take good care of yourself and save some time for coffee soon.

Warmly,
Elena`,
  },
  {
    id: 'long-multipage',
    label: 'Long Multi-Page Study Guide',
    title: 'Principles of Distributed Systems',
    text: `Chapter 1: Why Systems Fail in Surprising Ways

In a single-process program running on one CPU, failure tends to be total and unmistakable. Either the process computes an answer, throws an unhandled exception, or crashes outright. Distributed systems erase that comforting binary. When software stretches across multiple machines connected by an asynchronous network, partial failure becomes the normal state of affairs rather than an edge case.

A packet may be delayed for seconds, duplicated silently, or dropped without warning. A remote server might stall mid-garbage-collection pause while its peers assume it has died completely. Time itself becomes slippery: physical clocks drift at slightly different rates across quartz oscillators, meaning "happened before" cannot safely be inferred from wall-clock timestamps alone.

Chapter 2: Logical Time and Causality

Leslie Lamport observed that what distributed algorithms usually care about is not absolute physical time, but causal ordering. If event A sent a message and event B received that message, A necessarily happened before B. By attaching monotonic logical counters to messages and advancing each node's clock past incoming counters, nodes can agree on a partial order consistent with causality.

Vector clocks push this idea further by giving every process an array of counters, one per participant. Comparing two vector timestamps reveals whether one event causally precedes another or whether the two events occurred concurrently—essential information when building conflict-free replicated data types or multi-leader key-value stores.

Chapter 3: Consensus Under Asynchrony

Reaching agreement among unreliable nodes is one of the deepest problems in computer science. The FLP impossibility result proves that in a purely asynchronous network, no deterministic consensus protocol can guarantee termination if even a single node is allowed to crash unannounced.

Practical systems like Raft and Paxos navigate around FLP by separating safety from liveness:
- Safety (never agreeing on conflicting values) is guaranteed unconditionally under arbitrary delays and partitions.
- Liveness (eventually making progress) holds whenever the network experiences periods of stability and timely leader heartbeats.

Chapter 4: Replication Strategies

1. Single-Leader Replication
All writes route through one elected leader, which appends mutations to an ordered write-ahead log and streams updates to followers. Reads can scale out across followers if applications tolerate slight staleness, or route to the leader for linearizable reads.

2. Multi-Leader Replication
Useful across geographically distant data centers where single-leader round-trip latency would stall local writes. The tradeoff is concurrent write conflicts that must be merged deterministically via last-write-wins, custom application resolvers, or CRDT structures.

3. Leaderless Quorum Systems
Clients broadcast reads and writes directly to N replicas, requiring W write acknowledgments and R read responses where W + R > N. This ensures at least one overlapping node holds the freshest write, while read repair and anti-entropy Merkle trees heal divergent replicas in the background.

Chapter 5: Idempotency and Practical Resilience

Real-world networks retry requests aggressively. If a client times out waiting for a payment confirmation and sends the request a second time, the backend must ensure the charge executes once. Attaching client-generated idempotency keys stored atomically alongside state transitions prevents duplicate side effects without sacrificing retry safety.

Ultimately, resilient distributed architecture is less about eliminating faults—an impossible promise—and more about bounding their blast radius through explicit timeouts, bounded queues, backpressure, and crystal-clear invariants.`,
  },
];
