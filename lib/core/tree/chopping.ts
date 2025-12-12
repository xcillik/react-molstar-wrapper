import type { Protein } from "../types";

type NormalizedChoppingEntry = {
  label: string;
  showLabel: boolean;
  ranges: { start: number; end: number }[];
};

function normalizeChoppingData(chopping?: Protein["chopping"]): NormalizedChoppingEntry[] {
  if (!chopping) {
    return [];
  }

  return chopping
    .map((entry) => ({
      label: entry.label,
      showLabel: entry.showLabel,
      ranges: entry.ranges
        .map((range) => ({
          start: Math.min(range.start, range.end),
          end: Math.max(range.start, range.end),
        }))
        .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end)),
    }))
    .filter((entry) => entry.ranges.length > 0);
}

export type { NormalizedChoppingEntry };
export { normalizeChoppingData };
