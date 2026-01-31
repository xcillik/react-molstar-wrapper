import type { Protein } from "../lib";

export const proteins1: Protein[] = [
  {
    uniProtId: "P69905",
  },
  {
    uniProtId: "A0A2J8INE6",
    superposition: {
      rotation: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ] as [
        [number, number, number],
        [number, number, number],
        [number, number, number],
      ],
      translation: [0, 0, 0] as [number, number, number],
    },
  },
];

export const proteins2: Protein[] = [
  {
    uniProtId: "A0A2N7XP94",
    chopping: [
      {
        label: "Domain 1",
        showLabel: true,
        ranges: [
          { start: 1, end: 5 },
          { start: 10, end: 45 },
        ],
      },
      {
        label: "Domain 2",
        showLabel: true,
        ranges: [{ start: 400, end: 500 }],
      },
      {
        label: "Domain 3",
        ranges: [{ start: 530, end: 570 }],
      },
      {
        label: "Domain 4",
        ranges: [{ start: 600, end: 680 }],
      },
      {
        label: "Domain 5",
        ranges: [{ start: 720, end: 850 }],
      },
      {
        label: "Domain 6",
        ranges: [{ start: 900, end: 950 }],
      },
    ],
  },
  {
    uniProtId: "A0A502HNZ2",
    chopping: [
      {
        label: "Domain 1",
        ranges: [{ start: 1, end: 30 }],
      },
      {
        label: "Domain 2",
        ranges: [{ start: 100, end: 160 }],
      },
      {
        label: "Domain 3",
        ranges: [{ start: 180, end: 230 }],
      },
      {
        label: "Domain 4",
        ranges: [{ start: 250, end: 300 }],
      },
      {
        label: "Domain 5",
        ranges: [{ start: 320, end: 380 }],
      },
      {
        label: "Domain 6",
        ranges: [{ start: 400, end: 450 }],
      },
    ],
  },
];

export const proteins3: Protein[] = [
  {
    uniProtId: "A0A2N7XP94",
  },
  { uniProtId: "A0A448DWS8" },
  { uniProtId: "A0A2T5SU65" },
];

export const proteins4: Protein[] = [
  {
    uniProtId: "A0A2N7XP94",
    chopping: [
      {
        label: "Domain 1",
        showLabel: true,
        ranges: [
          { start: 1, end: 100 },
          { start: 150, end: 300 },
        ],
      },
    ],
  },
];

export const proteins5: Protein[] = [
  {
    uniProtId: "A0A2J8INE6",
    chopping: [
      {
        label: "Domain 1",
        showLabel: false,
        ranges: [{ start: 1, end: 50 }],
      },
    ],
  },
  {
    uniProtId: "P68871",
    chopping: [
      {
        label: "Hemoglobin subunit beta",
        showLabel: false,
        ranges: [{ start: 1, end: 60 }],
      },
    ],
  },
];

export const proteins6: Protein[] = [
  {
    uniProtId: "A0A2N7XP94",
    chopping: [
      {
        label: "Domain 1",
        showLabel: true,
        ranges: [
          { start: 1, end: 5 },
          { start: 10, end: 45 },
        ],
      },
      {
        label: "Domain 2",
        showLabel: true,
        ranges: [{ start: 400, end: 500 }],
      },
      {
        label: "Domain 3",
        showLabel: true,
        ranges: [{ start: 530, end: 570 }],
      },
      {
        label: "Domain 4",
        showLabel: true,
        ranges: [{ start: 600, end: 680 }],
      },
      {
        label: "Domain 5",
        showLabel: true,
        ranges: [{ start: 720, end: 850 }],
      },
      {
        label: "Domain 6",
        showLabel: true,
        ranges: [{ start: 900, end: 950 }],
      },
    ],
  },
];
