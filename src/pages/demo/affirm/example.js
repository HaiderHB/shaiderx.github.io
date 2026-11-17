// Recorded live runs the page replays in preview mode (no key) and on load, one per suggested question.
// Recorded on the Vercel preview on 2026-11-17 with DeepSeek V3.2 (via fal) and Jev (jev-1.13.0), prompt
// version affirm-v3. Only the model outputs are kept: each round's tool calls (or the reply), Jev's
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
              id: 'call_d47347f822044676836fe083',
              name: 'get_loans',
              args: {},
            },
          ],
          content:
            "I'll check your loans and see if you can move your payment date to the 20th.",
          ms: 2204,
          via: 'tool call',
        },
        {
          toolCalls: [
            {
              id: '01a1eb52d177e2f6ca767aa791a986ad',
              name: 'check_policy',
              args: {
                topic: 'due_date_change',
                loan_id: 'L-4471',
              },
            },
          ],
          content:
            'I can see you have two current loans. Let me check the policy for due date changes and then see if you can move your rowing machine loan (L-4471) to the 20th.\n\n',
          ms: 6199,
          via: 'tool call',
        },
        {
          toolCalls: [
            {
              id: '01a1eb54cb6126276b1ae235bf373f80',
              name: 'propose_due_date_change',
              args: {
                loan_id: 'L-4471',
                new_day: 21,
              },
            },
          ],
          content:
            "Great! You're eligible to change your due date. Since you get paid on the 20th, I'll suggest moving it to the 21st or 22nd as recommended by policy. Let me propose moving it to the 21st.\n\n",
          ms: 7045,
          via: 'tool call',
        },
        {
          toolCalls: [],
          content:
            'You can move your rowing machine payment from the 12th to the 21st, one day after your payday. Your next $120 payment would move from Dec 12 to Dec 21. The change is ready to confirm with the button in chat.',
          ms: 4991,
        },
      ],
      answers: {
        handoff: {
          type: 'choice',
          choice: 'agent',
          confidence: 0.86,
          probabilities: {
            agent: 0.93,
            human: 0.07,
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
        decide: 95,
        total: 20540,
      },
    },
    twice: {
      text: 'I think I was charged twice for my laptop payment',
      rounds: [
        {
          toolCalls: [
            {
              id: 'call_aad31b97d6e242ee81a77fe5',
              name: 'get_loans',
              args: {},
            },
          ],
          content:
            "I'll help you check your laptop loan payments for any duplicate charges. Let me first look at your loans and then examine the payment schedule.",
          ms: 5700,
          via: 'tool call',
        },
        {
          toolCalls: [
            {
              id: 'call_e0aa63836ddc4073a9398cad',
              name: 'get_payment_schedule',
              args: {
                loan_id: 'L-5108',
              },
            },
          ],
          content:
            'Now let me check the payment schedule for your laptop loan (L-5108) to see all charges made.',
          ms: 3324,
          via: 'tool call',
        },
        {
          toolCalls: [
            {
              id: 'call_c69a6a10c6a04c269a94d6b6',
              name: 'open_payment_dispute',
              args: {
                loan_id: 'L-5108',
                charge_ids: ['CH-88122'],
                reason: 'Duplicate charge for laptop payment on Nov 10',
              },
            },
          ],
          content:
            'I can see there are indeed two posted charges on November 10, 2026, for the same amount ($324.99) for "Payment 2 of 4" - CH-88121 and CH-88122. This appears to be a duplicate charge. Let me open a payment dispute for you.',
          ms: 6531,
          via: 'tool call',
        },
        {
          toolCalls: [],
          content:
            "I found a duplicate charge for your laptop payment on Nov 10. I've opened dispute D-37122 for $324.99, which a specialist will review by Nov 24. They'll decide about a refund, and I can't promise one.",
          ms: 3530,
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
        asked: 'The customer thinks she was charged twice for her laptop payment.',
        checked: [
          'Found 3 loans, 2 active (rowing machine, laptop).',
          'Laptop loan L-5108: 2 of 4 payments made, 3 charges with 2 on Nov 10.',
          'Opened dispute D-37122 for $324.99, review by Nov 24.',
        ],
        left: ['Dispute D-37122 needs specialist review.', 'Refund decision pending.'],
        next_step: 'Review the details of dispute D-37122 for the duplicate charge.',
        tone: 'calm',
      },
      ms: {
        decide: 112,
        summary: 7330,
        total: 26530,
      },
    },
    hardship: {
      text: 'I lost my job last week. What are my options?',
      rounds: [
        {
          toolCalls: [
            {
              id: 'call_28bffeebc4714ce6b8498e43',
              name: 'get_loans',
              args: {},
            },
            {
              id: 'call_522542dfa4574032a9009424',
              name: 'hardship_options',
              args: {
                reason: 'lost my job last week',
              },
            },
          ],
          content:
            "I'm sorry to hear about your job loss. Let me check your current loans and hardship options for you.",
          ms: 3036,
          via: 'tool call',
        },
        {
          toolCalls: [],
          content:
            'I see you have two current loans with upcoming payments. For job loss, you have hardship options including pausing a payment for up to 30 days or spreading the balance over more payments. These require a specialist review. You also have a self-serve option to move the due date for your rowing machine loan if eligible. Would you like me to connect you with a hardship specialist who can review your situation and discuss these options?',
          ms: 3927,
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
          'Found 2 active loans: rowing machine and laptop.',
          'Identified hardship options requiring specialist review.',
          'Noted 3 payments due in the next 30 days.',
        ],
        left: [
          'Specialist must review hardship request.',
          'Customer needs to discuss specific options.',
        ],
        next_step: "Review the customer's loans and discuss hardship options.",
        tone: 'calm',
      },
      ms: {
        decide: 80,
        summary: 4559,
        total: 11607,
      },
    },
  },
};
