// Negotiating playbooks: the positions in-house counsel takes on a vendor's SaaS paper.
// Each rule has a short id the model must cite on every change, so a reviewer can see which
// position a redline enforces. We always act for the Customer (Northgate) here.

export const PLAYBOOKS = [
  {
    id: 'standard',
    label: 'Customer-side SaaS',
    short: 'Customer SaaS',
    hint: 'Our standard positions when buying software',
    side: 'Customer (we are buying the SaaS product)',
    rules: [
      {
        id: 'R1',
        topic: 'Liability cap',
        rule: 'Liability caps must be mutual and at least the Fees paid or payable in the 12 months before the claim.',
      },
      {
        id: 'R2',
        topic: 'Confidentiality',
        rule: 'Confidentiality obligations must be mutual: both parties protect each other’s information.',
      },
      {
        id: 'R3',
        topic: 'Governing law',
        rule: 'Delaware law and Delaware courts.',
      },
      {
        id: 'R4',
        topic: 'Renewal',
        rule: 'No auto-renewal term longer than 12 months; non-renewal notice of no more than 30 days.',
      },
      {
        id: 'R5',
        topic: 'Termination',
        rule: 'Customer may terminate for convenience on 30 days’ written notice, with a pro-rata refund of prepaid Fees.',
      },
      {
        id: 'R6',
        topic: 'Price increases',
        rule: 'Renewal price increases are capped at 5%.',
      },
      {
        id: 'R7',
        topic: 'Customer data',
        rule: 'Provider may use Customer Data only to provide the Services, and deletes it within 30 days after termination.',
      },
    ],
  },
  {
    id: 'enterprise',
    label: 'Enterprise, strict',
    short: 'Enterprise',
    hint: 'High-value deal touching sensitive data',
    side: 'Customer (we are buying the SaaS product)',
    rules: [
      {
        id: 'E1',
        topic: 'Liability cap',
        rule: 'Mutual cap of at least 24 months of Fees; breaches of confidentiality or data security and indemnity obligations are uncapped.',
      },
      {
        id: 'E2',
        topic: 'Confidentiality',
        rule: 'Mutual confidentiality, surviving 5 years after the Agreement ends.',
      },
      {
        id: 'E3',
        topic: 'Security',
        rule: 'Provider maintains SOC 2 Type II controls and notifies Customer of any security breach within 72 hours.',
      },
      {
        id: 'E4',
        topic: 'IP indemnity',
        rule: 'Provider defends and indemnifies Customer against third-party IP infringement claims about the Services.',
      },
      {
        id: 'E5',
        topic: 'Renewal',
        rule: 'No automatic renewal: renewals only by mutual written agreement.',
      },
      {
        id: 'E6',
        topic: 'Termination',
        rule: 'Customer may terminate for convenience on 30 days’ notice with a pro-rata refund.',
      },
      {
        id: 'E7',
        topic: 'Publicity and assignment',
        rule: 'No use of Customer’s name without written consent; assignment needs the other party’s consent except in a merger or sale.',
      },
      {
        id: 'E8',
        topic: 'Governing law',
        rule: 'Delaware law and Delaware courts.',
      },
    ],
  },
  {
    id: 'light',
    label: 'Light touch',
    short: 'Light touch',
    hint: 'Low-value tool: fix only the must-haves',
    side: 'Customer (we are buying the SaaS product)',
    rules: [
      {
        id: 'L1',
        topic: 'Liability cap',
        rule: 'Liability caps must be mutual and at least 12 months of Fees.',
      },
      {
        id: 'L2',
        topic: 'Customer data',
        rule: 'Provider may use Customer Data only to provide the Services.',
      },
      {
        id: 'L3',
        topic: 'Renewal',
        rule: 'Renewal terms of 12 months or less.',
      },
    ],
    note: 'Accept everything else as drafted.',
  },
];

export const playbookById = id => PLAYBOOKS.find(playbook => playbook.id === id);

/** The house rule a visitor can add: one extra line, id H1. */
export const HOUSE_RULE_ID = 'H1';
export const HOUSE_RULE_MAX = 160;

/** The rules a review runs with: the preset plus the optional house rule. */
export function rulesFor(playbook, houseRule) {
  const extra = String(houseRule || '').trim();
  return extra
    ? [...playbook.rules, { id: HOUSE_RULE_ID, topic: 'House rule', rule: extra }]
    : playbook.rules;
}
