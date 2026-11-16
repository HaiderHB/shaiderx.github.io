// Reacher demo: a creator matchmaker for one TikTok Shop product.
// Live at /demo/reacher/ (unlisted, noindex). Without a demo key the page plays recorded example
// runs; with one, the three steps call /api/demo/reacher/{rank,invite,reply}/.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, streamFromApi } from 'demos/client';
import { NoteGrid, PipelineStrip, SectionHead } from 'demos/ui';
import { useEffect, useRef, useState } from 'react';
import { PRODUCTS, creatorById, productById } from './data';
import { EXAMPLES, EXAMPLE_META } from './example';
import {
  applyRankEvent,
  applyReplyEvent,
  applyTextEvent,
  emptyRank,
  emptyReply,
  emptyText,
  runInvite,
  runMatchmaker,
  runNegotiation,
} from './matchmaker';
import {
  CreatorCard,
  DecisionPanel,
  InvitePanel,
  MatchGlance,
  ProductPicker,
  RunPanel,
  ShortlistPanel,
  ThreadPanel,
} from './panels';
import styles from './Reacher.module.css';

const API = '/api/demo/reacher';
const DEFAULT_PRODUCT = 'serum';
const PREVIEW_NOTE = 'Preview mode: live runs need the private link from my email.';
const NAV = [
  { href: '#match', label: 'Match' },
  { href: '#invite', label: 'Invite' },
  { href: '#reply', label: 'Reply' },
  { href: '#notes', label: 'Design choices' },
];

const FLOW = [
  { label: 'Filter', what: '40 creators: niche, market, views', cost: 'code, free' },
  { label: 'Score fit', what: 'Jev score per creator', cost: '~12 calls' },
  { label: 'Acceptance', what: 'Jev probability, best 10 fits', cost: '~10 calls' },
  { label: 'Invite + reply', what: 'LLM writes, code caps the rate', cost: '2 calls' },
];

const recordedDay = new Date(`${EXAMPLE_META.recorded}T12:00:00Z`).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const EXAMPLE_NOTES = {
  rank: `Example run. Jev's scores and the LLM's one-line whys were recorded from a live run on ${recordedDay} (replayed faster; the times shown are the live ones). The filter and the ranking run in your browser on the same code the API uses.`,
  invite: `Recorded live on ${recordedDay} and replayed. The rate check runs in your browser; the text is yours to edit.`,
  reply: `Recorded live on ${recordedDay}. The parsing of the ask and the commission guardrail run in your browser on the same code as the API.`,
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Paces events so a person can follow them (Jev answers land within a few hundred ms)
const RANK_PACE = { fit: 95, accept: 95, pick: 360, filter: 260 };
const TEXT_MS = 26;

// Binds the event now (the client build transpiles async loops; a closure over the loop variable
// could see a later event by the time React runs the updater)
const applying = (reducer, event) => state => reducer(state, event);

function createPlayer(apply, pace, { instant = false } = {}) {
  const queue = [];
  let cancelled = false;
  let draining = false;

  async function drain() {
    draining = true;
    while (queue.length && !cancelled) {
      const event = queue.shift();
      apply(event);
      const wait = instant ? 0 : pace(event);
      if (wait) await sleep(wait);
    }
    draining = false;
  }

  return {
    push(event) {
      if (cancelled) return;
      queue.push(event);
      if (!draining) drain();
    },
    cancel() {
      cancelled = true;
      queue.length = 0;
    },
  };
}

const rankPace = event =>
  event.t === 'stage' && event.status === 'done' ? 200 : RANK_PACE[event.t] || 0;
const textPace = event => (event.t === 'text' ? TEXT_MS : event.t === 'stage' ? 220 : event.t === 'decision' ? 420 : 0);

/** Streams NDJSON events from a demo route into onEvent. */
async function streamEvents(path, body, onEvent) {
  let buffer = '';
  let finished = false;
  const handle = line => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.t === 'done' || event.t === 'error') finished = true;
    onEvent(event);
  };
  await streamFromApi(`${API}/${path}/`, body, chunk => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach(handle);
  });
  handle(buffer);
  if (!finished) onEvent({ t: 'error', message: 'The run ended early. Try again.' });
}

async function* wordsOf(text) {
  for (const word of String(text).split(/(?<=\s)/)) yield word;
}

/** Overrides a stage's measured time with the time the live run took. */
const withRecordedMs = (event, ms) =>
  event.t === 'stage' && event.status === 'done' && ms?.[event.id] != null
    ? { ...event, ms: ms[event.id] }
    : event;

export default function ReacherDemo() {
  const [productId, setProductId] = useState(DEFAULT_PRODUCT);
  const [rank, setRank] = useState(() => emptyRank('example'));
  const [selectedId, setSelectedId] = useState(null);
  const [invite, setInvite] = useState(() => emptyText('example'));
  const [inviteDraft, setInviteDraft] = useState('');
  const [replyText, setReplyText] = useState(productById(DEFAULT_PRODUCT).replies[0]);
  const [presetIndex, setPresetIndex] = useState(0);
  const [reply, setReply] = useState(() => emptyReply('example'));
  const [hasKey, setHasKey] = useState(false);
  const [notices, setNotices] = useState({});
  const players = useRef({});
  const fillAfterRank = useRef(null);

  const rankProduct = productById(rank.productId || productId);
  const selected = selectedId ? creatorById(selectedId) : null;
  const rankBusy = rank.status === 'running' && rank.kind === 'live';
  const inviteBusy = invite.status === 'running' && invite.kind === 'live';
  const replyBusy = reply.status === 'running' && reply.kind === 'live';

  const note = (key, text) => setNotices(state => ({ ...state, [key]: text }));
  const startPlayer = (key, apply, pace) => {
    players.current[key]?.cancel();
    const player = createPlayer(apply, pace, { instant: prefersReducedMotion() });
    players.current[key] = player;
    return player;
  };

  // --- example replays (recorded model outputs, everything else computed here) ---------------

  function playRankExample(id, { fill = false } = {}) {
    const example = EXAMPLES[id];
    if (!example) return false;
    const player = startPlayer('rank', event => setRank(applying(applyRankEvent, event)), rankPace);
    setRank({ ...emptyRank('example'), productId: id, status: 'running', model: EXAMPLE_META.model });
    fillAfterRank.current = fill ? id : null;
    runMatchmaker(id, {
      concurrency: 1,
      scoreFit: async (state, creatorId) => {
        if (!example.rank.fit[creatorId]) throw new Error('not recorded');
        return example.rank.fit[creatorId];
      },
      estimateAccept: async (state, creatorId) => {
        if (example.rank.accept[creatorId] == null) throw new Error('not recorded');
        return { noul: example.rank.accept[creatorId] };
      },
      writeWhy: async () => example.rank.why,
      emit: event => player.push(withRecordedMs(event, example.rank.ms)),
    }).catch(error => player.push({ t: 'error', message: error.message }));
    return true;
  }

  function playInviteExample(id, creatorId, { instant = false } = {}) {
    const example = EXAMPLES[id]?.invite;
    if (!example || example.creatorId !== creatorId) return false;
    const player = startPlayer(
      'invite',
      event => {
        setInvite(applying(applyTextEvent, event));
        if (event.t === 'final') setInviteDraft(event.text);
      },
      instant ? () => 0 : textPace
    );
    setInvite({ ...emptyText('example'), status: 'running', model: EXAMPLE_META.model });
    setInviteDraft('');
    runInvite(id, creatorId, {
      draft: () => wordsOf(example.text),
      emit: event => player.push(event.t === 'final' ? { ...event, ms: example.ms } : event),
    }).catch(error => player.push({ t: 'error', message: error.message }));
    return true;
  }

  function playReplyExample(id, creatorId, text, { instant = false } = {}) {
    const example = EXAMPLES[id]?.reply;
    if (!example || example.creatorId !== creatorId || example.reply !== text.trim()) return false;
    const player = startPlayer(
      'reply',
      event => setReply(applying(applyReplyEvent, event)),
      instant ? () => 0 : textPace
    );
    setReply({ ...emptyReply('example'), status: 'running', model: EXAMPLE_META.model, sent: example.reply });
    runNegotiation(id, creatorId, {
      reply: example.reply,
      invite: '',
      decide: async () => example.decision,
      draft: () => wordsOf(example.text),
      emit: event => player.push(withRecordedMs(event, example.ms)),
    }).catch(error => player.push({ t: 'error', message: error.message }));
    return true;
  }

  // First load: the example ranking plays, then steps 2 and 3 fill in with the recorded run.
  useEffect(() => {
    setHasKey(Boolean(getDemoKey()));
    playRankExample(DEFAULT_PRODUCT, { fill: true });
    const current = players.current;
    return () => Object.values(current).forEach(player => player?.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (rank.status !== 'done' || !fillAfterRank.current) return;
    const id = fillAfterRank.current;
    fillAfterRank.current = null;
    const example = EXAMPLES[id];
    if (!example) return;
    setSelectedId(example.invite.creatorId);
    playInviteExample(id, example.invite.creatorId, { instant: true });
    setReplyText(example.reply.reply);
    setPresetIndex(productById(id).replies.indexOf(example.reply.reply));
    playReplyExample(id, example.reply.creatorId, example.reply.reply, { instant: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rank.status]);

  // --- actions ---------------------------------------------------------------------------

  function resetDownstream() {
    players.current.invite?.cancel();
    players.current.reply?.cancel();
    setInvite(emptyText('live'));
    setInviteDraft('');
    setReply(emptyReply('live'));
  }

  function pickProduct(id) {
    if (id === productId) return;
    setProductId(id);
    const replies = productById(id).replies;
    setReplyText(replies[0]);
    setPresetIndex(0);
    note('rank', '');
  }

  async function findCreators() {
    note('rank', '');
    note('invite', '');
    note('reply', '');
    if (!hasKey) {
      note('rank', `${PREVIEW_NOTE} Replaying the recorded run for this product.`);
      if (rank.productId !== productId || rank.kind !== 'example' || rank.status === 'done') {
        resetDownstream();
        setSelectedId(null);
        playRankExample(productId, { fill: true });
      }
      return;
    }
    resetDownstream();
    setSelectedId(null);
    const player = startPlayer('rank', event => setRank(applying(applyRankEvent, event)), rankPace);
    setRank({ ...emptyRank('live'), productId, status: 'running' });
    try {
      await streamEvents('rank', { productId }, player.push);
    } catch (error) {
      player.push({ t: 'error', message: error.message });
    }
  }

  function selectCreator(id) {
    if (id === selectedId) return;
    setSelectedId(id);
    players.current.invite?.cancel();
    players.current.reply?.cancel();
    setInvite(emptyText(hasKey ? 'live' : 'example'));
    setInviteDraft('');
    setReply(emptyReply(hasKey ? 'live' : 'example'));
    note('invite', '');
    note('reply', '');
  }

  function inviteCreator(id) {
    selectCreator(id);
    document.getElementById('invite')?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  async function draftInvite() {
    if (!selected) return;
    const id = rank.productId || productId;
    note('invite', '');
    setReply(emptyReply(hasKey ? 'live' : 'example'));
    if (!hasKey) {
      if (playInviteExample(id, selected.id)) return;
      const recorded = EXAMPLES[id] && creatorById(EXAMPLES[id].invite.creatorId);
      note(
        'invite',
        `${PREVIEW_NOTE}${recorded ? ` The recorded invite is for @${recorded.handle}, the top match.` : ''}`
      );
      return;
    }
    const player = startPlayer(
      'invite',
      event => {
        setInvite(applying(applyTextEvent, event));
        if (event.t === 'final') setInviteDraft(event.text);
      },
      event => (event.t === 'text' ? 12 : 0)
    );
    setInvite({ ...emptyText('live'), status: 'running' });
    setInviteDraft('');
    try {
      await streamEvents('invite', { productId: id, creatorId: selected.id }, player.push);
    } catch (error) {
      player.push({ t: 'error', message: error.message });
    }
  }

  async function decide() {
    if (!selected || !replyText.trim()) return;
    const id = rank.productId || productId;
    note('reply', '');
    if (!hasKey) {
      if (playReplyExample(id, selected.id, replyText)) return;
      const example = EXAMPLES[id]?.reply;
      const recorded = example && creatorById(example.creatorId);
      note(
        'reply',
        `${PREVIEW_NOTE}${
          recorded ? ` The recorded thread is @${recorded.handle} replying "${example.reply}"` : ''
        }`
      );
      return;
    }
    const player = startPlayer(
      'reply',
      event => setReply(applying(applyReplyEvent, event)),
      event => (event.t === 'text' ? 12 : event.t === 'decision' ? 250 : 0)
    );
    setReply({ ...emptyReply('live'), status: 'running', sent: replyText.trim() });
    try {
      await streamEvents(
        'reply',
        { productId: id, creatorId: selected.id, reply: replyText.trim(), invite: inviteDraft },
        player.push
      );
    } catch (error) {
      player.push({ t: 'error', message: error.message });
    }
  }

  function replayRank() {
    note('rank', '');
    resetDownstream();
    playRankExample(rank.productId || DEFAULT_PRODUCT, { fill: true });
  }

  const threadProduct = rankProduct;

  return (
    <DemoLayout
      company="Reacher"
      title="Creator matchmaker: one product in, a shortlist of creators who'll say yes"
      tagline="Pick a TikTok Shop product. An agent filters 40 sample creators in code, Jev scores each one's fit and chance of accepting, then the LLM writes the invite and answers the creator's reply, with the commission capped at the brand's max by code, not by the prompt."
      accent="coral"
      nav={NAV}
      hero={<MatchGlance run={rank} product={rankProduct} />}
    >
      <div className={styles.page}>
        <PipelineStrip steps={FLOW} />

        <section id="match" className={styles.section} aria-labelledby="match-heading">
          <SectionHead
            variant="numbered"
            index={1}
            kicker="Step 1 · Match"
            titleId="match-heading"
            title="Pick a product, rank the creators"
            lede="Each product carries the brand's terms: the opening commission, the hard maximum and how many free samples a creator can get."
          />
          <ProductPicker
            products={PRODUCTS}
            value={productId}
            onChange={pickProduct}
            onRun={findCreators}
            busy={rankBusy}
            hasKey={hasKey}
            notice={notices.rank}
          />
          <div className={styles.gridMatch}>
            <RunPanel
              run={rank}
              product={rankProduct}
              onReplay={replayRank}
              replayDisabled={rankBusy}
              exampleNote={EXAMPLE_NOTES.rank}
            />
            <ShortlistPanel
              run={rank}
              product={rankProduct}
              selectedId={selectedId}
              onSelect={selectCreator}
              onInvite={inviteCreator}
            />
          </div>
        </section>

        <section id="invite" className={styles.section} aria-labelledby="invite-heading">
          <SectionHead
            variant="numbered"
            index={2}
            kicker="Step 2 · Invite"
            titleId="invite-heading"
            title="A personal invite, inside the brand's terms"
            lede="The LLM opens with something the creator actually makes, then the offer. Pick anyone on the shortlist to switch."
          />
          <div className={styles.gridInvite}>
            <CreatorCard creator={selected} run={rank} />
            <InvitePanel
              product={rankProduct}
              creator={selected}
              invite={invite}
              draft={inviteDraft}
              onDraftChange={setInviteDraft}
              onDraft={draftInvite}
              busy={inviteBusy}
              hasKey={hasKey}
              notice={notices.invite}
              exampleNote={EXAMPLE_NOTES.invite}
            />
          </div>
        </section>

        <section id="reply" className={styles.section} aria-labelledby="reply-heading">
          <SectionHead
            variant="numbered"
            index={3}
            kicker="Step 3 · Reply"
            titleId="reply-heading"
            title="The creator answers. Jev picks the move, code holds the line"
            lede="Pick a sample reply or type one. Jev chooses between accept, counter-offer, sample first and decline; code caps the commission and samples; the LLM drafts the answer."
          />
          <div className={styles.gridReply}>
            <ThreadPanel
              product={threadProduct}
              creator={selected}
              invite={inviteDraft}
              replyText={replyText}
              onReplyChange={value => {
                setReplyText(value);
                setPresetIndex(threadProduct.replies.indexOf(value));
              }}
              presetIndex={presetIndex}
              onPreset={index => {
                setPresetIndex(index);
                setReplyText(threadProduct.replies[index]);
              }}
              onDecide={decide}
              busy={replyBusy}
              reply={reply}
              hasKey={hasKey}
              notice={notices.reply}
              exampleNote={EXAMPLE_NOTES.reply}
            />
            <DecisionPanel reply={reply} product={threadProduct} />
          </div>
        </section>

        <section id="notes" className={styles.section} aria-labelledby="notes-heading">
          <SectionHead titleId="notes-heading" title="Design choices" flush />
          <NoteGrid className={styles.notes} items={NOTES} />
        </section>
      </div>
    </DemoLayout>
  );
}

const NOTES = [
  {
    title: 'Judgements are typed, not prose',
    text: 'Fit is a 5-level score, acceptance a probability and the next move a 4-way choice. Code ranks and routes on the numbers; nothing parses an essay.',
  },
  {
    title: 'The model never sets a price',
    text: "The commission and sample count come from code inside the brand's limits, and every draft is checked again after it is written. A persuasive reply can't talk its way to 25%.",
  },
  {
    title: 'Cheap enough to run on every product',
    text: 'About 22 Jev calls (input tokens only, ~120 ms each) and three short LLM calls per creator thread; identical requests replay from cache for free.',
  },
  {
    title: 'Same code, three callers',
    text: 'The API routes, the example replay and the browser share one pipeline module, so what you see in preview is the logic that runs live.',
  },
];
