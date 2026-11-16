// Example runs shown without a demo key (preview mode) and on first load.
// Recorded from live runs of the deployed routes on 2026-11-16 (mock, Jev): only the model outputs
// are stored here (Jev's fit scores, acceptance estimates and next action, the LLM's whys, invite
// and reply text, and the live stage timings). The filter, ranking, guardrails and output checks
// re-run in the browser on the same code the API uses. Regenerate with the recorder described in
// README.md; never edit the outputs by hand.

export const EXAMPLE_META = {
  "recorded": "2026-11-16",
  "model": "mock"
};

export const EXAMPLES = {
  "serum": {
    "rank": {
      "fit": {
        "c01": {
          "score": 3.24,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c02": {
          "score": 1.76,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c03": {
          "score": 3.48,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c05": {
          "score": 3.66,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c06": {
          "score": 3.16,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c07": {
          "score": 1.9,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c09": {
          "score": 1.44,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c11": {
          "score": 3.34,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c12": {
          "score": 1.86,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c13": {
          "score": 3.58,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c14": {
          "score": 2.42,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c16": {
          "score": 2.48,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        }
      },
      "accept": {
        "c05": 0.95,
        "c13": 0.91,
        "c03": 0.74,
        "c11": 0.67,
        "c01": 0.5,
        "c06": 0.58,
        "c16": 0.64,
        "c14": 0.61,
        "c07": 0.15,
        "c12": 0.05
      },
      "why": {
        "c05": "Skincare creator with 9.8k average views; usually asks 12%.",
        "c13": "Skincare creator with 11k average views; usually asks 12%.",
        "c03": "Skincare creator with 14.5k average views; usually asks 15%.",
        "c11": "Skincare creator with 19k average views; usually asks 15%.",
        "c06": "Beauty creator with 22k average views; usually asks 15%.",
        "c01": "Skincare creator with 41k average views; usually asks 18%.",
        "c16": "Men's grooming creator with 15k average views; usually asks 15%.",
        "c14": "Wellness creator with 24k average views; usually asks 15%."
      },
      "ms": {
        "filter": 0.17,
        "fit": 0.38,
        "accept": 0.19,
        "pick": 0.23
      }
    },
    "invite": {
      "creatorId": "c05",
      "text": "Hi Lena! Placeholder invite until the live recording lands: 15% commission and a free sample of Glow Shot 15% Vitamin C Serum. Reply yes with your address. Ava, Lumora Skin",
      "ms": 0
    },
    "reply": {
      "creatorId": "c05",
      "reply": "Love it! Can you do 20% and send 2 samples first?",
      "decision": {
        "choice": "counter_offer",
        "probabilities": {
          "accept": 0.1,
          "counter_offer": 0.7,
          "send_sample_first": 0.15,
          "decline": 0.05
        },
        "confidence": 0.7
      },
      "text": "Placeholder reply until the live recording lands. Ava, Lumora Skin",
      "ms": {
        "decide": 0.07,
        "guard": 0.11,
        "draft": 0.1
      }
    }
  },
  "bar": {
    "rank": {
      "fit": {
        "c14": {
          "score": 2.42,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c17": {
          "score": 2.14,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c18": {
          "score": 2.36,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c19": {
          "score": 2.72,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c20": {
          "score": 2.38,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c22": {
          "score": 2.62,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c23": {
          "score": 1.82,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c24": {
          "score": 1.94,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c25": {
          "score": 2.58,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c37": {
          "score": 2.38,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c40": {
          "score": 2.28,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        }
      },
      "accept": {
        "c19": 0.76,
        "c22": 0.71,
        "c25": 0.57,
        "c14": 0.49,
        "c20": 0.05,
        "c37": 0.47,
        "c18": 0.46,
        "c40": 0.42,
        "c17": 0.23,
        "c24": 0.05
      },
      "why": {
        "c19": "Running creator with 12k average views; usually asks 12%.",
        "c22": "Lifestyle creator with 16k average views; usually asks 12%.",
        "c25": "Fitness creator with 27k average views; usually asks 15%.",
        "c14": "Wellness creator with 24k average views; usually asks 15%.",
        "c37": "Outdoors creator with 23k average views; usually asks 15%.",
        "c18": "Food creator with 33k average views; usually asks 15%.",
        "c40": "Student life creator with 31k average views; usually asks 15%.",
        "c17": "Fitness creator with 48k average views; usually asks 18%."
      },
      "ms": {
        "filter": 0.04,
        "fit": 0.06,
        "accept": 0.05,
        "pick": 0.06
      }
    },
    "invite": {
      "creatorId": "c19",
      "text": "Hi Dev! Placeholder invite until the live recording lands: 12% commission and a free sample of Stackd Protein Bar, Salted Caramel (12-pack). Reply yes with your address. Theo, Stackd Snacks",
      "ms": 0
    },
    "reply": {
      "creatorId": "c19",
      "reply": "Love these! Can you do 18% and send 3 boxes first?",
      "decision": {
        "choice": "counter_offer",
        "probabilities": {
          "accept": 0.1,
          "counter_offer": 0.7,
          "send_sample_first": 0.15,
          "decline": 0.05
        },
        "confidence": 0.7
      },
      "text": "Placeholder reply until the live recording lands. Theo, Stackd Snacks",
      "ms": {
        "decide": 0.01,
        "guard": 0.01,
        "draft": 0.03
      }
    }
  },
  "gimbal": {
    "rank": {
      "fit": {
        "c29": {
          "score": 2.52,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c30": {
          "score": 2.08,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c31": {
          "score": 3.36,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c32": {
          "score": 2.18,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c33": {
          "score": 3.54,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c34": {
          "score": 1.48,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c35": {
          "score": 2.66,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c37": {
          "score": 2.38,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        },
        "c40": {
          "score": 2.28,
          "probabilities": {
            "0": 0.05,
            "1": 0.1,
            "2": 0.2,
            "3": 0.35,
            "4": 0.3
          }
        }
      },
      "accept": {
        "c33": 0.69,
        "c31": 0.48,
        "c35": 0.65,
        "c29": 0.05,
        "c37": 0.39,
        "c40": 0.34,
        "c32": 0.17,
        "c30": 0.12,
        "c34": 0.05
      },
      "why": {
        "c33": "Desk setups creator with 10k average views; usually asks 12%.",
        "c35": "Vlogs creator with 11k average views; usually asks 12%.",
        "c31": "Phone filmmaking creator with 18k average views; usually asks 15%.",
        "c37": "Outdoors creator with 23k average views; usually asks 15%.",
        "c40": "Student life creator with 31k average views; usually asks 15%.",
        "c32": "Parenting creator with 58k average views; usually asks 18%.",
        "c30": "Travel creator with 39k average views; usually asks 18%.",
        "c29": "Tech creator with 95k average views; usually asks 20%."
      },
      "ms": {
        "filter": 0.01,
        "fit": 0.06,
        "accept": 0.29,
        "pick": 0.04
      }
    },
    "invite": {
      "creatorId": "c33",
      "text": "Hi Alex! Placeholder invite until the live recording lands: 10% commission and a free sample of Orbit 3-Axis Phone Gimbal. Reply yes with your address. Jun, Kinetik",
      "ms": 0
    },
    "reply": {
      "creatorId": "c33",
      "reply": "This is cool! Can you do 16% and send 2 units, one for my sister?",
      "decision": {
        "choice": "counter_offer",
        "probabilities": {
          "accept": 0.1,
          "counter_offer": 0.7,
          "send_sample_first": 0.15,
          "decline": 0.05
        },
        "confidence": 0.7
      },
      "text": "Placeholder reply until the live recording lands. Jun, Kinetik",
      "ms": {
        "decide": 0.01,
        "guard": 0.01,
        "draft": 0.02
      }
    }
  }
};
