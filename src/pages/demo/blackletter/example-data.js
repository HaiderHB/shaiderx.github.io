// A complete run recorded live from the routes (review of two documents, five lawyer decisions,
// then the re-run of all five documents with harness v1 and v2). Shown in preview mode and until
// the first live action. Not edited by hand: regenerate by recording the routes again.
export const EXAMPLE_DATA = {
  "recorded": "21 Nov 2026",
  "doc": "seed",
  "runs": {
    "seed": {
      "status": "done",
      "flags": [
        {
          "rule": "POOL",
          "quote": "including an unallocated option pool equal to 10% of the post-closing fully diluted capitalization",
          "issue": "The option pool is included in the pre-money valuation.",
          "redline": "excluding any unallocated option pool.",
          "id": "seed:POOL:1",
          "doc": "seed",
          "clause": "1",
          "start": 134,
          "end": 232,
          "exact": true,
          "severity": "medium"
        },
        {
          "rule": "PR",
          "quote": "Each Investor, regardless of the size of its investment, will have the right",
          "issue": "Pro-rata rights are granted to all investors without a threshold.",
          "redline": "Each Major Investor (holding at least 5% of the Series Seed Preferred Shares) will have the right",
          "id": "seed:PR:5",
          "doc": "seed",
          "clause": "5",
          "start": 0,
          "end": 76,
          "exact": true,
          "severity": "medium"
        },
        {
          "rule": "FEES",
          "quote": "up to a maximum of US$75,000, whether or not the financing closes",
          "issue": "The company pays investor legal fees up to US$75,000.",
          "redline": "up to a maximum of US$30,000, only if the financing closes.",
          "id": "seed:FEES:7",
          "doc": "seed",
          "clause": "7",
          "start": 93,
          "end": 158,
          "exact": true,
          "severity": "low"
        },
        {
          "rule": "NS",
          "quote": "For 60 days from the date this term sheet is signed",
          "issue": "The exclusivity period is 60 days.",
          "redline": "For 45 days from the date this term sheet is signed,",
          "id": "seed:NS:8",
          "doc": "seed",
          "clause": "8",
          "start": 0,
          "end": 51,
          "exact": true,
          "severity": "medium"
        }
      ],
      "dropped": [],
      "cleared": [
        {
          "doc": "seed",
          "rule": "LP",
          "clause": "2",
          "finding": "The liquidation preference is a non-participating 1x return."
        },
        {
          "doc": "seed",
          "rule": "AD",
          "clause": "3",
          "finding": "Anti-dilution uses a broad-based weighted average adjustment."
        },
        {
          "doc": "seed",
          "rule": "BD",
          "clause": "4",
          "finding": "Investors elect one of three board directors."
        }
      ],
      "confidence": {
        "seed:POOL:1": {
          "choice": "breach",
          "probabilities": {
            "breach": 0.79,
            "unclear": 0.01,
            "fine": 0.2
          },
          "ms": 132
        },
        "seed:PR:5": {
          "choice": "breach",
          "probabilities": {
            "breach": 0.93,
            "unclear": 0,
            "fine": 0.07
          },
          "ms": 70
        },
        "seed:FEES:7": {
          "choice": "breach",
          "probabilities": {
            "breach": 0.91,
            "unclear": 0.02,
            "fine": 0.07
          },
          "ms": 63
        },
        "seed:NS:8": {
          "choice": "breach",
          "probabilities": {
            "breach": 1,
            "unclear": 0,
            "fine": 0
          },
          "ms": 82
        }
      },
      "ms": 6574
    },
    "offer-exec": {
      "status": "done",
      "flags": [
        {
          "rule": "IP",
          "quote": "all inventions and works that you create in the course of your employment or that relate to the Company's business",
          "issue": "The clause assigns all inventions created during employment or related to the business.",
          "redline": "all inventions and works that you create in the course of your employment",
          "id": "offer-exec:IP:3",
          "doc": "offer-exec",
          "clause": "3",
          "start": 26,
          "end": 140,
          "exact": true,
          "severity": "medium"
        },
        {
          "rule": "NC",
          "quote": "For 12 months after your employment ends, you will not act as an executive of a business in Canada that competes directly with the Company",
          "issue": "The clause imposes a 12-month non-compete on executives in Canada.",
          "redline": "For 12 months after your employment ends, you will not act as an executive of a business in the Province of Ontario that competes directly with the Company",
          "id": "offer-exec:NC:4",
          "doc": "offer-exec",
          "clause": "4",
          "start": 0,
          "end": 138,
          "exact": true,
          "severity": "high"
        }
      ],
      "dropped": [],
      "cleared": [
        {
          "doc": "offer-exec",
          "rule": "TERM",
          "clause": "5",
          "finding": "The clause provides the greater of six months' notice or statutory minimums."
        }
      ],
      "confidence": {
        "offer-exec:IP:3": {
          "choice": "breach",
          "probabilities": {
            "breach": 0.89,
            "unclear": 0,
            "fine": 0.11
          },
          "ms": 92
        },
        "offer-exec:NC:4": {
          "choice": "breach",
          "probabilities": {
            "breach": 0.43,
            "unclear": 0.38,
            "fine": 0.19
          },
          "ms": 94
        }
      },
      "ms": 4714
    }
  },
  "feedback": {
    "seed:POOL:1": {
      "id": "seed:POOL:1",
      "doc": "seed",
      "rule": "POOL",
      "clause": "1",
      "quote": "including an unallocated option pool equal to 10% of the post-closing fully diluted capitalization",
      "reason": "A 10% pool in the pre-money is market at seed. Flag only above 15%.",
      "redline": "excluding any unallocated option pool.",
      "edited": false,
      "verdict": "reject"
    },
    "seed:NS:8": {
      "id": "seed:NS:8",
      "doc": "seed",
      "rule": "NS",
      "clause": "8",
      "quote": "For 60 days from the date this term sheet is signed",
      "reason": "",
      "redline": "For 30 days from the date this term sheet is signed (or, if earlier, until the Lead Investor stops working toward closing)",
      "edited": true,
      "verdict": "accept"
    },
    "seed:PR:5": {
      "id": "seed:PR:5",
      "doc": "seed",
      "rule": "PR",
      "clause": "5",
      "quote": "Each Investor, regardless of the size of its investment, will have the right",
      "reason": "",
      "redline": "Each Major Investor (holding at least 5% of the Series Seed Preferred Shares) will have the right",
      "edited": false,
      "verdict": "accept"
    },
    "offer-exec:NC:4": {
      "id": "offer-exec:NC:4",
      "doc": "offer-exec",
      "rule": "NC",
      "clause": "4",
      "quote": "For 12 months after your employment ends, you will not act as an executive of a business in Canada that competes directly with the Company",
      "reason": "Ontario exempts C-suite executives from the non-compete ban. Do not flag for executive officers.",
      "redline": "For 12 months after your employment ends, you will not act as an executive of a business in the Province of Ontario that competes directly with the Company",
      "edited": false,
      "verdict": "reject"
    },
    "offer-exec:IP:3": {
      "id": "offer-exec:IP:3",
      "doc": "offer-exec",
      "rule": "IP",
      "clause": "3",
      "quote": "all inventions and works that you create in the course of your employment or that relate to the Company's business",
      "reason": "Limited to work in the course of employment or the business: that is our standard.",
      "redline": "all inventions and works that you create in the course of your employment",
      "edited": false,
      "verdict": "reject"
    }
  },
  "learn": {
    "status": "done",
    "kind": "example",
    "v1": {
      "seed": {
        "flags": [
          {
            "rule": "POOL",
            "quote": "including an unallocated option pool equal to 10% of the post-closing fully diluted capitalization",
            "issue": "The option pool is included in the pre-money valuation.",
            "redline": "excluding any unallocated option pool.",
            "id": "seed:POOL:1",
            "doc": "seed",
            "clause": "1",
            "start": 134,
            "end": 232,
            "exact": true,
            "severity": "medium"
          },
          {
            "rule": "PR",
            "quote": "Each Investor, regardless of the size of its investment, will have the right",
            "issue": "Pro-rata rights are granted to all investors without a threshold.",
            "redline": "Each Major Investor (holding at least 5% of the Series Seed Preferred Shares) will have the right",
            "id": "seed:PR:5",
            "doc": "seed",
            "clause": "5",
            "start": 0,
            "end": 76,
            "exact": true,
            "severity": "medium"
          },
          {
            "rule": "FEES",
            "quote": "up to a maximum of US$75,000, whether or not the financing closes",
            "issue": "The company pays investor legal fees up to US$75,000.",
            "redline": "up to a maximum of US$30,000, only if the financing closes.",
            "id": "seed:FEES:7",
            "doc": "seed",
            "clause": "7",
            "start": 93,
            "end": 158,
            "exact": true,
            "severity": "low"
          },
          {
            "rule": "NS",
            "quote": "For 60 days from the date this term sheet is signed",
            "issue": "The exclusivity period is 60 days.",
            "redline": "For 45 days from the date this term sheet is signed,",
            "id": "seed:NS:8",
            "doc": "seed",
            "clause": "8",
            "start": 0,
            "end": 51,
            "exact": true,
            "severity": "medium"
          }
        ],
        "dropped": [],
        "cleared": [
          {
            "doc": "seed",
            "rule": "LP",
            "clause": "2",
            "finding": "The liquidation preference is a non-participating 1x return."
          },
          {
            "doc": "seed",
            "rule": "AD",
            "clause": "3",
            "finding": "Anti-dilution uses a broad-based weighted average adjustment."
          },
          {
            "doc": "seed",
            "rule": "BD",
            "clause": "4",
            "finding": "Investors elect one of three board directors."
          }
        ]
      },
      "series-a": {
        "flags": [
          {
            "rule": "POOL",
            "quote": "pre-money valuation of US$36,000,000, including an unallocated option pool",
            "issue": "The option pool is counted in the pre-money valuation, which dilutes founders.",
            "redline": "pre-money valuation of US$36,000,000, excluding any unallocated option pool",
            "id": "series-a:POOL:1",
            "doc": "series-a",
            "clause": "1",
            "start": 93,
            "end": 167,
            "exact": true,
            "severity": "medium"
          },
          {
            "rule": "LP",
            "quote": "first receive 2x the original purchase price plus accrued dividends",
            "issue": "The liquidation preference returns twice the investment amount before participation.",
            "redline": "first receive 1x the original purchase price plus accrued dividends",
            "id": "series-a:LP:2",
            "doc": "series-a",
            "clause": "2",
            "start": 83,
            "end": 150,
            "exact": true,
            "severity": "high"
          }
        ],
        "dropped": [
          {
            "rule": "BD",
            "quote": "three appointed by the Lead Investor, one independent director chosen by the Lead Investor",
            "issue": "Investors appoint three of five directors and also choose the independent director.",
            "redline": "two appointed by the Lead Investor, one independent director mutually agreed by the board",
            "doc": "series-a",
            "reason": "Quote not found in the document"
          }
        ],
        "cleared": [
          {
            "doc": "series-a",
            "rule": "AD",
            "clause": "3",
            "finding": "The clause provides broad-based weighted average anti-dilution protection."
          },
          {
            "doc": "series-a",
            "rule": "PR",
            "clause": "5",
            "finding": "Pro-rata rights are granted only to Major Investors meeting a share threshold."
          },
          {
            "doc": "series-a",
            "rule": "FEES",
            "clause": "6",
            "finding": "The company reimburses investor legal fees up to US$25,000."
          },
          {
            "doc": "series-a",
            "rule": "NS",
            "clause": "7",
            "finding": "The exclusivity period is 30 days, which is within the 45-day limit."
          }
        ]
      },
      "safe-letter": {
        "flags": [
          {
            "rule": "MFN",
            "quote": "If the Company issues any SAFE or convertible security with terms more favourable",
            "issue": "The clause gives the investor a most-favoured-nation right for SAFE terms.",
            "redline": "Delete clause 2 in its entirety.",
            "id": "safe-letter:MFN:2",
            "doc": "safe-letter",
            "clause": "2",
            "start": 0,
            "end": 81,
            "exact": true,
            "severity": "medium"
          },
          {
            "rule": "PR",
            "quote": "The Investor will have the right to purchase its pro rata share",
            "issue": "The clause grants pro-rata rights without a Major Investor threshold.",
            "redline": "The Major Investor will have the right to purchase its pro rata share",
            "id": "safe-letter:PR:3",
            "doc": "safe-letter",
            "clause": "3",
            "start": 0,
            "end": 63,
            "exact": true,
            "severity": "medium"
          }
        ],
        "dropped": [],
        "cleared": [
          {
            "doc": "safe-letter",
            "rule": "FEES",
            "clause": "6",
            "finding": "Each party bears its own legal fees, so the company pays none."
          }
        ]
      },
      "offer-dev": {
        "flags": [
          {
            "rule": "IP",
            "quote": "all inventions, works and ideas that you create during your employment, whether or not created during working hours, using Company resources or related to the Company's business",
            "issue": "The clause assigns all inventions created during employment, regardless of relation to the Company's business.",
            "redline": "all inventions, works and ideas that you create during your employment that relate to the Company's business or result from the use of Company resources.",
            "id": "offer-dev:IP:3",
            "doc": "offer-dev",
            "clause": "3",
            "start": 26,
            "end": 203,
            "exact": true,
            "severity": "medium"
          },
          {
            "rule": "NC",
            "quote": "For 12 months after your employment ends, you will not work for or hold an interest in any business in Canada that competes with the Company",
            "issue": "The clause imposes a 12-month non-compete restriction across Canada.",
            "redline": "For 12 months after your employment ends, you will not work for or hold an interest in any business in the Province of Ontario that competes with the Company.",
            "id": "offer-dev:NC:5",
            "doc": "offer-dev",
            "clause": "5",
            "start": 0,
            "end": 140,
            "exact": true,
            "severity": "high"
          },
          {
            "rule": "TERM",
            "quote": "by providing two weeks' notice or pay in lieu of notice, which you agree is your full entitlement",
            "issue": "The clause provides only two weeks' notice or pay in lieu for termination without cause.",
            "redline": "by providing notice or pay in lieu of notice in accordance with the minimum requirements of the Employment Standards Act, 2000 (Ontario).",
            "id": "offer-dev:TERM:7",
            "doc": "offer-dev",
            "clause": "7",
            "start": 68,
            "end": 165,
            "exact": true,
            "severity": "high"
          }
        ],
        "dropped": [],
        "cleared": []
      },
      "offer-exec": {
        "flags": [
          {
            "rule": "IP",
            "quote": "all inventions and works that you create in the course of your employment or that relate to the Company's business",
            "issue": "The clause assigns all inventions created during employment or related to the business.",
            "redline": "all inventions and works that you create in the course of your employment",
            "id": "offer-exec:IP:3",
            "doc": "offer-exec",
            "clause": "3",
            "start": 26,
            "end": 140,
            "exact": true,
            "severity": "medium"
          },
          {
            "rule": "NC",
            "quote": "For 12 months after your employment ends, you will not act as an executive of a business in Canada that competes directly with the Company",
            "issue": "The clause imposes a 12-month non-compete on executives in Canada.",
            "redline": "For 12 months after your employment ends, you will not act as an executive of a business in the Province of Ontario that competes directly with the Company",
            "id": "offer-exec:NC:4",
            "doc": "offer-exec",
            "clause": "4",
            "start": 0,
            "end": 138,
            "exact": true,
            "severity": "high"
          }
        ],
        "dropped": [],
        "cleared": [
          {
            "doc": "offer-exec",
            "rule": "TERM",
            "clause": "5",
            "finding": "The clause provides the greater of six months' notice or statutory minimums."
          }
        ]
      }
    },
    "v2": {
      "safe-letter": {
        "flags": [
          {
            "rule": "MFN",
            "quote": "If the Company issues any SAFE or convertible security with terms more favourable to its holder than the SAFE, the Company will promptly notify the Investor and, at the Investor's election, amend the SAFE to include those terms",
            "issue": "The clause gives the investor most-favoured-nation rights for SAFE terms.",
            "redline": "Delete clause 2 in its entirety.",
            "id": "safe-letter:MFN:2",
            "doc": "safe-letter",
            "clause": "2",
            "start": 0,
            "end": 227,
            "exact": true,
            "severity": "medium"
          },
          {
            "rule": "PR",
            "quote": "The Investor will have the right to purchase its pro rata share of securities sold in the Company's next equity financing and in every later equity financing",
            "issue": "The clause grants pro-rata rights without a Major Investor threshold.",
            "redline": "Each Major Investor (holding at least 5% of the Series Seed Preferred Shares) will have the right to purchase its pro rata share of securities sold in the Company's next equity financing and in every later equity financing.",
            "id": "safe-letter:PR:3",
            "doc": "safe-letter",
            "clause": "3",
            "start": 0,
            "end": 157,
            "exact": true,
            "severity": "medium"
          }
        ],
        "dropped": [],
        "cleared": [
          {
            "doc": "safe-letter",
            "rule": "FEES",
            "clause": "6",
            "finding": "Each party bears its own legal fees, so company does not pay investor fees."
          }
        ]
      },
      "seed": {
        "flags": [
          {
            "rule": "PR",
            "quote": "Each Investor, regardless of the size of its investment, will have the right",
            "issue": "Pro-rata rights are granted to each investor without a threshold.",
            "redline": "Each Major Investor (holding at least 5% of the Series Seed Preferred Shares) will have the right",
            "id": "seed:PR:5",
            "doc": "seed",
            "clause": "5",
            "start": 0,
            "end": 76,
            "exact": true,
            "severity": "medium"
          },
          {
            "rule": "FEES",
            "quote": "up to a maximum of US$75,000, whether or not the financing closes",
            "issue": "The company pays investor legal fees up to US$75,000.",
            "redline": "up to a maximum of US$30,000, only if the financing closes",
            "id": "seed:FEES:7",
            "doc": "seed",
            "clause": "7",
            "start": 93,
            "end": 158,
            "exact": true,
            "severity": "low"
          },
          {
            "rule": "NS",
            "quote": "For 60 days from the date this term sheet is signed",
            "issue": "The exclusivity period is 60 days from signing.",
            "redline": "For 30 days from the date this term sheet is signed (or, if earlier, until the Lead Investor stops working toward closing)",
            "id": "seed:NS:8",
            "doc": "seed",
            "clause": "8",
            "start": 0,
            "end": 51,
            "exact": true,
            "severity": "medium"
          }
        ],
        "dropped": [],
        "cleared": [
          {
            "doc": "seed",
            "rule": "POOL",
            "clause": "1",
            "finding": "The option pool is 10% of post-closing fully diluted capitalization."
          },
          {
            "doc": "seed",
            "rule": "LP",
            "clause": "2",
            "finding": "The liquidation preference is 1x non-participating."
          },
          {
            "doc": "seed",
            "rule": "AD",
            "clause": "3",
            "finding": "Anti-dilution uses broad-based weighted average adjustment."
          }
        ]
      },
      "series-a": {
        "flags": [
          {
            "rule": "POOL",
            "quote": "including an unallocated option pool equal to 20% of the post-closing fully diluted capitalization",
            "issue": "The option pool is 20% of post-closing fully diluted capitalization.",
            "redline": "including an unallocated option pool equal to 10% of the post-closing fully diluted capitalization",
            "id": "series-a:POOL:1",
            "doc": "series-a",
            "clause": "1",
            "start": 131,
            "end": 229,
            "exact": true,
            "severity": "medium"
          },
          {
            "rule": "LP",
            "quote": "first receive 2x the original purchase price plus accrued dividends",
            "issue": "The liquidation preference returns 2x the purchase price plus dividends.",
            "redline": "first receive 1x the original purchase price plus accrued dividends",
            "id": "series-a:LP:2",
            "doc": "series-a",
            "clause": "2",
            "start": 83,
            "end": 150,
            "exact": true,
            "severity": "high"
          },
          {
            "rule": "BD",
            "quote": "three appointed by the Lead Investor, one elected by the holders of Common Shares and one independent director chosen by the Lead Investor",
            "issue": "The Lead Investor appoints three directors and chooses the independent director.",
            "redline": "two appointed by the Lead Investor, two elected by the holders of Common Shares and one independent director chosen by mutual agreement",
            "id": "series-a:BD:4",
            "doc": "series-a",
            "clause": "4",
            "start": 36,
            "end": 174,
            "exact": true,
            "severity": "high"
          }
        ],
        "dropped": [],
        "cleared": [
          {
            "doc": "series-a",
            "rule": "AD",
            "clause": "3",
            "finding": "The anti-dilution uses a broad-based weighted average formula."
          },
          {
            "doc": "series-a",
            "rule": "PR",
            "clause": "5",
            "finding": "Pro-rata rights are granted only to Major Investors holding at least 500,000 shares."
          },
          {
            "doc": "series-a",
            "rule": "FEES",
            "clause": "6",
            "finding": "The company reimburses legal fees up to US$25,000."
          },
          {
            "doc": "series-a",
            "rule": "NS",
            "clause": "7",
            "finding": "The exclusivity period is 30 days from signing."
          }
        ]
      },
      "offer-exec": {
        "flags": [],
        "dropped": [],
        "cleared": [
          {
            "doc": "offer-exec",
            "rule": "IP",
            "clause": "3",
            "finding": "The clause assigns inventions created in the course of employment or relating to the business."
          },
          {
            "doc": "offer-exec",
            "rule": "NC",
            "clause": "4",
            "finding": "The clause imposes a non-compete on an executive officer after employment."
          },
          {
            "doc": "offer-exec",
            "rule": "TERM",
            "clause": "5",
            "finding": "The clause provides the greater of six months' notice or statutory minimums."
          }
        ]
      },
      "offer-dev": {
        "flags": [
          {
            "rule": "IP",
            "quote": "all inventions, works and ideas that you create during your employment, whether or not created during working hours",
            "issue": "The clause assigns inventions created outside working hours and unrelated to the business.",
            "redline": "all inventions, works and ideas that you create in the course of your employment or that relate to the Company's business",
            "id": "offer-dev:IP:3",
            "doc": "offer-dev",
            "clause": "3",
            "start": 26,
            "end": 141,
            "exact": true,
            "severity": "medium"
          },
          {
            "rule": "NC",
            "quote": "you will not work for or hold an interest in any business in Canada that competes with the Company",
            "issue": "The clause imposes a 12-month non-compete on an Ontario employee.",
            "redline": "you will not act as an executive of a business in Canada that competes directly with the Company",
            "id": "offer-dev:NC:5",
            "doc": "offer-dev",
            "clause": "5",
            "start": 42,
            "end": 140,
            "exact": true,
            "severity": "high"
          },
          {
            "rule": "TERM",
            "quote": "by providing two weeks' notice or pay in lieu of notice",
            "issue": "The clause provides only two weeks' notice for termination without cause.",
            "redline": "by providing notice or pay in lieu of notice in accordance with the minimums set by the Employment Standards Act, 2000",
            "id": "offer-dev:TERM:7",
            "doc": "offer-dev",
            "clause": "7",
            "start": 68,
            "end": 123,
            "exact": true,
            "severity": "high"
          }
        ],
        "dropped": [],
        "cleared": []
      }
    },
    "harness": {
      "version": 2,
      "clarifications": {
        "POOL": [
          "Flag only an option pool counted in the pre-money valuation if it exceeds 15% of the post-closing fully diluted capitalization."
        ],
        "NC": [
          "Do not flag post-employment non-compete restrictions for executive officers."
        ],
        "IP": [
          "Do not flag an invention assignment clause limited to work created in the course of employment or relating to the company's business."
        ]
      },
      "examples": [
        {
          "verdict": "reject",
          "rule": "POOL",
          "doc": "seed",
          "quote": "including an unallocated option pool equal to 10% of the post-closing fully diluted capitalization",
          "reason": "A 10% pool in the pre-money is market at seed. Flag only above 15%."
        },
        {
          "verdict": "accept",
          "rule": "NS",
          "doc": "seed",
          "quote": "For 60 days from the date this term sheet is signed",
          "redline": "For 30 days from the date this term sheet is signed (or, if earlier, until the Lead Investor stops working toward closing)",
          "edited": true
        },
        {
          "verdict": "accept",
          "rule": "PR",
          "doc": "seed",
          "quote": "Each Investor, regardless of the size of its investment, will have the right",
          "redline": "Each Major Investor (holding at least 5% of the Series Seed Preferred Shares) will have the right",
          "edited": false
        },
        {
          "verdict": "reject",
          "rule": "NC",
          "doc": "offer-exec",
          "quote": "For 12 months after your employment ends, you will not act as an executive of a business in Canada that competes directly with the Company",
          "reason": "Ontario exempts C-suite executives from the non-compete ban. Do not flag for executive officers."
        },
        {
          "verdict": "reject",
          "rule": "IP",
          "doc": "offer-exec",
          "quote": "all inventions and works that you create in the course of your employment or that relate to the Company's business",
          "reason": "Limited to work in the course of employment or the business: that is our standard."
        }
      ]
    },
    "written": [
      "POOL",
      "NC",
      "IP"
    ],
    "ms": 24290
  }
};
