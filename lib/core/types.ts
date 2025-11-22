export type ColorHEX = `#${string}`; // e.g. "#ff0000"

export type Vector3D = [number, number, number];
export type Matrix3D = [Vector3D, Vector3D, Vector3D];
export type Matrix3DFlattened = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

type Chopping = {
  start: number;
  end: number;
};

export type Protein = {
  // Disjoint union: either provide `uniProtId` (and not `file`) or provide `file` (and not `uniProtId`).
  // This encoding uses `never` to forbid the other field when one is present.
} & (
  | { uniProtId: string; file?: never }
  | { file: File; uniProtId?: never }
) & {
    chain?: string;
    superposition?: {
      rotation: Matrix3D;
      translation: Vector3D;
    } | undefined;
    chopping?: Chopping[] | undefined;
    representation?:
      | "cartoon"
      | "ball_and_stick"
      | "spacefill"
      | "line"
      | "surface"
      | "backbone"; // default: cartoon
  };

export type ModelSourceUrls = {
  uniProtId: string;
};

export type InitialUI = "minimal" | "standard" | "expanded";
