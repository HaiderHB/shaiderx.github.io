// Recorded live reviews, one per playbook, replayed in preview mode (no demo key) and on page
// load. Each is the exact NDJSON event stream the review route sent during a live run on the
// Vercel preview (PLACEHOLDER: replace with recorded runs): DeepSeek's edits, the anchoring results computed by code,
// and Jev's decisions with their timings. The page replays them faster (`speed`) and says so.
// Regenerate by streaming POST /api/demo/gc-ai/review/ with a key and converting the output.
/* eslint-disable */
export const EXAMPLES = {
  "standard": {
    "model": "deepseek/deepseek-v3.2",
    "recorded": "placeholder",
    "totalMs": 16650,
    "speed": 1.5,
    "events": [
      {
        "t": "scan",
        "c": 3,
        "at": 1840
      },
      {
        "t": "edit",
        "id": "C1",
        "c": 3,
        "quote": "at its sole discretion",
        "insert": "by no more than 5%",
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
        "at": 2680
      },
      {
        "t": "scan",
        "c": 4,
        "at": 2760
      },
      {
        "t": "decision",
        "c": 3,
        "seq": 1,
        "choice": "escalate",
        "probabilities": {
          "accept": 0.1,
          "negotiate": 0.2,
          "escalate": 0.7
        },
        "confidence": 0.7,
        "ms": 230,
        "at": 2990
      },
      {
        "t": "edit",
        "id": "C2",
        "c": 4,
        "quote": "successive thirty-six (36) month periods",
        "insert": "successive twelve (12) month periods",
        "rule": "R4",
        "why": "Renewal terms of no more than 12 months.",
        "anchor": {
          "status": "anchored",
          "clause": 4,
          "start": 229,
          "end": 269,
          "original": "successive thirty-six (36) month periods",
          "note": "Exact, unique match."
        },
        "at": 3950
      },
      {
        "t": "edit",
        "id": "C3",
        "c": 4,
        "quote": "ninety (90) days",
        "insert": "thirty (30) days",
        "rule": "R4",
        "why": "Non-renewal notice of no more than 30 days.",
        "anchor": {
          "status": "anchored",
          "clause": 4,
          "start": 360,
          "end": 376,
          "original": "ninety (90) days",
          "note": "Exact, unique match."
        },
        "at": 4830
      },
      {
        "t": "scan",
        "c": 5,
        "at": 4870
      },
      {
        "t": "decision",
        "c": 4,
        "seq": 2,
        "choice": "accept",
        "probabilities": {
          "accept": 0.7,
          "negotiate": 0.2,
          "escalate": 0.1
        },
        "confidence": 0.7,
        "ms": 230,
        "at": 5100
      },
      {
        "t": "edit",
        "id": "C4",
        "c": 5,
        "quote": "Customer may not terminate this Agreement or any Order Form for convenience.",
        "insert": "Customer may terminate this Agreement or any Order Form for convenience on thirty (30) days' written notice, with a pro-rata refund of prepaid Fees.",
        "rule": "R5",
        "why": "Customer needs 30-day termination for convenience.",
        "anchor": {
          "status": "anchored",
          "clause": 5,
          "start": 159,
          "end": 235,
          "original": "Customer may not terminate this Agreement or any Order Form for convenience.",
          "note": "Exact, unique match."
        },
        "at": 7140
      },
      {
        "t": "scan",
        "c": 6,
        "at": 7180
      },
      {
        "t": "decision",
        "c": 5,
        "seq": 3,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0.1,
          "negotiate": 0.7,
          "escalate": 0.1
        },
        "confidence": 0.7,
        "ms": 230,
        "at": 7410
      },
      {
        "t": "edit",
        "id": "C5",
        "c": 6,
        "quote": "Customer shall hold in confidence all non-public information disclosed by Provider",
        "insert": "Each party shall hold in confidence all non-public information disclosed by the other party",
        "rule": "R2",
        "why": "Confidentiality must be mutual.",
        "anchor": {
          "status": "anchored",
          "clause": 6,
          "start": 0,
          "end": 82,
          "original": "Customer shall hold in confidence all non-public information disclosed by Provider",
          "note": "Exact, unique match."
        },
        "at": 9010
      },
      {
        "t": "scan",
        "c": 7,
        "at": 9050
      },
      {
        "t": "decision",
        "c": 6,
        "seq": 4,
        "choice": "escalate",
        "probabilities": {
          "accept": 0.1,
          "negotiate": 0.2,
          "escalate": 0.7
        },
        "confidence": 0.7,
        "ms": 230,
        "at": 9280
      },
      {
        "t": "edit",
        "id": "C6",
        "c": 7,
        "quote": "to provide and improve the Services and for any other lawful business purpose",
        "insert": "solely to provide the Services",
        "rule": "R7",
        "why": "Provider may use Customer Data only to provide the Services.",
        "anchor": {
          "status": "anchored",
          "clause": 7,
          "start": 176,
          "end": 253,
          "original": "to provide and improve the Services and for any other lawful business purpose",
          "note": "Exact, unique match."
        },
        "at": 10600
      },
      {
        "t": "edit",
        "id": "C7",
        "c": 7,
        "quote": "one hundred eighty (180) days after termination, Provider will delete Customer Data upon Customer's written request",
        "insert": "thirty (30) days after termination, Provider will delete Customer Data",
        "rule": "R7",
        "why": "Delete Customer Data within 30 days of termination.",
        "anchor": {
          "status": "reanchored",
          "clause": 7,
          "start": 262,
          "end": 377,
          "original": "one hundred eighty (180) days after termination, Provider will delete Customer Data upon Customer’s written request",
          "note": "Normalised curly quotes."
        },
        "at": 12520
      },
      {
        "t": "scan",
        "c": 11,
        "at": 12560
      },
      {
        "t": "decision",
        "c": 7,
        "seq": 5,
        "choice": "accept",
        "probabilities": {
          "accept": 0.7,
          "negotiate": 0.2,
          "escalate": 0.1
        },
        "confidence": 0.7,
        "ms": 230,
        "at": 12790
      },
      {
        "t": "edit",
        "id": "C8",
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
        "at": 13510
      },
      {
        "t": "edit",
        "id": "C9",
        "c": 11,
        "quote": "Customer’s liability under this Agreement is not limited.",
        "insert": "Each party's total liability is subject to the same cap.",
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
        "at": 14830
      },
      {
        "t": "scan",
        "c": 12,
        "at": 14870
      },
      {
        "t": "decision",
        "c": 11,
        "seq": 6,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0.1,
          "negotiate": 0.7,
          "escalate": 0.1
        },
        "confidence": 0.7,
        "ms": 230,
        "at": 15100
      },
      {
        "t": "edit",
        "id": "C10",
        "c": 12,
        "quote": "State of California",
        "insert": "State of Delaware",
        "rule": "R3",
        "why": "Delaware governing law.",
        "anchor": {
          "status": "anchored",
          "clause": 12,
          "start": 46,
          "end": 65,
          "original": "State of California",
          "note": "Exact, unique match."
        },
        "at": 15700
      },
      {
        "t": "edit",
        "id": "C11",
        "c": 12,
        "quote": "Santa Clara County, California",
        "insert": "the State of Delaware",
        "rule": "R3",
        "why": "Delaware courts.",
        "anchor": {
          "status": "anchored",
          "clause": 12,
          "start": 205,
          "end": 235,
          "original": "Santa Clara County, California",
          "note": "Exact, unique match."
        },
        "at": 16500
      },
      {
        "t": "decision",
        "c": 12,
        "seq": 7,
        "choice": "escalate",
        "probabilities": {
          "accept": 0.1,
          "negotiate": 0.2,
          "escalate": 0.7
        },
        "confidence": 0.7,
        "ms": 150,
        "at": 16650
      },
      {
        "t": "done",
        "ms": 16650,
        "counts": {
          "edits": 11,
          "anchored": 10,
          "reanchored": 1,
          "refused": 0,
          "clauses": 7
        }
      }
    ]
  },
  "enterprise": {
    "model": "deepseek/deepseek-v3.2",
    "recorded": "placeholder",
    "totalMs": 5420,
    "speed": 1,
    "events": [
      {
        "t": "scan",
        "c": 4,
        "at": 1840
      },
      {
        "t": "edit",
        "id": "C1",
        "c": 4,
        "quote": "and then renews automatically for successive thirty-six (36) month periods (each, a “Renewal Term”) unless either party gives written notice of non-renewal at least ninety (90) days before the end of the then-current term",
        "insert": "and may be renewed only by mutual written agreement (each, a “Renewal Term”)",
        "rule": "E5",
        "why": "No automatic renewal.",
        "anchor": {
          "status": "anchored",
          "clause": 4,
          "start": 195,
          "end": 416,
          "original": "and then renews automatically for successive thirty-six (36) month periods (each, a “Renewal Term”) unless either party gives written notice of non-renewal at least ninety (90) days before the end of the then-current term",
          "note": "Exact, unique match."
        },
        "at": 4280
      },
      {
        "t": "scan",
        "c": 11,
        "at": 4320
      },
      {
        "t": "decision",
        "c": 4,
        "seq": 1,
        "choice": "escalate",
        "probabilities": {
          "accept": 0.1,
          "negotiate": 0.2,
          "escalate": 0.7
        },
        "confidence": 0.7,
        "ms": 230,
        "at": 4550
      },
      {
        "t": "edit",
        "id": "C2",
        "c": 11,
        "quote": "three (3) months",
        "insert": "twenty-four (24) months",
        "rule": "E1",
        "why": "Cap of at least 24 months of Fees.",
        "anchor": {
          "status": "anchored",
          "clause": 11,
          "start": 231,
          "end": 247,
          "original": "three (3) months",
          "note": "Exact, unique match."
        },
        "at": 5270
      },
      {
        "t": "decision",
        "c": 11,
        "seq": 2,
        "choice": "accept",
        "probabilities": {
          "accept": 0.7,
          "negotiate": 0.2,
          "escalate": 0.1
        },
        "confidence": 0.7,
        "ms": 150,
        "at": 5420
      },
      {
        "t": "done",
        "ms": 5420,
        "counts": {
          "edits": 2,
          "anchored": 2,
          "reanchored": 0,
          "refused": 0,
          "clauses": 2
        }
      }
    ]
  },
  "light": {
    "model": "deepseek/deepseek-v3.2",
    "recorded": "placeholder",
    "totalMs": 5410,
    "speed": 1,
    "events": [
      {
        "t": "scan",
        "c": 4,
        "at": 1840
      },
      {
        "t": "edit",
        "id": "C1",
        "c": 4,
        "quote": "successive thirty-six (36) month periods",
        "insert": "successive twelve (12) month periods",
        "rule": "L3",
        "why": "Renewal terms of 12 months or less.",
        "anchor": {
          "status": "anchored",
          "clause": 4,
          "start": 229,
          "end": 269,
          "original": "successive thirty-six (36) month periods",
          "note": "Exact, unique match."
        },
        "at": 2880
      },
      {
        "t": "scan",
        "c": 7,
        "at": 2960
      },
      {
        "t": "decision",
        "c": 4,
        "seq": 1,
        "choice": "escalate",
        "probabilities": {
          "accept": 0.1,
          "negotiate": 0.2,
          "escalate": 0.7
        },
        "confidence": 0.7,
        "ms": 230,
        "at": 3190
      },
      {
        "t": "edit",
        "id": "C2",
        "c": 7,
        "quote": "to provide and improve the Services and for any other lawful business purpose",
        "insert": "solely to provide the Services",
        "rule": "L2",
        "why": "Data used only to provide the Services.",
        "anchor": {
          "status": "anchored",
          "clause": 7,
          "start": 176,
          "end": 253,
          "original": "to provide and improve the Services and for any other lawful business purpose",
          "note": "Exact, unique match."
        },
        "at": 4350
      },
      {
        "t": "scan",
        "c": 11,
        "at": 4430
      },
      {
        "t": "decision",
        "c": 7,
        "seq": 2,
        "choice": "accept",
        "probabilities": {
          "accept": 0.7,
          "negotiate": 0.2,
          "escalate": 0.1
        },
        "confidence": 0.7,
        "ms": 230,
        "at": 4660
      },
      {
        "t": "edit",
        "id": "C3",
        "c": 11,
        "quote": "three (3) months",
        "insert": "twelve (12) months",
        "rule": "L1",
        "why": "Cap at 12 months of Fees.",
        "anchor": {
          "status": "anchored",
          "clause": 11,
          "start": 231,
          "end": 247,
          "original": "three (3) months",
          "note": "Exact, unique match."
        },
        "at": 5260
      },
      {
        "t": "decision",
        "c": 11,
        "seq": 3,
        "choice": "negotiate",
        "probabilities": {
          "accept": 0.1,
          "negotiate": 0.7,
          "escalate": 0.1
        },
        "confidence": 0.7,
        "ms": 150,
        "at": 5410
      },
      {
        "t": "done",
        "ms": 5410,
        "counts": {
          "edits": 3,
          "anchored": 3,
          "reanchored": 0,
          "refused": 0,
          "clauses": 3
        }
      }
    ]
  }
};
