// Presentational pieces of the Reacher demo page. State lives in index.page.js.
import {
  Avatar,
  Button,
  Card,
  CardHead,
  CardTitle,
  Caret,
  ChoiceChips,
  DecisionBadge,
  EmptyState,
  Funnel,
  JsonDetails,
  Meter,
  MiniLabel,
  Notice,
  Pill,
  ProbabilityBars,
  Spinner,
  Tag,
  TextArea,
  Timeline,
  TimelineStep,
  formatMs,
  pct,
  srOnly,
} from 'demos/ui';
import {
  FiArrowRight,
  FiCheck,
  FiEdit3,
  FiInfo,
  FiRotateCcw,
  FiSearch,
  FiSend,
  FiShield,
  FiZap,
} from 'react-icons/fi';
import { COUNTRY_LABELS, CREATORS, compact, creatorById, usd } from './data';
import {
  ACCEPT_POOL,
  ACTIONS,
  ACTION_LABELS,
  RANK_STAGES,
  REPLY_STAGES,
  SHORTLIST_SIZE,
  checkInvite,
  fitDisplay,
  fitState,
  fitValue,
  matchValue,
} from './matchmaker';
import styles from './Reacher.module.css';

const ACTION_TONE = { accept: 'ok', counter_offer: 'warn', send_sample_first: undefined, decline: 'bad' };
const ACTION_OPTIONS = ACTIONS.map(action => ({
  value: action,
  label: ACTION_LABELS[action],
  tone: ACTION_TONE[action],
}));
const DECISION_TONE = { accept: 'ok', counter_offer: 'warn', send_sample_first: 'ok', decline: 'bad' };

const handle = creator => `@${creator.handle}`;
const firstName = creator => creator.name.split(' ')[0];

export function RunPill({ state }) {
  if (!state || state.status === 'idle') return null;
  if (state.kind === 'example') return <Pill>Example run</Pill>;
  return (
    <Pill tone="live">
      Live{state.model ? ` · ${state.model}` : ''}
      {state.cached ? ' · cached' : ''}
    </Pill>
  );
}

function Placeholder({ running, children }) {
  return (
    <EmptyState size="s" loading={running}>
      {running ? 'Working…' : children}
    </EmptyState>
  );
}

/** A labelled score bar: one tone, hatched track, the value on the right. */
export function Bar({ label, value, display, tone = 'accent', pending = false }) {
  return (
    <div className={styles.bar} data-tone={tone} data-pending={pending || undefined}>
      <span className={styles.barLabel}>{label}</span>
      <span className={styles.barTrack} aria-hidden>
        {!pending && (
          <span className={styles.barFill} style={{ width: `${Math.max(3, value * 100)}%` }} />
        )}
      </span>
      <span className={styles.barValue}>{pending ? '–' : display}</span>
    </div>
  );
}

// --- hero ------------------------------------------------------------------------------------

export function funnelSteps(run) {
  const kept = run.filter?.kept.length ?? null;
  const pool = run.stages.accept ? run.pool.length || null : null;
  const picked = run.picked.length || null;
  return [
    { label: 'Sample creators', value: run.filter ? run.filter.total : CREATORS.length },
    { label: 'Category + market', value: kept },
    { label: 'Acceptance checked', value: pool },
    { label: 'Shortlist', value: picked },
  ];
}

/** The current run in a few numbers, beside the page title. */
export function MatchGlance({ run, product }) {
  const done = RANK_STAGES.filter(stage => run.stages[stage.id]?.status === 'done').length;
  const topId = run.status === 'done' ? run.picked[0] : null;
  const top = topId ? creatorById(topId) : null;
  const jevCalls = Object.keys(run.fit).length + Object.keys(run.accept).length;
  const totalMs = RANK_STAGES.reduce((sum, stage) => sum + (run.stages[stage.id]?.ms || 0), 0);
  const kind = run.kind === 'example' ? 'Example run' : 'Live run';

  return (
    <Card tone="accent" className={styles.glance} aria-label="This run at a glance">
      <div className={styles.glanceTop}>
        <span className={styles.glanceKind}>{run.status === 'idle' ? 'Ready' : kind}</span>
        <span className={styles.glanceStages}>
          {done} of {RANK_STAGES.length} steps
        </span>
      </div>
      <div className={styles.glanceTopMatch}>
        <span className={styles.glanceLabel}>Top match for {product.brand}</span>
        <strong>
          {top ? (
            <>
              <Avatar name={top.name} size="s" className={styles.glanceAvatar} />
              {handle(top)}
            </>
          ) : run.status === 'error' ? (
            'Stopped'
          ) : (
            'Ranking…'
          )}
        </strong>
        <span className={styles.glanceWhy}>
          {top
            ? `Fit ${fitDisplay(run.fit[topId]?.score)} · ${pct(run.accept[topId])} likely to accept`
            : 'Fit and chance of saying yes, from Jev.'}
        </span>
      </div>
      <Funnel
        size="s"
        tone="ink"
        className={styles.glanceFunnel}
        steps={funnelSteps(run)}
        label="Creators left after each step"
      />
      <dl className={styles.glanceStats}>
        {[
          ['Jev calls', jevCalls || null],
          ['Total time', run.status === 'done' ? formatMs(totalMs) : null],
          ['Offer', `${product.terms.offer}%`],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd data-empty={value == null || undefined}>{value ?? '–'}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

// --- step 1 ---------------------------------------------------------------------------------

export function ProductPicker({ products, value, onChange, onRun, busy, hasKey, notice }) {
  return (
    <div className={styles.picker}>
      <div className={styles.products} role="group" aria-label="Sample products">
        {products.map(product => (
          <button
            key={product.id}
            type="button"
            className={styles.product}
            aria-pressed={value === product.id}
            onClick={() => onChange(product.id)}
          >
            <span className={styles.productBrand}>
              {product.brand} · {product.category}
            </span>
            <strong className={styles.productName}>{product.name}</strong>
            <span className={styles.productTerms}>
              <span>{usd(product.price)}</span>
              <span>
                Offer {product.terms.offer}% · max {product.terms.max}%
              </span>
              <span>
                {product.terms.samples} free {product.terms.samples === 1 ? 'sample' : 'samples'}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className={styles.runRow}>
        <Button onClick={onRun} disabled={busy}>
          {busy ? (
            <>
              <Spinner /> Ranking
            </>
          ) : (
            <>
              <FiSearch aria-hidden /> Find creators
            </>
          )}
        </Button>
        <span className={styles.muted}>
          {hasKey
            ? 'Live: about 3 cents a run, repeats today are cached'
            : 'Preview: replays the recorded run for this product'}
        </span>
      </div>
      {notice && (
        <Notice size="s" className={styles.notice} role="status">
          {notice}
        </Notice>
      )}
    </div>
  );
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function StageDetail({ stage, run, product }) {
  if (stage.id === 'filter' && run.filter) {
    const { dropped, kept, total } = run.filter;
    const markets = product.match.markets.map(code => COUNTRY_LABELS[code] || code).join(' or ');
    return (
      <div className={styles.stageNote}>
        <p>
          <strong>{kept.length}</strong> of {total} sell {product.category.toLowerCase()} to{' '}
          {markets} audiences
        </p>
        <ul className={styles.dropped} aria-label="Filtered out">
          <li>
            <Tag soft>{dropped.category.length}</Tag> other niches
          </li>
          <li>
            <Tag soft>{dropped.market.length}</Tag> audience outside {markets}
          </li>
          <li>
            <Tag soft>{dropped.views.length}</Tag> under {compact(product.match.minAvgViews)} avg views
          </li>
        </ul>
      </div>
    );
  }
  if (stage.id === 'fit' && run.filter) {
    const scored = Object.keys(run.fit).length;
    const total = run.filter.kept.length;
    const strong = Object.values(run.fit).filter(item => fitDisplay(item.score) >= 75).length;
    return (
      <div className={styles.stageNote}>
        <Meter
          value={scored / total}
          segments={total}
          size="s"
          label={`${scored} of ${total} creators scored`}
        />
        <p>
          {scored} of {total} scored on a 5-level rubric
          {scored === total && ` · ${strong} strong fits (75+)`}
        </p>
      </div>
    );
  }
  if (stage.id === 'accept' && run.pool.length) {
    const values = Object.values(run.accept);
    const low = values.filter(p => p < 0.3).length;
    return (
      <div className={styles.stageNote}>
        <p>
          {values.length} of the {Math.min(ACCEPT_POOL, run.pool.length)} best fits
          {values.length === run.pool.length && values.length > 0 && (
            <>
              {' '}
              · median {pct(median(values))}
              {low > 0 && ` · ${low} under 30%`}
            </>
          )}
        </p>
      </div>
    );
  }
  if (stage.id === 'pick' && run.picked.length) {
    return (
      <div className={styles.stageNote}>
        <p>
          Ranked by fit × chance of accepting
          {Object.keys(run.why).length > 0 && ' · one-line whys written by the LLM'}
        </p>
      </div>
    );
  }
  return null;
}

export function RunPanel({ run, product, onReplay, replayDisabled, exampleNote }) {
  const top = run.picked[0] ? creatorById(run.picked[0]) : null;
  return (
    <Card className={styles.runCard} aria-live="polite">
      <CardHead
        aside={
          run.kind === 'example' &&
          run.status === 'done' && (
            <Button variant="ghost" onClick={onReplay} disabled={replayDisabled}>
              <FiRotateCcw aria-hidden /> Replay
            </Button>
          )
        }
      >
        <CardTitle>Agent run</CardTitle>
        <RunPill state={run} />
      </CardHead>
      {run.kind === 'example' && run.status !== 'idle' && (
        <p className={styles.exampleNote}>
          <FiInfo aria-hidden />
          <span>{exampleNote}</span>
        </p>
      )}
      <Timeline>
        {RANK_STAGES.map((stage, index) => {
          const state = run.stages[stage.id] || { status: 'pending' };
          return (
            <TimelineStep
              key={stage.id}
              index={index}
              status={state.status}
              title={stage.label}
              detail={stage.detail}
              ms={state.ms}
            >
              <StageDetail stage={stage} run={run} product={product} />
            </TimelineStep>
          );
        })}
      </Timeline>
      {run.error && (
        <Notice kind="error" size="s" className={styles.error} role="alert">
          {run.error}
        </Notice>
      )}
      {top && (
        <JsonDetails
          className={styles.jevState}
          summary="What Jev sees for one creator (state JSON)"
          value={fitState(product, top)}
        />
      )}
    </Card>
  );
}

function CreatorRow({ id, rank, run, selected, onSelect, onInvite, dim }) {
  const creator = creatorById(id);
  const fit = run.fit[id];
  const p = run.accept[id];
  const why = run.why[id];
  return (
    <li className={styles.row} data-selected={selected || undefined} data-dim={dim || undefined}>
      <button
        type="button"
        className={styles.rowMain}
        data-ranked={rank != null || undefined}
        aria-pressed={selected}
        onClick={() => onSelect(id)}
      >
        {rank != null && <span className={styles.rank}>{rank}</span>}
        <Avatar name={creator.name} tone={selected ? 'accent' : 'neutral'} />
        <span className={styles.who}>
          <strong>{creator.name}</strong>
          <span>
            {handle(creator)} · {creator.niche}
          </span>
          <span className={styles.whoStats}>
            {compact(creator.followers)} followers · {usd(creator.gmv30d)} GMV 30d · asks{' '}
            {creator.commissionAsk}%
          </span>
        </span>
        <span className={styles.scores}>
          <Bar
            label="Fit"
            value={fit ? fitValue(fit.score) : 0}
            display={fit ? fitDisplay(fit.score) : ''}
            pending={!fit}
          />
          <Bar
            label="Accept"
            tone="ok"
            value={p ?? 0}
            display={pct(p)}
            pending={p == null}
          />
        </span>
      </button>
      {why && (
        <p className={styles.why}>
          <span>{why}</span>
          <Button
            variant="link"
            className={styles.inviteLink}
            onClick={() => onInvite(id)}
            aria-label={`Draft an invite for ${creator.name}`}
          >
            Invite <FiArrowRight aria-hidden />
          </Button>
        </p>
      )}
    </li>
  );
}

export function ShortlistPanel({ run, product, selectedId, onSelect, onInvite }) {
  const picked = run.picked.length > 0;
  const kept = run.filter?.kept || [];
  const rows = picked ? run.picked : kept;
  const rest = picked
    ? kept
        .filter(id => !run.picked.includes(id) && run.fit[id])
        .sort(
          (a, b) =>
            matchValue(run.fit[b]?.score, run.accept[b] ?? 0) -
              matchValue(run.fit[a]?.score, run.accept[a] ?? 0) ||
            (run.fit[b]?.score || 0) - (run.fit[a]?.score || 0)
        )
    : [];

  return (
    <Card className={styles.listCard}>
      <CardHead aside={picked && <Pill>fit × P(accept)</Pill>}>
        <CardTitle>{picked ? `Top ${run.picked.length} creators` : 'Candidates'}</CardTitle>
        <span className={styles.listFor}>for {product.name.split(',')[0]}</span>
      </CardHead>
      {!rows.length ? (
        <Placeholder running={run.status === 'running'}>
          The ranked shortlist appears here.
        </Placeholder>
      ) : (
        <>
          <ol className={styles.rows} aria-label={picked ? 'Shortlist' : 'Candidates'}>
            {rows.map((id, index) => (
              <CreatorRow
                key={id}
                id={id}
                rank={picked ? index + 1 : null}
                run={run}
                selected={selectedId === id}
                onSelect={onSelect}
                onInvite={onInvite}
                dim={!picked && run.stages.accept && !run.pool.includes(id)}
              />
            ))}
          </ol>
          {rest.length > 0 && (
            <details className={styles.rest}>
              <summary>
                {rest.length} more scored, not shortlisted
              </summary>
              <ul>
                {rest.map(id => {
                  const creator = creatorById(id);
                  return (
                    <li key={id}>
                      <span>{handle(creator)}</span>
                      <span className={styles.restScores}>
                        Fit {fitDisplay(run.fit[id].score)} ·{' '}
                        {run.accept[id] != null
                          ? `${pct(run.accept[id])} accept`
                          : `not in the ${ACCEPT_POOL} best fits`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </>
      )}
    </Card>
  );
}

// --- step 2 ---------------------------------------------------------------------------------

export function CreatorCard({ creator, run }) {
  if (!creator) {
    return (
      <Card>
        <Placeholder>Pick a creator from the shortlist.</Placeholder>
      </Card>
    );
  }
  const fit = run.fit[creator.id];
  const p = run.accept[creator.id];
  const stats = [
    ['Followers', compact(creator.followers)],
    ['Avg views', compact(creator.avgViews)],
    ['GMV, 30 days', usd(creator.gmv30d)],
    ['Usual ask', `${creator.commissionAsk}%`],
    ['Reply rate', pct(creator.replyRate)],
    ['Audience', `${COUNTRY_LABELS[creator.country] || creator.country}`],
  ];
  return (
    <Card className={styles.creatorCard}>
      <div className={styles.profile}>
        <Avatar name={creator.name} size="l" tone="accent" />
        <div>
          <CardTitle as="h3">{creator.name}</CardTitle>
          <p className={styles.profileHandle}>
            {handle(creator)} · {creator.niche} · {creator.audience}
          </p>
        </div>
      </div>
      <dl className={styles.statGrid}>
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.styleNote}>
        <MiniLabel>Content notes</MiniLabel>
        <p>{creator.style}</p>
      </div>
      {(fit || p != null) && (
        <div className={styles.profileScores}>
          <Bar
            label="Fit"
            value={fit ? fitValue(fit.score) : 0}
            display={fit ? fitDisplay(fit.score) : ''}
            pending={!fit}
          />
          <Bar label="Accept" tone="ok" value={p ?? 0} display={pct(p)} pending={p == null} />
        </div>
      )}
      {run.why[creator.id] && <p className={styles.profileWhy}>{run.why[creator.id]}</p>}
    </Card>
  );
}

export function InvitePanel({
  product,
  creator,
  invite,
  draft,
  onDraftChange,
  onDraft,
  busy,
  hasKey,
  notice,
  exampleNote,
}) {
  const streaming = invite.status === 'running';
  const hasText = Boolean(draft || invite.text);
  const checks = invite.status === 'done' ? checkInvite(product, draft, invite.fixed) : [];
  return (
    <Card className={styles.inviteCard}>
      <CardHead aside={<RunPill state={invite} />}>
        <CardTitle>Affiliate invite</CardTitle>
        <Pill>LLM draft · editable</Pill>
      </CardHead>
      <p className={styles.terms}>
        <FiShield aria-hidden />
        <span>
          Offer {product.terms.offer}% commission (brand max {product.terms.max}%) and{' '}
          {product.terms.samples === 1 ? 'one free sample' : `up to ${product.terms.samples} free samples`}. Code caps any higher
          rate before the message is shown.
        </span>
      </p>
      {invite.kind === 'example' && invite.status !== 'idle' && (
        <p className={styles.exampleNote}>
          <FiInfo aria-hidden />
          <span>{exampleNote}</span>
        </p>
      )}
      {!hasText && !streaming ? (
        <Placeholder>
          {creator
            ? `Draft a personalised invite for ${firstName(creator)}.`
            : 'Pick a creator first.'}
        </Placeholder>
      ) : streaming ? (
        <div className={styles.inviteStream} aria-live="polite">
          {invite.text}
          <Caret variant="soft" />
        </div>
      ) : (
        <>
          <label className={srOnly} htmlFor="invite-text">
            Invite text
          </label>
          <TextArea
            id="invite-text"
            className={styles.inviteText}
            value={draft}
            maxLength={1200}
            onChange={event => onDraftChange(event.target.value)}
          />
        </>
      )}
      {checks.length > 0 && (
        <ul className={styles.checks} aria-label="Invite checks">
          {checks.map(check => (
            <li key={check.id} data-ok={check.ok || undefined}>
              {check.ok ? <FiCheck aria-hidden /> : <FiInfo aria-hidden />}
              <span>
                <strong>{check.label}</strong> {check.text}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.runRow}>
        <Button onClick={onDraft} disabled={busy || !creator}>
          {busy ? (
            <>
              <Spinner /> Drafting
            </>
          ) : (
            <>
              <FiEdit3 aria-hidden /> {hasText ? 'Redraft invite' : 'Draft invite'}
            </>
          )}
        </Button>
        <span className={styles.muted}>
          {hasKey ? 'Live: 1 LLM call, cached per creator' : 'Preview: recorded invites only'}
        </span>
      </div>
      {notice && (
        <Notice size="s" className={styles.notice} role="status">
          {notice}
        </Notice>
      )}
      {invite.error && (
        <Notice kind="error" size="s" className={styles.notice} role="alert">
          {invite.error}
        </Notice>
      )}
    </Card>
  );
}

// --- step 3 ---------------------------------------------------------------------------------

export function ThreadPanel({
  product,
  creator,
  invite,
  replyText,
  onReplyChange,
  presetIndex,
  onPreset,
  onDecide,
  busy,
  reply,
  hasKey,
  notice,
  exampleNote,
}) {
  const streaming = reply.stages.draft?.status === 'running';
  return (
    <Card className={styles.threadCard}>
      <CardHead aside={<RunPill state={reply} />}>
        <CardTitle>DM thread</CardTitle>
        {creator && <span className={styles.listFor}>with {handle(creator)}</span>}
      </CardHead>
      {reply.kind === 'example' && reply.status !== 'idle' && (
        <p className={styles.exampleNote}>
          <FiInfo aria-hidden />
          <span>{exampleNote}</span>
        </p>
      )}
      <div className={styles.thread}>
        {invite ? (
          <div className={styles.bubble} data-from="brand">
            <span className={styles.bubbleWho}>{product.brand} · invite</span>
            <p className={styles.bubbleClamp}>{invite}</p>
          </div>
        ) : (
          <p className={styles.muted}>Draft the invite in step 2 first; the thread starts there.</p>
        )}
        {reply.status !== 'idle' && reply.ask && (
          <div className={styles.bubble} data-from="creator">
            <span className={styles.bubbleWho}>{creator ? handle(creator) : 'Creator'}</span>
            <p>{reply.sent}</p>
          </div>
        )}
        {(reply.text || streaming) && (
          <div className={styles.bubble} data-from="brand" data-draft>
            <span className={styles.bubbleWho}>
              {product.brand} · draft reply, not sent
            </span>
            <p>
              {reply.text}
              {streaming && <Caret variant="soft" />}
            </p>
            {reply.status === 'done' && (
              <span className={styles.outputCheck}>
                <FiShield aria-hidden />
                {reply.fixed.length
                  ? `Output check fixed ${reply.fixed.join('%, ')}% to ${reply.guard?.commission}%`
                  : reply.guard?.commission != null
                  ? `Output check: every rate in the draft is at most ${reply.guard.commission}%`
                  : 'Output check: no rate offered'}
              </span>
            )}
          </div>
        )}
      </div>
      <form
        className={styles.composer}
        onSubmit={event => {
          event.preventDefault();
          onDecide();
        }}
      >
        <MiniLabel as="p">The creator replies</MiniLabel>
        <ChoiceChips
          className={styles.presets}
          label="Sample replies"
          options={product.replies.map((text, index) => ({ value: index, label: text }))}
          value={presetIndex}
          onChange={onPreset}
        />
        <label className={srOnly} htmlFor="creator-reply">
          Creator reply
        </label>
        <TextArea
          id="creator-reply"
          variant="ring"
          className={styles.replyInput}
          value={replyText}
          maxLength={400}
          rows={2}
          placeholder="Or type the creator's reply"
          onChange={event => onReplyChange(event.target.value)}
        />
        <div className={styles.runRow}>
          <Button type="submit" disabled={busy || !creator || !replyText.trim()}>
            {busy ? (
              <>
                <Spinner /> Deciding
              </>
            ) : (
              <>
                <FiSend aria-hidden /> Decide and draft reply
              </>
            )}
          </Button>
          <span className={styles.muted}>
            {hasKey ? 'Live: 1 Jev call + 1 LLM call' : 'Preview: the recorded reply only'}
          </span>
        </div>
        {notice && (
          <Notice size="s" className={styles.notice} role="status">
            {notice}
          </Notice>
        )}
        {reply.error && (
          <Notice kind="error" size="s" className={styles.notice} role="alert">
            {reply.error}
          </Notice>
        )}
      </form>
    </Card>
  );
}

const STATUS_TAG = { capped: ['warn', 'capped'], refused: ['bad', 'refused'], ok: ['ok', 'ok'] };

export function DecisionPanel({ reply, product }) {
  const { decision, guard } = reply;
  return (
    <Card className={styles.decisionCard}>
      <CardHead>
        <CardTitle>Next action</CardTitle>
        <Pill>Jev choice · 1 call</Pill>
      </CardHead>
      {!decision ? (
        <Placeholder running={reply.status === 'running'}>
          Jev&apos;s probabilities over accept, counter, sample first and decline appear here.
        </Placeholder>
      ) : (
        <>
          <p className={styles.question}>
            <code>next_action</code> choice, given the brand&apos;s terms and the reply
          </p>
          <ProbabilityBars
            className={styles.actionBars}
            options={ACTION_OPTIONS}
            probabilities={decision.probabilities}
            choice={decision.choice}
          />
          {guard && (
            <div className={styles.final}>
              <div className={styles.finalHead}>
                <MiniLabel>Final action</MiniLabel>
                <DecisionBadge tone={DECISION_TONE[guard.action]} size="l">
                  {ACTION_LABELS[guard.action]}
                </DecisionBadge>
              </div>
              <p className={styles.finalWhy}>
                {guard.escalated
                  ? `Jev leaned ${ACTION_LABELS[guard.choice].toLowerCase()}, but the ask breaks the brand's terms, so code turned it into a counter-offer. Code can make an action stricter, never looser.`
                  : `Jev's pick (${pct(decision.probabilities[decision.choice])}). The numbers in the reply come from code, not the model.`}
              </p>
            </div>
          )}
        </>
      )}
      <div className={styles.guard}>
        <div className={styles.guardHead}>
          <FiShield aria-hidden />
          <strong>Commission guardrail</strong>
          <span className={styles.muted}>code, after Jev and again after the draft</span>
        </div>
        <div className={styles.guardTable} role="table" aria-label="Guardrail checks">
          <div className={styles.guardRow} role="row" data-head>
            <span role="columnheader">Term</span>
            <span role="columnheader">Asked</span>
            <span role="columnheader">Brand limit</span>
            <span role="columnheader">In reply</span>
          </div>
          {(guard?.checks || defaultChecks(product)).map(check => {
            const [tone, text] = STATUS_TAG[check.status] || STATUS_TAG.ok;
            return (
              <div key={check.id} className={styles.guardRow} role="row">
                <span role="cell" className={styles.guardTerm}>
                  {check.label}
                </span>
                <span role="cell" data-label="Asked">
                  {check.asked}
                </span>
                <span role="cell" data-label="Limit">
                  {check.limit}
                </span>
                <span role="cell" data-label="In reply" className={styles.guardResult}>
                  {check.result}
                  {guard && check.status !== 'ok' && <Tag tone={tone}>{text}</Tag>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {reply.stages && Object.keys(reply.stages).length > 0 && (
        <ul className={styles.replyTimes} aria-label="Step timings">
          {REPLY_STAGES.map(stage => (
            <li key={stage.id} data-done={reply.stages[stage.id]?.status === 'done' || undefined}>
              <FiZap aria-hidden />
              {stage.label}
              <span>{reply.stages[stage.id]?.ms != null ? formatMs(reply.stages[stage.id].ms) : '–'}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function defaultChecks(product) {
  return [
    { id: 'commission', label: 'Commission', asked: '–', limit: `max ${product.terms.max}%`, result: '–', status: 'ok' },
    { id: 'samples', label: 'Free samples', asked: '–', limit: `${product.terms.samples} per creator`, result: '–', status: 'ok' },
    { id: 'fee', label: 'Flat fee', asked: '–', limit: 'none', result: '–', status: 'ok' },
  ];
}

export { SHORTLIST_SIZE };
