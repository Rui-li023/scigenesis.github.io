window.PAPER = {
 "numbers": {
  "instruments": 500,
  "parts": 129254,
  "joints": 6204,
  "screens": 322,
  "mechanisms": 12,
  "substances": 49,
  "manuals": 720,
  "bench1_questions": 823,
  "bench1_instruments": 224,
  "bench1_tracks": {
   "Part grounding": 203,
   "Reading understanding": 107,
   "Action grounding": 283,
   "Readiness judgment": 230
  },
  "bench2_tasks": 35,
  "bench2_levels": {
   "L1": 20,
   "L2": 10,
   "L3": 5
  },
  "exp3_tasks": 5,
  "disciplines": {
   "common": 165,
   "chemistry": 109,
   "biology": 62,
   "medical_laboratory": 54,
   "physics": 110
  }
 },
 "models": [
  {
   "name": "GPT-6.1 Sol",
   "group": "Proprietary",
   "parts": 94.1,
   "reading": 86.9,
   "action": 78.1,
   "readiness": 62.6,
   "all": 78.9,
   "l1": [
    16,
    20
   ],
   "l2": [
    4,
    10
   ],
   "l3": [
    1,
    5
   ],
   "sub": [
    90.2,
    71.6,
    51.8
   ]
  },
  {
   "name": "GPT-6.1 Terra",
   "group": "Proprietary",
   "parts": 94.1,
   "reading": 71.0,
   "action": 77.7,
   "readiness": 62.6,
   "all": 76.7,
   "l1": [
    14,
    20
   ],
   "l2": [
    5,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    91.5,
    75.4,
    32.5
   ]
  },
  {
   "name": "Gemini 4 Argon",
   "group": "Proprietary",
   "parts": 54.7,
   "reading": 90.7,
   "action": 58.3,
   "readiness": 58.7,
   "all": 61.7,
   "l1": [
    12,
    20
   ],
   "l2": [
    3,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    73.5,
    56.3,
    21.9
   ]
  },
  {
   "name": "Claude Sonnet 5.5",
   "group": "Proprietary",
   "parts": 90.1,
   "reading": 86.9,
   "action": 78.4,
   "readiness": 67.0,
   "all": 79.2,
   "l1": [
    9,
    20
   ],
   "l2": [
    3,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    66.6,
    54.1,
    24.2
   ]
  },
  {
   "name": "Claude Haiku 5.5",
   "group": "Proprietary",
   "parts": 84.2,
   "reading": 70.1,
   "action": 72.1,
   "readiness": 54.4,
   "all": 69.9,
   "l1": [
    9,
    20
   ],
   "l2": [
    1,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    56.2,
    58.0,
    19.6
   ]
  },
  {
   "name": "Qwen3.8-Max",
   "group": "Proprietary",
   "parts": 76.8,
   "reading": 76.6,
   "action": 68.2,
   "readiness": 64.8,
   "all": 70.5,
   "l1": [
    14,
    20
   ],
   "l2": [
    3,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    89.4,
    57.7,
    25.8
   ]
  },
  {
   "name": "Kimi K3.1 Pro",
   "group": "Open-weight",
   "parts": 87.7,
   "reading": 70.1,
   "action": 82.0,
   "readiness": 61.3,
   "all": 76.1,
   "l1": [
    13,
    20
   ],
   "l2": [
    4,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    84.4,
    65.5,
    29.2
   ]
  },
  {
   "name": "GLM-5.3-Flash",
   "group": "Open-weight",
   "parts": 77.8,
   "reading": 65.4,
   "action": 67.1,
   "readiness": 56.5,
   "all": 66.6,
   "l1": [
    10,
    20
   ],
   "l2": [
    3,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    74.6,
    52.9,
    33.9
   ]
  },
  {
   "name": "Qwen3.8-Flash-Next",
   "group": "Open-weight",
   "parts": 72.4,
   "reading": 65.4,
   "action": 68.6,
   "readiness": 58.3,
   "all": 66.2,
   "l1": [
    13,
    20
   ],
   "l2": [
    3,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    77.3,
    59.8,
    20.8
   ]
  },
  {
   "name": "Qwen3.8-27B",
   "group": "Open-weight",
   "parts": 59.1,
   "reading": 61.7,
   "action": 58.7,
   "readiness": 49.6,
   "all": 56.6,
   "l1": [
    12,
    20
   ],
   "l2": [
    2,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    76.1,
    38.9,
    14.7
   ]
  },
  {
   "name": "DeepSeek-V4.1-Flash-1017",
   "group": "Open-weight",
   "parts": 25.1,
   "reading": 53.3,
   "action": 39.6,
   "readiness": 33.9,
   "all": 36.2,
   "l1": [
    13,
    20
   ],
   "l2": [
    4,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    76.9,
    55.6,
    23.4
   ]
  },
  {
   "name": "MiMo-V2.6-Pro",
   "group": "Open-weight",
   "parts": 53.2,
   "reading": 51.4,
   "action": 63.3,
   "readiness": 42.6,
   "all": 53.5,
   "l1": [
    10,
    20
   ],
   "l2": [
    2,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    67.5,
    46.5,
    0.0
   ]
  },
  {
   "name": "Intern-S2-397B",
   "group": "Open-weight",
   "parts": 54.7,
   "reading": 62.6,
   "action": 56.2,
   "readiness": 47.4,
   "all": 54.2,
   "l1": [
    1,
    20
   ],
   "l2": [
    0,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    19.8,
    6.9,
    0.0
   ]
  },
  {
   "name": "Gemma-4-31B",
   "group": "Open-weight",
   "parts": 8.9,
   "reading": 23.4,
   "action": 25.1,
   "readiness": 33.5,
   "all": 23.2,
   "l1": [
    0,
    20
   ],
   "l2": [
    0,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    0.0,
    1.0,
    0.0
   ]
  },
  {
   "name": "Step3-VL-10B",
   "group": "Open-weight",
   "parts": 11.3,
   "reading": 31.8,
   "action": 21.9,
   "readiness": 27.8,
   "all": 22.2,
   "l1": [
    0,
    20
   ],
   "l2": [
    0,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    0.0,
    0.0,
    0.0
   ]
  },
  {
   "name": "RoboBrain 2.5",
   "group": "Embodied",
   "parts": 25.6,
   "reading": 7.5,
   "action": 18.7,
   "readiness": 26.5,
   "all": 21.1,
   "l1": [
    0,
    20
   ],
   "l2": [
    0,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    0.0,
    0.0,
    0.0
   ]
  },
  {
   "name": "Molmo2-ER",
   "group": "Embodied",
   "parts": 1.0,
   "reading": 1.9,
   "action": 0.0,
   "readiness": 4.8,
   "all": 1.8,
   "l1": [
    0,
    20
   ],
   "l2": [
    0,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    0.0,
    0.0,
    0.0
   ]
  },
  {
   "name": "Embodied-R1.5",
   "group": "Embodied",
   "parts": 37.9,
   "reading": 7.5,
   "action": 19.4,
   "readiness": 32.6,
   "all": 26.1,
   "l1": [
    0,
    20
   ],
   "l2": [
    0,
    10
   ],
   "l3": [
    0,
    5
   ],
   "sub": [
    0.0,
    0.0,
    0.0
   ]
  }
 ],
 "vla": [
  {
   "name": "π0.5",
   "tasks": [
    62,
    32,
    26,
    16,
    20
   ],
   "avg": 31
  },
  {
   "name": "SmolVLA",
   "tasks": [
    18,
    16,
    24,
    16,
    32
   ],
   "avg": 21
  },
  {
   "name": "OpenWAM",
   "tasks": [
    50,
    46,
    16,
    84,
    4
   ],
   "avg": 40
  },
  {
   "name": "LingBot-VLA 2.0",
   "tasks": [
    16,
    42,
    28,
    0,
    0
   ],
   "avg": 17
  }
 ],
 "vla_tasks": [
  "Cuvette",
  "Vortex",
  "Balance",
  "Cab. load",
  "Cab. unload"
 ],
 "real": [
  {
   "name": "π0.5",
   "sim": 62,
   "real": 52
  },
  {
   "name": "OpenWAM",
   "sim": 76,
   "real": 70
  }
 ],
 "manual": [
  {
   "name": "GPT-6.1 Terra",
   "vals": [
    70.0,
    91.5,
    100.0,
    100.0,
    55.0,
    75.7
   ]
  },
  {
   "name": "DeepSeek-V4.1-Flash",
   "vals": [
    65.0,
    76.9,
    75.0,
    87.3,
    35.0,
    50.6
   ]
  }
 ]
};
