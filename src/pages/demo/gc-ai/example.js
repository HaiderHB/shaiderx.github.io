// Recorded live reviews, one per playbook, replayed in preview mode (no demo key) and on page
// load. Each is the exact NDJSON event stream the review route sent during a live run on the
// Vercel preview (recorded 2026-11-16): DeepSeek's edits, the anchoring results computed by code,
// and Jev's decisions with their timings. The page replays them faster (`speed`) and says so.
// Regenerate by streaming POST /api/demo/gc-ai/review/ with a key and converting the output.
/* eslint-disable */
export const EXAMPLES = {
  "standard": {
    "model": "deepseek/deepseek-v3.2",
    "recorded": "2026-11-16",
    "totalMs": 22896,
    "speed": 2,
    "events": [
      {
        "t": "scan",
        "c": 3,
        "at": 1086
      },
      {
        "t": "edit",
        "id": "C1",
        "c": 3,
        "quote": "at its sole discretion",
        "insert": "by no more than five percent (5%)",
        "rule": "R6",
        "why": "Renewal price increases are capped at 5%.",
        "anchor": {
          "status": "anchored",
          "clause": 3,
          "start": 259,
          "end": 281,
          "original": "at its sole discretion",
          "note": "Exact, unique match."
        },
        "at": 1667
      },
      {
        "t": "edit",
        "id": "C2",
        "c": 3,
        "quote": "Fees are non-cancellable and non-refundable except as expressly stated in this Agreement.",
        "insert": "Fees are non-cancellable and non-refundable except as expressly stated in this Agreement.",
        "rule": "R5",
        "why": "Add convenience termination with refund.",
        "anchor": {
          "status": "refused",
          "clause": 3,
          "note": "Replacement is identical to the quote."
        },
        "at": 3755
      },
      {
        "t": "edit",
        "id": "C3",
        "c": 3,
        "quote": "Fees are non-cancellable and non-refundable except as expressly stated in this Agreement.",
        "insert": "Fees are non-cancellable and non-refundable except as expressly stated in this Agreement. Customer may terminate any Order Form for convenience on thirty (30) days’ written notice and receive a pro-rata refund of prepaid Fees.",
        "rule": "R5",
        "why": "Add convenience termination with refund.",
        "anchor": {
          "status": "anchored",
          "clause": 3,
          "start": 340,
          "end": 429,
          "original": "Fees are non-cancellable and non-refundable except as expressly stated in this Agreement.",
          "note": "Exact, unique match."
        },
        "at": 6384
      },
      {
        "t": "scan",
        "c": 4,
        "at": 6385
      },
      {
        "t": "decision",
        "c": 3,
        "seq": 1,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.97,
          "escalate": 0.03
        },
        "confidence": 0.96,
        "fit": {
          "C1": 0.9,
          "C3": 0.86
        },
        "ms": 76,
        "at": 6461
      },
      {
        "t": "edit",
        "id": "C4",
        "c": 4,
        "quote": "thirty-six (36) months",
        "insert": "twelve (12) months",
        "rule": "R4",
        "why": "No auto-renewal term longer than 12 months.",
        "anchor": {
          "status": "anchored",
          "clause": 4,
          "start": 146,
          "end": 168,
          "original": "thirty-six (36) months",
          "note": "Exact, unique match."
        },
        "at": 7301
      },
      {
        "t": "edit",
        "id": "C5",
        "c": 4,
        "quote": "thirty-six (36) month periods",
        "insert": "twelve (12) month periods",
        "rule": "R4",
        "why": "No auto-renewal term longer than 12 months.",
        "anchor": {
          "status": "anchored",
          "clause": 4,
          "start": 240,
          "end": 269,
          "original": "thirty-six (36) month periods",
          "note": "Exact, unique match."
        },
        "at": 8164
      },
      {
        "t": "edit",
        "id": "C6",
        "c": 4,
        "quote": "at least ninety (90) days",
        "insert": "at least thirty (30) days",
        "rule": "R4",
        "why": "Non-renewal notice of no more than 30 days.",
        "anchor": {
          "status": "anchored",
          "clause": 4,
          "start": 351,
          "end": 376,
          "original": "at least ninety (90) days",
          "note": "Exact, unique match."
        },
        "at": 9188
      },
      {
        "t": "scan",
        "c": 5,
        "at": 9189
      },
      {
        "t": "decision",
        "c": 4,
        "seq": 2,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.99,
          "escalate": 0.01
        },
        "confidence": 0.98,
        "fit": {
          "C4": 0.91,
          "C5": 0.92,
          "C6": 0.89
        },
        "ms": 75,
        "at": 9264
      },
      {
        "t": "edit",
        "id": "C7",
        "c": 5,
        "quote": "Customer may not terminate this Agreement or any Order Form for convenience.",
        "insert": "",
        "rule": "R5",
        "why": "Customer may terminate for convenience.",
        "anchor": {
          "status": "anchored",
          "clause": 5,
          "start": 159,
          "end": 235,
          "original": "Customer may not terminate this Agreement or any Order Form for convenience.",
          "note": "Exact, unique match."
        },
        "at": 10031
      },
      {
        "t": "edit",
        "id": "C8",
        "c": 5,
        "quote": "On any termination, all unpaid Fees for the remainder of the Subscription Term become immediately due and payable.",
        "insert": "On any termination for Provider's breach, all unpaid Fees for the remainder of the Subscription Term become immediately due and payable.",
        "rule": "R5",
        "why": "Refund applies for convenience termination.",
        "anchor": {
          "status": "anchored",
          "clause": 5,
          "start": 236,
          "end": 350,
          "original": "On any termination, all unpaid Fees for the remainder of the Subscription Term become immediately due and payable.",
          "note": "Exact, unique match."
        },
        "at": 11750
      },
      {
        "t": "scan",
        "c": 6,
        "at": 12051
      },
      {
        "t": "decision",
        "c": 5,
        "seq": 3,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.79,
          "escalate": 0.21
        },
        "confidence": 0.68,
        "fit": {
          "C7": 0.18,
          "C8": 0.32
        },
        "ms": 52,
        "at": 12103
      },
      {
        "t": "edit",
        "id": "C9",
        "c": 6,
        "quote": "Customer shall hold in confidence all non-public information disclosed by Provider",
        "insert": "Each party shall hold in confidence all non-public information disclosed by the other party",
        "rule": "R2",
        "why": "Confidentiality obligations must be mutual.",
        "anchor": {
          "status": "anchored",
          "clause": 6,
          "start": 0,
          "end": 82,
          "original": "Customer shall hold in confidence all non-public information disclosed by Provider",
          "note": "Exact, unique match."
        },
        "at": 13697
      },
      {
        "t": "edit",
        "id": "C10",
        "c": 6,
        "quote": "protect it with at least reasonable care.",
        "insert": "protect it with at least reasonable care. Provider's obligations under this Section 6 are reciprocal.",
        "rule": "R2",
        "why": "Confidentiality obligations must be mutual.",
        "anchor": {
          "status": "anchored",
          "clause": 6,
          "start": 221,
          "end": 262,
          "original": "protect it with at least reasonable care.",
          "note": "Exact, unique match."
        },
        "at": 15100
      },
      {
        "t": "scan",
        "c": 7,
        "at": 15101
      },
      {
        "t": "decision",
        "c": 6,
        "seq": 4,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.99,
          "escalate": 0.01
        },
        "confidence": 0.98,
        "fit": {
          "C9": 0.8,
          "C10": 0.55
        },
        "ms": 74,
        "at": 15175
      },
      {
        "t": "edit",
        "id": "C11",
        "c": 7,
        "quote": "perpetual, irrevocable, worldwide license to use, copy and modify Customer Data to provide and improve the Services and for any other lawful business purpose.",
        "insert": "license to use, copy and modify Customer Data solely to provide the Services.",
        "rule": "R7",
        "why": "Provider may use Customer Data only to provide Services.",
        "anchor": {
          "status": "anchored",
          "clause": 7,
          "start": 96,
          "end": 254,
          "original": "perpetual, irrevocable, worldwide license to use, copy and modify Customer Data to provide and improve the Services and for any other lawful business purpose.",
          "note": "Exact, unique match."
        },
        "at": 16646
      },
      {
        "t": "edit",
        "id": "C12",
        "c": 7,
        "quote": "Within one hundred eighty (180) days after termination, Provider will delete Customer Data upon Customer’s written request.",
        "insert": "Within thirty (30) days after termination, Provider will delete Customer Data.",
        "rule": "R7",
        "why": "Provider deletes Customer Data within 30 days.",
        "anchor": {
          "status": "anchored",
          "clause": 7,
          "start": 255,
          "end": 378,
          "original": "Within one hundred eighty (180) days after termination, Provider will delete Customer Data upon Customer’s written request.",
          "note": "Exact, unique match."
        },
        "at": 18039
      },
      {
        "t": "scan",
        "c": 11,
        "at": 18040
      },
      {
        "t": "decision",
        "c": 7,
        "seq": 5,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.9,
          "escalate": 0.1
        },
        "confidence": 0.85,
        "fit": {
          "C11": 0.92,
          "C12": 0.9
        },
        "ms": 56,
        "at": 18096
      },
      {
        "t": "edit",
        "id": "C13",
        "c": 11,
        "quote": "three (3) months",
        "insert": "twelve (12) months",
        "rule": "R1",
        "why": "Cap must be at least 12 months of Fees.",
        "anchor": {
          "status": "anchored",
          "clause": 11,
          "start": 231,
          "end": 247,
          "original": "three (3) months",
          "note": "Exact, unique match."
        },
        "at": 18755
      },
      {
        "t": "edit",
        "id": "C14",
        "c": 11,
        "quote": "Customer’s liability under this Agreement is not limited.",
        "insert": "Each party's total liability under this Agreement will not exceed the Fees paid or payable by Customer in the twelve (12) months before the event giving rise to the claim.",
        "rule": "R1",
        "why": "Liability caps must be mutual.",
        "anchor": {
          "status": "anchored",
          "clause": 11,
          "start": 291,
          "end": 348,
          "original": "Customer’s liability under this Agreement is not limited.",
          "note": "Exact, unique match."
        },
        "at": 20852
      },
      {
        "t": "scan",
        "c": 12,
        "at": 21007
      },
      {
        "t": "decision",
        "c": 11,
        "seq": 6,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.92,
          "escalate": 0.08
        },
        "confidence": 0.88,
        "fit": {
          "C13": 0.75,
          "C14": 0.8
        },
        "ms": 79,
        "at": 21086
      },
      {
        "t": "edit",
        "id": "C15",
        "c": 12,
        "quote": "California",
        "insert": "Delaware",
        "rule": "R3",
        "why": "Governing law must be Delaware.",
        "anchor": {
          "status": "refused",
          "clause": 12,
          "note": "Quote appears 2 times in §12; not guessing which."
        },
        "at": 22009
      },
      {
        "t": "edit",
        "id": "C16",
        "c": 12,
        "quote": "Santa Clara County, California.",
        "insert": "Delaware.",
        "rule": "R3",
        "why": "Venue must be Delaware.",
        "anchor": {
          "status": "anchored",
          "clause": 12,
          "start": 205,
          "end": 236,
          "original": "Santa Clara County, California.",
          "note": "Exact, unique match."
        },
        "at": 22814
      },
      {
        "t": "decision",
        "c": 12,
        "seq": 7,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0.01,
          "negotiate": 0.89,
          "escalate": 0.1
        },
        "confidence": 0.83,
        "fit": {
          "C16": 0.23
        },
        "ms": 62,
        "at": 22895
      },
      {
        "t": "done",
        "ms": 22896,
        "counts": {
          "edits": 16,
          "anchored": 14,
          "reanchored": 0,
          "refused": 2,
          "clauses": 7
        }
      }
    ]
  },
  "enterprise": {
    "model": "deepseek/deepseek-v3.2",
    "recorded": "2026-11-16",
    "totalMs": 22751,
    "speed": 2,
    "events": [
      {
        "t": "scan",
        "c": 2,
        "at": 907
      },
      {
        "t": "edit",
        "id": "C1",
        "c": 2,
        "quote": "Provider may modify the Services at any time, including by removing features, upon notice to Customer.",
        "insert": "",
        "rule": "E5",
        "why": "No unilateral right to modify or remove features.",
        "anchor": {
          "status": "anchored",
          "clause": 2,
          "start": 359,
          "end": 461,
          "original": "Provider may modify the Services at any time, including by removing features, upon notice to Customer.",
          "note": "Exact, unique match."
        },
        "at": 1912
      },
      {
        "t": "scan",
        "c": 3,
        "at": 1912
      },
      {
        "t": "decision",
        "c": 2,
        "seq": 1,
        "choice": "escalate",
        "probabilities": {
          "accept": 0.22,
          "negotiate": 0.24,
          "escalate": 0.54
        },
        "confidence": 0.31,
        "fit": {
          "C1": 0.07
        },
        "ms": 160,
        "at": 2072
      },
      {
        "t": "edit",
        "id": "C2",
        "c": 3,
        "quote": "Provider may increase the Fees for any Renewal Term at its sole discretion by giving notice before the end of the then-current term.",
        "insert": "",
        "rule": "E5",
        "why": "No unilateral right to increase Fees.",
        "anchor": {
          "status": "anchored",
          "clause": 3,
          "start": 207,
          "end": 339,
          "original": "Provider may increase the Fees for any Renewal Term at its sole discretion by giving notice before the end of the then-current term.",
          "note": "Exact, unique match."
        },
        "at": 2790
      },
      {
        "t": "scan",
        "c": 4,
        "at": 2929
      },
      {
        "t": "decision",
        "c": 3,
        "seq": 2,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0.01,
          "negotiate": 0.75,
          "escalate": 0.24
        },
        "confidence": 0.62,
        "fit": {
          "C2": 0.29
        },
        "ms": 76,
        "at": 3005
      },
      {
        "t": "edit",
        "id": "C3",
        "c": 4,
        "quote": "renews automatically for successive thirty-six (36) month periods",
        "insert": "renews only by mutual written agreement",
        "rule": "E5",
        "why": "No automatic renewal.",
        "anchor": {
          "status": "anchored",
          "clause": 4,
          "start": 204,
          "end": 269,
          "original": "renews automatically for successive thirty-six (36) month periods",
          "note": "Exact, unique match."
        },
        "at": 3742
      },
      {
        "t": "scan",
        "c": 5,
        "at": 3743
      },
      {
        "t": "decision",
        "c": 4,
        "seq": 3,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.96,
          "escalate": 0.04
        },
        "confidence": 0.94,
        "fit": {
          "C3": 0.83
        },
        "ms": 98,
        "at": 3841
      },
      {
        "t": "edit",
        "id": "C4",
        "c": 5,
        "quote": "Customer may not terminate this Agreement or any Order Form for convenience.",
        "insert": "Customer may terminate this Agreement or any Order Form for convenience on thirty (30) days’ notice with a pro-rata refund of prepaid Fees.",
        "rule": "E6",
        "why": "Customer may terminate for convenience.",
        "anchor": {
          "status": "anchored",
          "clause": 5,
          "start": 159,
          "end": 235,
          "original": "Customer may not terminate this Agreement or any Order Form for convenience.",
          "note": "Exact, unique match."
        },
        "at": 5196
      },
      {
        "t": "edit",
        "id": "C5",
        "c": 5,
        "quote": "all unpaid Fees for the remainder of the Subscription Term become immediately due and payable.",
        "insert": "",
        "rule": "E6",
        "why": "Remove acceleration of unpaid Fees.",
        "anchor": {
          "status": "anchored",
          "clause": 5,
          "start": 256,
          "end": 350,
          "original": "all unpaid Fees for the remainder of the Subscription Term become immediately due and payable.",
          "note": "Exact, unique match."
        },
        "at": 6143
      },
      {
        "t": "scan",
        "c": 6,
        "at": 6144
      },
      {
        "t": "decision",
        "c": 5,
        "seq": 4,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.91,
          "escalate": 0.09
        },
        "confidence": 0.86,
        "fit": {
          "C4": 0.9,
          "C5": 0.76
        },
        "ms": 81,
        "at": 6225
      },
      {
        "t": "edit",
        "id": "C6",
        "c": 6,
        "quote": "two (2) years",
        "insert": "five (5) years",
        "rule": "E2",
        "why": "Confidentiality must survive five years.",
        "anchor": {
          "status": "anchored",
          "clause": 6,
          "start": 294,
          "end": 307,
          "original": "two (2) years",
          "note": "Exact, unique match."
        },
        "at": 7358
      },
      {
        "t": "scan",
        "c": 7,
        "at": 7359
      },
      {
        "t": "decision",
        "c": 6,
        "seq": 5,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.85,
          "escalate": 0.15
        },
        "confidence": 0.77,
        "fit": {
          "C6": 0.26
        },
        "ms": 76,
        "at": 7435
      },
      {
        "t": "edit",
        "id": "C7",
        "c": 7,
        "quote": "perpetual, irrevocable, worldwide license to use, copy and modify Customer Data to provide and improve the Services and for any other lawful business purpose.",
        "insert": "license limited to the Subscription Term to use, copy and modify Customer Data solely to provide the Services.",
        "rule": "E2",
        "why": "Limit license scope and duration.",
        "anchor": {
          "status": "anchored",
          "clause": 7,
          "start": 96,
          "end": 254,
          "original": "perpetual, irrevocable, worldwide license to use, copy and modify Customer Data to provide and improve the Services and for any other lawful business purpose.",
          "note": "Exact, unique match."
        },
        "at": 10334
      },
      {
        "t": "scan",
        "c": 8,
        "at": 10446
      },
      {
        "t": "decision",
        "c": 7,
        "seq": 6,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0.01,
          "negotiate": 0.51,
          "escalate": 0.48
        },
        "confidence": 0.26,
        "fit": {
          "C7": 0.13
        },
        "ms": 53,
        "at": 10499
      },
      {
        "t": "edit",
        "id": "C8",
        "c": 8,
        "quote": "Provider will use commercially reasonable efforts to protect Customer Data from unauthorized access.",
        "insert": "Provider will maintain SOC 2 Type II controls to protect Customer Data.",
        "rule": "E3",
        "why": "Require SOC 2 Type II controls.",
        "anchor": {
          "status": "anchored",
          "clause": 8,
          "start": 0,
          "end": 100,
          "original": "Provider will use commercially reasonable efforts to protect Customer Data from unauthorized access.",
          "note": "Exact, unique match."
        },
        "at": 12446
      },
      {
        "t": "edit",
        "id": "C9",
        "c": 8,
        "quote": "without undue delay after Provider determines that notice is legally required.",
        "insert": "within seventy-two (72) hours of confirmation.",
        "rule": "E3",
        "why": "Breach notice must be within 72 hours.",
        "anchor": {
          "status": "anchored",
          "clause": 8,
          "start": 198,
          "end": 276,
          "original": "without undue delay after Provider determines that notice is legally required.",
          "note": "Exact, unique match."
        },
        "at": 13528
      },
      {
        "t": "scan",
        "c": 10,
        "at": 13529
      },
      {
        "t": "decision",
        "c": 8,
        "seq": 7,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.91,
          "escalate": 0.09
        },
        "confidence": 0.86,
        "fit": {
          "C8": 0.79,
          "C9": 0.85
        },
        "ms": 53,
        "at": 13582
      },
      {
        "t": "edit",
        "id": "C10",
        "c": 10,
        "quote": "Provider has no obligation to defend Customer against claims that the Services infringe a third party’s intellectual property rights.",
        "insert": "Provider shall defend and indemnify Customer against third-party claims that the Services infringe intellectual property rights.",
        "rule": "E4",
        "why": "Provider must provide IP indemnity.",
        "anchor": {
          "status": "anchored",
          "clause": 10,
          "start": 168,
          "end": 301,
          "original": "Provider has no obligation to defend Customer against claims that the Services infringe a third party’s intellectual property rights.",
          "note": "Exact, unique match."
        },
        "at": 15242
      },
      {
        "t": "scan",
        "c": 11,
        "at": 15245
      },
      {
        "t": "decision",
        "c": 10,
        "seq": 8,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.85,
          "escalate": 0.15
        },
        "confidence": 0.77,
        "fit": {
          "C10": 0.86
        },
        "ms": 53,
        "at": 15298
      },
      {
        "t": "edit",
        "id": "C11",
        "c": 11,
        "quote": "three (3) months",
        "insert": "twenty-four (24) months",
        "rule": "E1",
        "why": "Cap must be at least 24 months of Fees.",
        "anchor": {
          "status": "anchored",
          "clause": 11,
          "start": 231,
          "end": 247,
          "original": "three (3) months",
          "note": "Exact, unique match."
        },
        "at": 16027
      },
      {
        "t": "edit",
        "id": "C12",
        "c": 11,
        "quote": "Customer’s liability under this Agreement is not limited.",
        "insert": "Customer’s total liability under this Agreement will not exceed the Fees paid by Customer in the twenty-four (24) months before the event giving rise to the claim.",
        "rule": "E1",
        "why": "Mutual liability cap required.",
        "anchor": {
          "status": "anchored",
          "clause": 11,
          "start": 291,
          "end": 348,
          "original": "Customer’s liability under this Agreement is not limited.",
          "note": "Exact, unique match."
        },
        "at": 17382
      },
      {
        "t": "scan",
        "c": 12,
        "at": 17383
      },
      {
        "t": "decision",
        "c": 11,
        "seq": 9,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.78,
          "escalate": 0.22
        },
        "confidence": 0.67,
        "fit": {
          "C11": 0.83,
          "C12": 0.75
        },
        "ms": 67,
        "at": 17450
      },
      {
        "t": "edit",
        "id": "C13",
        "c": 12,
        "quote": "California",
        "insert": "Delaware",
        "rule": "E8",
        "why": "Governing law must be Delaware.",
        "anchor": {
          "status": "refused",
          "clause": 12,
          "note": "Quote appears 2 times in §12; not guessing which."
        },
        "at": 18119
      },
      {
        "t": "edit",
        "id": "C14",
        "c": 12,
        "quote": "Santa Clara County, California.",
        "insert": "Delaware.",
        "rule": "E8",
        "why": "Venue must be Delaware courts.",
        "anchor": {
          "status": "anchored",
          "clause": 12,
          "start": 205,
          "end": 236,
          "original": "Santa Clara County, California.",
          "note": "Exact, unique match."
        },
        "at": 19129
      },
      {
        "t": "scan",
        "c": 13,
        "at": 19129
      },
      {
        "t": "decision",
        "c": 12,
        "seq": 10,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0.01,
          "negotiate": 0.93,
          "escalate": 0.06
        },
        "confidence": 0.89,
        "fit": {
          "C14": 0.35
        },
        "ms": 76,
        "at": 19206
      },
      {
        "t": "edit",
        "id": "C15",
        "c": 13,
        "quote": "Provider may assign this Agreement without Customer’s consent;",
        "insert": "Neither party may assign this Agreement without the other party’s consent, except in a merger or sale of all or substantially all of its assets.",
        "rule": "E7",
        "why": "Assignment requires mutual consent.",
        "anchor": {
          "status": "anchored",
          "clause": 13,
          "start": 0,
          "end": 62,
          "original": "Provider may assign this Agreement without Customer’s consent;",
          "note": "Exact, unique match."
        },
        "at": 21447
      },
      {
        "t": "edit",
        "id": "C16",
        "c": 13,
        "quote": "Provider may identify Customer as a customer in its marketing materials.",
        "insert": "Provider may not use Customer’s name without Customer’s prior written consent.",
        "rule": "E7",
        "why": "No publicity without consent.",
        "anchor": {
          "status": "anchored",
          "clause": 13,
          "start": 132,
          "end": 204,
          "original": "Provider may identify Customer as a customer in its marketing materials.",
          "note": "Exact, unique match."
        },
        "at": 22681
      },
      {
        "t": "decision",
        "c": 13,
        "seq": 11,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.99,
          "escalate": 0.01
        },
        "confidence": 0.98,
        "fit": {
          "C15": 0.88,
          "C16": 0.89
        },
        "ms": 66,
        "at": 22751
      },
      {
        "t": "done",
        "ms": 22751,
        "counts": {
          "edits": 16,
          "anchored": 15,
          "reanchored": 0,
          "refused": 1,
          "clauses": 11
        }
      }
    ]
  },
  "light": {
    "model": "deepseek/deepseek-v3.2",
    "recorded": "2026-11-16",
    "totalMs": 5340,
    "speed": 1,
    "events": [
      {
        "t": "scan",
        "c": 4,
        "at": 707
      },
      {
        "t": "edit",
        "id": "C1",
        "c": 4,
        "quote": "thirty-six (36) months",
        "insert": "twelve (12) months",
        "rule": "L3",
        "why": "Renewal terms of 12 months or less.",
        "anchor": {
          "status": "anchored",
          "clause": 4,
          "start": 146,
          "end": 168,
          "original": "thirty-six (36) months",
          "note": "Exact, unique match."
        },
        "at": 1409
      },
      {
        "t": "edit",
        "id": "C2",
        "c": 4,
        "quote": "thirty-six (36) month periods",
        "insert": "twelve (12) month periods",
        "rule": "L3",
        "why": "Renewal terms of 12 months or less.",
        "anchor": {
          "status": "anchored",
          "clause": 4,
          "start": 240,
          "end": 269,
          "original": "thirty-six (36) month periods",
          "note": "Exact, unique match."
        },
        "at": 2927
      },
      {
        "t": "scan",
        "c": 7,
        "at": 2927
      },
      {
        "t": "decision",
        "c": 4,
        "seq": 1,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.99,
          "escalate": 0.01
        },
        "confidence": 0.98,
        "fit": {
          "C1": 0.79,
          "C2": 0.85
        },
        "ms": 78,
        "at": 3005
      },
      {
        "t": "edit",
        "id": "C3",
        "c": 7,
        "quote": "to provide and improve the Services and for any other lawful business purpose",
        "insert": "to provide the Services",
        "rule": "L2",
        "why": "Provider may use Customer Data only to provide the Services.",
        "anchor": {
          "status": "anchored",
          "clause": 7,
          "start": 176,
          "end": 253,
          "original": "to provide and improve the Services and for any other lawful business purpose",
          "note": "Exact, unique match."
        },
        "at": 3625
      },
      {
        "t": "scan",
        "c": 11,
        "at": 3764
      },
      {
        "t": "decision",
        "c": 7,
        "seq": 2,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.94,
          "escalate": 0.06
        },
        "confidence": 0.91,
        "fit": {
          "C3": 0.84
        },
        "ms": 62,
        "at": 3826
      },
      {
        "t": "edit",
        "id": "C4",
        "c": 11,
        "quote": "three (3) months",
        "insert": "twelve (12) months",
        "rule": "L1",
        "why": "Cap must be at least 12 months of Fees.",
        "anchor": {
          "status": "anchored",
          "clause": 11,
          "start": 231,
          "end": 247,
          "original": "three (3) months",
          "note": "Exact, unique match."
        },
        "at": 4227
      },
      {
        "t": "edit",
        "id": "C5",
        "c": 11,
        "quote": "Customer’s liability under this Agreement is not limited.",
        "insert": "Customer’s liability under this Agreement is not limited. Provider’s liability under this Agreement is not limited.",
        "rule": "L1",
        "why": "Liability caps must be mutual.",
        "anchor": {
          "status": "anchored",
          "clause": 11,
          "start": 291,
          "end": 348,
          "original": "Customer’s liability under this Agreement is not limited.",
          "note": "Exact, unique match."
        },
        "at": 5252
      },
      {
        "t": "decision",
        "c": 11,
        "seq": 3,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0,
          "negotiate": 0.56,
          "escalate": 0.44
        },
        "confidence": 0.34,
        "fit": {
          "C4": 0.62,
          "C5": 0.26
        },
        "ms": 48,
        "at": 5340
      },
      {
        "t": "done",
        "ms": 5340,
        "counts": {
          "edits": 5,
          "anchored": 5,
          "reanchored": 0,
          "refused": 0,
          "clauses": 3
        }
      }
    ]
  }
};
