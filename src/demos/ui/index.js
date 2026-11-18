// Shared UI kit for company demos. Catalog and tokens: ./README.md.
// Gallery (dev only): /demo/ui/
import tokenStyles from './tokens.module.css';

export { Avatar, initials } from './Avatar';
export {
  BadgeMeta,
  BadgeRow,
  DecisionBadge,
  Dot,
  Pill,
  RunStatus,
  ScoreBadge,
  Tag,
} from './Badges';
export { Button } from './Button';
export { Gauge, Meter, MiniBars, Ring, Sparkline, SplitBar } from './Charts';
export {
  ChoiceChips,
  Chip,
  IndexBadge,
  OptionList,
  SegmentedControl,
  Tabs,
} from './Choice';
export { CodeView, CopyButton, InlineCode, RichText } from './CodeView';
export { EvalTable } from './EvalTable';
export { Input, Select, TextArea } from './Field';
export { formatMs, formatTime, pct, percent, riskTone, seconds } from './format';
export { Funnel } from './Funnel';
export { highlightLines } from './highlight';
export { JsonDetails, JsonView, tokenizeJson } from './JsonView';
export { MarkdownLite, splitFences } from './MarkdownLite';
export {
  McpCallLog,
  McpConnectCommand,
  McpToolPanel,
  rpcRequest,
  toolErrorResult,
  toolResult,
} from './Mcp';
export {
  Card,
  CardHead,
  CardTitle,
  Eyebrow,
  KeyValues,
  Kicker,
  MiniLabel,
  NoteGrid,
  SectionHead,
} from './Panel';
export { ProbabilityBar, ProbabilityBars } from './ProbabilityBar';
export { StatGrid, StatTile } from './Stat';
export { Caret, EmptyState, Notice, SkeletonGrid, Spinner, TypingDots } from './States';
export { StatusIcon } from './StatusIcon';
export { ToolCall, ToolCallList } from './ToolCall';
export { PipelineStrip, Timeline, TimelineStep } from './Timeline';
export { TrackedText } from './TrackedText';
export { ApprovalCard } from './Approval';
export { AuditTrail } from './AuditTrail';
export { ChatThread } from './Chat';
export { CheckList } from './CheckList';
export { ScheduleStrip } from './Schedule';
export { DocumentScan } from './DocumentScan';
export { RequestLog } from './RequestLog';

/** Class that defines the --ui* tokens; DemoLayout applies it to every demo. */
export const tokens = tokenStyles.tokens;

/** Screen-reader-only class for labels and headings. */
export const srOnly = tokenStyles.srOnly;
