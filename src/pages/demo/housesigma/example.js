// A recorded live run (ask -> filters, price check, weekly update), so the page opens on a real
// result and works without a demo key. Recorded through the API routes on the date below; the
// filters are stored as the validated result of the LLM's answer. See README.md ("Modes").
export const EXAMPLE = {
  "recorded": "2026-11-21",
  "ask": "3-bed semi in Brampton under $1.1M, walk to a GO station, quiet street",
  "raw": {
    "cities": [
      "Brampton"
    ],
    "types": [
      "semi"
    ],
    "beds_min": 3,
    "price_max": 1100000,
    "go_max_km": 1.2,
    "quiet_street": true
  },
  "parseMs": 2620,
  "fair": {
    "id": "L-1576",
    "verdict": {
      "choice": "underpriced",
      "probabilities": {
        "underpriced": 0.99,
        "fair": 0.01,
        "overpriced": 0
      },
      "confidence": 0.98,
      "competition": 0.77,
      "ms": 139
    },
    "text": "The list price of $898,900 is well below the estimated range of $954,000 to $1,056,000, making it underpriced. This is supported by recent sales like 269 Corbel Mill Lane at $1,060,000 and 49 Old Foundry Pl at $925,000."
  },
  "pulse": {
    "text": "- 6 new homes matched your search, with the best value at 208 Corbel Mill Lane listed for $898,900, which is 10.6% below the estimate.\n- 4 listings had price drops, including 84 Gantry Row reduced by $66,000 to $1,022,900.\n- 8 homes sold this week, with 50% selling over asking and a median sale-to-list ratio of 101.5%.\nTakeaway: More new matches and sales occurred, with half selling above list price this week."
  }
};
