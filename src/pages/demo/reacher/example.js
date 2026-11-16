// Example runs shown without a demo key (preview mode) and on first load.
// Recorded from live runs of the deployed routes on 2026-11-16 (deepseek/deepseek-v3.2, Jev): only the model outputs
// are stored here (Jev's fit scores, acceptance estimates and next action, the LLM's whys, invite
// and reply text, and the live stage timings). The filter, ranking, guardrails and output checks
// re-run in the browser on the same code the API uses. Regenerate with the recorder described in
// README.md; never edit the outputs by hand.

export const EXAMPLE_META = {
  "recorded": "2026-11-16",
  "model": "deepseek/deepseek-v3.2"
};

export const EXAMPLES = {
  "serum": {
    "rank": {
      "fit": {
        "c01": {
          "score": 3.99,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0,
            "3": 0.01,
            "4": 0.99
          }
        },
        "c07": {
          "score": 3.74,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0.01,
            "3": 0.24,
            "4": 0.75
          }
        },
        "c03": {
          "score": 3.98,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0,
            "3": 0.01,
            "4": 0.99
          }
        },
        "c06": {
          "score": 3.96,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0,
            "3": 0.04,
            "4": 0.96
          }
        },
        "c02": {
          "score": 3.61,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0.04,
            "3": 0.31,
            "4": 0.65
          }
        },
        "c05": {
          "score": 3.94,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0,
            "3": 0.05,
            "4": 0.95
          }
        },
        "c09": {
          "score": 2.16,
          "probabilities": {
            "0": 0,
            "1": 0.13,
            "2": 0.62,
            "3": 0.22,
            "4": 0.03
          }
        },
        "c11": {
          "score": 3.76,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0.02,
            "3": 0.2,
            "4": 0.78
          }
        },
        "c12": {
          "score": 3.11,
          "probabilities": {
            "0": 0,
            "1": 0.02,
            "2": 0.11,
            "3": 0.62,
            "4": 0.25
          }
        },
        "c13": {
          "score": 3.97,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0,
            "3": 0.03,
            "4": 0.97
          }
        },
        "c14": {
          "score": 3.82,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0,
            "3": 0.16,
            "4": 0.84
          }
        },
        "c16": {
          "score": 1.09,
          "probabilities": {
            "0": 0.11,
            "1": 0.7,
            "2": 0.18,
            "3": 0.01,
            "4": 0
          }
        }
      },
      "accept": {
        "c01": 0.46,
        "c13": 0.8,
        "c05": 0.84,
        "c03": 0.76,
        "c14": 0.71,
        "c06": 0.65,
        "c07": 0.23,
        "c11": 0.74,
        "c02": 0.16,
        "c12": 0.18
      },
      "why": {
        "c05": "Their usual 12% commission is lower than your 15% offer, and they read ingredient lists aloud.",
        "c13": "She rates every product she finishes and 75% of her audience matches your target.",
        "c03": "Their hyperpigmentation progress series is a perfect fit for a Vitamin C serum.",
        "c11": "They provide honest verdicts for deeper skin tones, which is a key consideration for serums.",
        "c14": "Their Sunday reset vlogs integrate skincare, showing products in a holistic routine.",
        "c06": "Their night-routine ASMR format showcases product application to a highly targeted audience.",
        "c01": "They conduct 7-day texture test series, providing in-depth proof of concept for serums.",
        "c07": "Their 30-day trial format is compelling, but their 20% commission ask is higher than your offer."
      },
      "ms": {
        "filter": 0.57,
        "fit": 186.71,
        "accept": 117.9,
        "pick": 10433.17
      }
    },
    "invite": {
      "creatorId": "c05",
      "text": "Hey Lena! I love your lab notes series where you grade formulas on the whiteboard. We have a product that's right up your alley: the Glow Shot 15% Vitamin C Serum with ferulic acid. We’d love to send you a free sample, shipped to you at no cost, and offer you 15% commission on all TikTok Shop sales. If you’re interested, just reply ‘yes’ with your shipping address.\n\nAva, Lumora Skin",
      "ms": 3771
    },
    "reply": {
      "creatorId": "c05",
      "reply": "Love it! Can you do 20% and send 2 samples first?",
      "decision": {
        "choice": "counter_offer",
        "probabilities": {
          "accept": 0,
          "counter_offer": 1,
          "send_sample_first": 0,
          "decline": 0
        },
        "confidence": 1
      },
      "text": "Thanks for asking! We can offer 18% commission and 1 free sample—this is the best we can do on Glow Shot. If that works, please share your shipping address. \n\nAva, Lumora Skin",
      "ms": {
        "decide": 71.46,
        "guard": 0.29,
        "draft": 1960.22
      }
    }
  },
  "bar": {
    "rank": {
      "fit": {
        "c18": {
          "score": 2.12,
          "probabilities": {
            "0": 0,
            "1": 0.17,
            "2": 0.57,
            "3": 0.22,
            "4": 0.04
          }
        },
        "c17": {
          "score": 3.9,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0,
            "3": 0.09,
            "4": 0.91
          }
        },
        "c19": {
          "score": 3.11,
          "probabilities": {
            "0": 0,
            "1": 0.01,
            "2": 0.2,
            "3": 0.47,
            "4": 0.32
          }
        },
        "c22": {
          "score": 3.3,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0.15,
            "3": 0.38,
            "4": 0.47
          }
        },
        "c14": {
          "score": 2.41,
          "probabilities": {
            "0": 0,
            "1": 0.05,
            "2": 0.57,
            "3": 0.3,
            "4": 0.08
          }
        },
        "c20": {
          "score": 2.74,
          "probabilities": {
            "0": 0,
            "1": 0.04,
            "2": 0.38,
            "3": 0.37,
            "4": 0.21
          }
        },
        "c23": {
          "score": 1.28,
          "probabilities": {
            "0": 0.02,
            "1": 0.69,
            "2": 0.28,
            "3": 0.01,
            "4": 0
          }
        },
        "c24": {
          "score": 3.65,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0.04,
            "3": 0.25,
            "4": 0.71
          }
        },
        "c37": {
          "score": 3.05,
          "probabilities": {
            "0": 0,
            "1": 0.02,
            "2": 0.2,
            "3": 0.49,
            "4": 0.29
          }
        },
        "c25": {
          "score": 3.56,
          "probabilities": {
            "0": 0,
            "1": 0.01,
            "2": 0.08,
            "3": 0.26,
            "4": 0.65
          }
        },
        "c40": {
          "score": 1.88,
          "probabilities": {
            "0": 0.01,
            "1": 0.26,
            "2": 0.59,
            "3": 0.13,
            "4": 0.01
          }
        }
      },
      "accept": {
        "c19": 0.8,
        "c22": 0.73,
        "c37": 0.44,
        "c17": 0.24,
        "c25": 0.47,
        "c14": 0.48,
        "c24": 0.18,
        "c40": 0.41,
        "c20": 0.13,
        "c18": 0.44
      },
      "why": {
        "c19": "He tests fuel on long runs and rates how well it sits.",
        "c22": "She shows what fits in her scrub pockets during 12-hour shifts.",
        "c25": "His content features cheap high-protein grocery hauls with cost-per-gram math.",
        "c37": "His climbing and trail run videos include POV shots from the wall.",
        "c14": "Her Sunday reset vlogs integrate meal prep into wellness routines.",
        "c17": "His \"what I eat in a day\" videos overlay macros on screen.",
        "c18": "She packs lunchboxes for her kids with a running cost tally.",
        "c40": "Her hours-long study-with-me sessions feature desk snacks in frame."
      },
      "ms": {
        "filter": 0.09,
        "fit": 183.52,
        "accept": 128.36,
        "pick": 3995.32
      }
    },
    "invite": {
      "creatorId": "c19",
      "text": "Hey Dev, I follow your marathon training log and how you test fuel on long runs. Have you tried Stackd Protein Bars? 20g protein, 2g sugar, 210 calories. Soft-baked, not chalky. We'll send you a free 12-pack (shipping's on us) and you'll earn 12% commission on every sale from your TikTok Shop. Reply 'yes' with your shipping address to get started.\n\nTheo, Stackd Snacks",
      "ms": 3896
    },
    "reply": {
      "creatorId": "c19",
      "reply": "Love these! Can you do 18% and send 3 boxes first?",
      "decision": {
        "choice": "counter_offer",
        "probabilities": {
          "accept": 0,
          "counter_offer": 1,
          "send_sample_first": 0,
          "decline": 0
        },
        "confidence": 1
      },
      "text": "Thanks Dev! We can do 15% and send 2 boxes. That's the best we can offer on this bar. What's your shipping address?\n\nTheo, Stackd Snacks",
      "ms": {
        "decide": 57.67,
        "guard": 0.1,
        "draft": 2089.36
      }
    }
  },
  "gimbal": {
    "rank": {
      "fit": {
        "c33": {
          "score": 1.52,
          "probabilities": {
            "0": 0.01,
            "1": 0.48,
            "2": 0.49,
            "3": 0.02,
            "4": 0
          }
        },
        "c30": {
          "score": 3.79,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0.04,
            "3": 0.12,
            "4": 0.84
          }
        },
        "c32": {
          "score": 3.6,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0.09,
            "3": 0.21,
            "4": 0.7
          }
        },
        "c29": {
          "score": 3.52,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0.06,
            "3": 0.36,
            "4": 0.58
          }
        },
        "c31": {
          "score": 3.97,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0,
            "3": 0.03,
            "4": 0.97
          }
        },
        "c34": {
          "score": 3.45,
          "probabilities": {
            "0": 0,
            "1": 0,
            "2": 0.09,
            "3": 0.37,
            "4": 0.54
          }
        },
        "c35": {
          "score": 3.26,
          "probabilities": {
            "0": 0,
            "1": 0.01,
            "2": 0.19,
            "3": 0.33,
            "4": 0.47
          }
        },
        "c37": {
          "score": 3.3,
          "probabilities": {
            "0": 0,
            "1": 0.02,
            "2": 0.23,
            "3": 0.2,
            "4": 0.55
          }
        },
        "c40": {
          "score": 1.93,
          "probabilities": {
            "0": 0,
            "1": 0.24,
            "2": 0.59,
            "3": 0.16,
            "4": 0.01
          }
        }
      },
      "accept": {
        "c31": 0.44,
        "c37": 0.42,
        "c29": 0.15,
        "c30": 0.22,
        "c32": 0.21,
        "c34": 0.08,
        "c35": 0.59,
        "c33": 0.52,
        "c40": 0.34
      },
      "why": {
        "c35": "Her daily college vlogs are filmed while walking, so a gimbal would directly improve her content.",
        "c31": "He creates phone cinematography tips and could demonstrate the gimbal's before-and-after effect.",
        "c37": "He films climbing and trail runs one-handed, a scenario where a gimbal would be beneficial.",
        "c30": "Her travel content features handheld walking tours where she often apologizes for shaky footage.",
        "c33": "His content focuses on desk setups, which is a low fit for a mobile filming accessory.",
        "c32": "She films twin-toddler chaos on her phone and asks followers how they film events.",
        "c40": "Her study-with-me sessions feature gadgets, but the focus is stationary, not active filming.",
        "c29": "He does quick tech unboxings and verdicts, offering high reach for a phone accessory."
      },
      "ms": {
        "filter": 0.07,
        "fit": 129.52,
        "accept": 86.97,
        "pick": 11461.08
      }
    },
    "invite": {
      "creatorId": "c35",
      "text": "Leah, I love your daily college vlogs filmed while walking to class. For those steady walking shots, I’d like to send you the Orbit 3-Axis Phone Gimbal. It folds to pocket size with face tracking and an 8-hour battery. We offer 10% commission on TikTok Shop sales and one free sample shipped to you for free. If you’re interested, just reply “yes” with your shipping address.\n\nJun, Kinetik",
      "ms": 3006
    },
    "reply": {
      "creatorId": "c35",
      "reply": "This is cool! Can you do 16% and send 2 units, one for my sister?",
      "decision": {
        "choice": "counter_offer",
        "probabilities": {
          "accept": 0,
          "counter_offer": 1,
          "send_sample_first": 0,
          "decline": 0
        },
        "confidence": 1
      },
      "text": "Thanks for asking! We can offer 14% commission and one free sample for the Orbit Gimbal. This is the best we can do on this product. If that works, please share your shipping address.\n\nJun, Kinetik",
      "ms": {
        "decide": 96.02,
        "guard": 0.06,
        "draft": 1983.74
      }
    }
  }
};
