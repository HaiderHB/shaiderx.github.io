// Recorded live runs the page replays in preview mode (no key) and on load, one per suggested question.
// Recorded on the Vercel preview on 2026-11-17 with DeepSeek V3.2 (via fal) and Jev (jev-1.13.0), prompt
// version affirm-v2. Only the model outputs are kept: each round's tool calls (or the reply), Jev's
// answers and the hand-off note. Tool results, guardrail checks, the rules floor and the route are
// recomputed in the browser by agent.js, the same code the API runs. ms are the live timings.
export const EXAMPLE = {
  recordedOn: '2026-11-17',
  model: 'deepseek/deepseek-v3.2',
  runs: {
    date: {
      text: 'Can I move my payment date? I get paid on the 20th',
      rounds: [
        {
          toolCalls: [
            {
              id: 'call_a5a3d9dc51634da398983e9f',
              name: 'get_loans',
              args: {},
            },
          ],
          content:
            "I'll check your loans and see if moving your payment date to the 20th is possible.",
          ms: 1649,
          via: 'tool call',
        },
        {
          toolCalls: [
            {
              id: 'call_5c68b4a9396d4f4b823c4ebd',
              name: 'check_policy',
              args: {
                topic: 'due_date_change',
                loan_id: 'L-4471',
              },
            },
          ],
          content:
            "Now I'll check the policy for due date changes on your current loans.",
          ms: 4872,
          via: 'tool call',
        },
        {
          toolCalls: [
            {
              id: 'call_bb5ae34e7a8841a7940fdf6c',
              name: 'check_policy',
              args: {
                topic: 'due_date_change',
                loan_id: 'L-5108',
              },
            },
          ],
          content: '',
          ms: 2989,
          via: 'tool call',
        },
        {
          toolCalls: [
            {
              id: 'call_35f73c209f1a4f2a9c1ed471',
              name: 'propose_due_date_change',
              args: {
                loan_id: 'L-4471',
                new_day: 21,
              },
            },
          ],
          content:
            "I can propose moving your rowing machine loan (L-4471) to the 20th. Since you get paid on the 20th, I'll suggest moving it to the 21st or 22nd as recommended by policy.",
          ms: 3660,
          via: 'tool call',
        },
        {
          toolCalls: [],
          content:
            "I can move your rowing machine payment to the 21st, one day after your payday. Your laptop plan is fixed and can't be changed. The next payment would move from Dec 12 to Dec 21, still $120.00. This is ready to confirm in the chat.",
          ms: 3668,
        },
      ],
      answers: {
        handoff: {
          type: 'choice',
          choice: 'agent',
          confidence: 0.78,
          probabilities: {
            agent: 0.89,
            human: 0.11,
          },
        },
        queue: {
          type: 'choice',
          choice: 'payments',
          confidence: 1,
          probabilities: {
            payments: 1,
            disputes: 0,
            hardship: 0,
          },
        },
      },
      summary: null,
      ms: {
        decide: 78,
        total: 16923,
      },
    },
    twice: {
      text: 'I think I was charged twice for my laptop payment',
      rounds: [
        {
          toolCalls: [
            {
              id: '01a1eb4e0d6a495398f1ef727bbc2b3c',
              name: 'get_loans',
              args: {},
            },
          ],
          content:
            "I'll check your loans and payment schedule to see if there are any duplicate charges.\n\n",
          ms: 3700,
          via: 'tool call',
        },
        {
          toolCalls: [
            {
              id: 'call_2a6aad34e4be45dea64e105c',
              name: 'get_payment_schedule',
              args: {
                loan_id: 'L-5108',
              },
            },
          ],
          content:
            'Now let me check the payment schedule for your laptop loan (L-5108) to see all the charges.\n\n',
          ms: 3937,
          via: 'tool call',
        },
        {
          toolCalls: [
            {
              id: 'call_0d507c4841284b4faf8990a2',
              name: 'check_policy',
              args: {
                topic: 'duplicate_charge',
                loan_id: 'L-5108',
              },
            },
          ],
          content:
            'I can see there are indeed two charges for Payment 2 of 4 on November 10th - CH-88121 and CH-88122, both for $324.99. Let me check the policy for duplicate charges and then open a dispute for you.\n\n',
          ms: 5580,
          via: 'tool call',
        },
        {
          toolCalls: [
            {
              id: 'call_c5554514ffdf4e34a7d93bd8',
              name: 'open_payment_dispute',
              args: {
                loan_id: 'L-5108',
                charge_ids: ['CH-88121', 'CH-88122'],
                reason: 'Duplicate charge for Payment 2 of 4 on November 10th',
              },
            },
          ],
          content: "Now I'll open a dispute for the duplicate charges.\n\n",
          ms: 2895,
          via: 'tool call',
        },
        {
          toolCalls: [],
          content:
            "I found two charges for your laptop payment on November 10th. I've opened dispute D-37122 for the duplicate $324.99 charge. A disputes specialist will review it by November 24th and decide about a refund. Would you like me to connect you with the specialist directly?",
          ms: 2887,
        },
      ],
      answers: {
        handoff: {
          type: 'choice',
          choice: 'human',
          confidence: 1,
          probabilities: {
            agent: 0,
            human: 1,
          },
        },
        queue: {
          type: 'choice',
          choice: 'disputes',
          confidence: 1,
          probabilities: {
            payments: 0,
            disputes: 1,
            hardship: 0,
          },
        },
      },
      summary: {
        asked: 'The customer thinks they were charged twice for their laptop payment.',
        checked: [
          'Found 3 loans, 2 active (rowing machine, laptop).',
          'Laptop loan L-5108: 2 of 4 payments made, 3 charges total.',
          'Opened dispute D-37122 for $324.99 duplicate charge.',
          'Dispute review scheduled for completion by November 24th.',
        ],
        left: [
          'Connect customer to a disputes specialist.',
          'Specialist must review D-37122 by November 24th.',
        ],
        next_step: 'Connect the customer to a disputes specialist to discuss D-37122.',
        tone: 'calm',
      },
      ms: {
        decide: 121,
        summary: 5222,
        total: 24345,
      },
    },
    hardship: {
      text: 'I lost my job last week. What are my options?',
      rounds: [
        {
          toolCalls: [
            {
              id: 'call_553c48311d7644afb92a0322',
              name: 'hardship_options',
              args: {
                reason: 'lost my job last week',
              },
            },
          ],
          content:
            "I'm sorry to hear about your job loss. Let me check what hardship options are available for you.",
          ms: 8495,
          via: 'tool call',
        },
        {
          toolCalls: [],
          content:
            'I can connect you with a hardship specialist who can review your situation. They may offer options like pausing a payment for up to 30 days or spreading your balance over smaller payments. You have upcoming payments on November 24 and December 8 for your laptop, and December 12 for your rowing machine. Would you like me to connect you with a specialist?',
          ms: 5607,
        },
      ],
      answers: {
        handoff: {
          type: 'choice',
          choice: 'human',
          confidence: 1,
          probabilities: {
            agent: 0,
            human: 1,
          },
        },
        queue: {
          type: 'choice',
          choice: 'hardship',
          confidence: 1,
          probabilities: {
            payments: 0,
            disputes: 0,
            hardship: 1,
          },
        },
      },
      summary: {
        asked: 'The customer wants to know their options after losing their job.',
        checked: [
          'Found hardship options: pause payment or spread balance.',
          'Identified upcoming payments on November 24, December 8, and December 12.',
          'Needs a specialist for further assistance.',
        ],
        left: [
          'Connect customer with hardship specialist.',
          'Discuss specific hardship options.',
        ],
        next_step: 'Connect the customer with a hardship specialist.',
        tone: 'calm',
      },
      ms: {
        decide: 66,
        summary: 4814,
        total: 18986,
      },
    },
  },
};
