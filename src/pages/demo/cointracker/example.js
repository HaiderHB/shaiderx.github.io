// A recorded live run of the CoinTracker agent on the sample household (unedited figures), recorded
// 2026-11-19 through /api/demo/cointracker/run/ and /resume/. The page replays it so the preset is instant
// and works without the private link: the LLM's record and actions and the decision model's routes
// are the recorded outputs; the checks, the completeness list, the final routes (code's floor) and
// everything after run live in the browser on the same code as the API. Timings are the live ones.
// interest: the LLM's read of the sample 1099-INT at the handoff (/resume/). answers: the three
// suggested questions, answered live by /ask/ on this run.
export const EXAMPLE = {
  "recorded": "2026-11-19",
  "run": {
    "record": {
      "w2": {
        "employer": "Brightline Health",
        "wagesYtd": 168000,
        "federalWithheldYtd": 27300,
        "k401DeferralYtd": 14700,
        "k401PerPaycheck": 700,
        "payPeriodsPaid": 21,
        "payPeriodsYear": 24
      },
      "brokerage": {
        "proceeds": 48200,
        "costBasis": 38840,
        "shortTermGain": 1120,
        "longTermGain": 8240
      },
      "dividends": {
        "ordinary": 2310,
        "qualified": 1980,
        "capitalGainDistributions": 410
      },
      "crypto": {
        "realizedShortTerm": -1450,
        "realizedLongTerm": 6800,
        "lots": [
          {
            "lotId": "SOL-3",
            "asset": "SOL",
            "quantity": 40,
            "acquired": "2026-02-11",
            "costBasis": 9800,
            "marketValue": 5600
          },
          {
            "lotId": "BTC-1",
            "asset": "BTC",
            "quantity": 0.25,
            "acquired": "2023-06-02",
            "costBasis": 6650,
            "marketValue": 23400
          },
          {
            "lotId": "ETH-2",
            "asset": "ETH",
            "quantity": 3,
            "acquired": "2025-08-20",
            "costBasis": 6300,
            "marketValue": 9450
          }
        ]
      },
      "mortgage": {
        "mortgageInterest": 13650,
        "propertyTax": 5900
      }
    },
    "actions": [
      {
        "id": "a1",
        "type": "request_documents",
        "title": "Gather missing tax documents",
        "why": "Missing 1099-INT and rental expense summary.",
        "documents": [
          "int1099",
          "rental"
        ],
        "message": "Please provide the 1099-INT from Lakeside Bank and a summary of rental expenses for 412 Alder St."
      },
      {
        "id": "a2",
        "type": "harvest_loss",
        "title": "Sell SOL crypto lot",
        "why": "SOL-3 is worth $5,600, below its $9,800 cost basis.",
        "lotId": "SOL-3",
        "quantity": 40,
        "costBasis": 9800,
        "marketValue": 5600,
        "loss": 4200,
        "estimatedTaxSaved": 630,
        "upside": "Saves $630 in capital gains tax.",
        "tradeoff": "Locks in a $4,200 capital loss."
      },
      {
        "id": "a3",
        "type": "raise_401k",
        "title": "Increase 401(k) contributions",
        "why": "Maya has $14,700 deferred, with $24,500 limit.",
        "ytd": 14700,
        "currentPerPaycheck": 700,
        "perPaycheck": 2450,
        "paychecks": 3,
        "limit": 24500,
        "estimatedTaxSaved": 2156,
        "upside": "Saves $2,156 in income tax.",
        "tradeoff": "Reduces take-home pay by $7,350."
      },
      {
        "id": "a4",
        "type": "cpa_review",
        "title": "Classify rental roof expense",
        "why": "A $7,800 roof replacement may be an improvement.",
        "amount": 7800,
        "question": "Is the $7,800 roof replacement a repair or an improvement?",
        "options": [
          {
            "label": "Repair (deductible this year)",
            "effect": "Reduces 2026 rental income by $7,800, saving $1,716."
          },
          {
            "label": "Improvement (depreciated over 27.5 years)",
            "effect": "Adds ~$284 of annual depreciation, saving ~$62 in 2026."
          }
        ]
      }
    ],
    "decisions": {
      "a1": {
        "choice": "auto",
        "probabilities": {
          "auto": 1,
          "household": 0,
          "cpa": 0
        },
        "confidence": 1,
        "ms": 125
      },
      "a2": {
        "choice": "household",
        "probabilities": {
          "auto": 0,
          "household": 1,
          "cpa": 0
        },
        "confidence": 1,
        "ms": 176
      },
      "a3": {
        "choice": "household",
        "probabilities": {
          "auto": 0,
          "household": 1,
          "cpa": 0
        },
        "confidence": 1,
        "ms": 164
      },
      "a4": {
        "choice": "cpa",
        "probabilities": {
          "auto": 0.03,
          "household": 0.03,
          "cpa": 0.94
        },
        "confidence": 0.91,
        "ms": 181
      }
    },
    "timings": {
      "extract": 7843,
      "propose": 10033,
      "route": 184
    }
  },
  "interest": {
    "form": {
      "payer": "Lakeside Bank",
      "interest": 1912,
      "earlyWithdrawalPenalty": 0
    },
    "ms": 8351
  },
  "answers": {
    "What is still missing?": "Your file shows you are missing two items: a 1099-INT form for your bank interest and a summary of your rental property income and expenses. The intake notes mention $1,840 in interest from last year and a $7,800 roof replacement for the rental, but the current tax record does not include these figures.",
    "Why sell the SOL lot now?": "The SOL-3 lot is worth $5,600, which is below its $9,800 cost basis. Selling it now would realize a capital loss of $4,200. According to the file, this action could save an estimated $630 in capital gains tax. The trade-off is that it locks in the loss. This is a proposed action for your consideration; a CPA can advise if this fits your overall tax strategy.",
    "What does the CPA have to decide?": "Your CPA needs to decide how to classify the $7,800 roof replacement for your rental property. The intake notes show it may be considered a capital improvement rather than a simple repair, which affects how you deduct the expense. This is a judgement call for your CPA to make based on tax rules."
  }
};
