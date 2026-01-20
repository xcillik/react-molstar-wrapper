import type {
  ColorHEX,
  InitialUI,
  ModelSourceUrls,
  Protein,
} from "../core/types";
import type { MVSData } from "molstar/lib/extensions/mvs/mvs-data.d.ts";

export type Props = {
  // Disjoint union: either provide `proteins` (and not `mvs`) or provide `mvs` (and not `proteins`).
  // This uses `never` to forbid the other field when one is present.
} & (
  | { proteins: Protein[]; mvs?: never }
  | { mvs: MVSData; proteins?: never }
) & {
    modelSourceUrls?: Partial<ModelSourceUrls>;

    initialUI?: InitialUI;

    bgColor?: ColorHEX;

    // Disjoint union: at most one of `spin` or `rock` may be provided.
    // Provide one as true to enable that motion, or omit both for none.
  } & (
    | { spin: boolean; rock?: never }
    | { rock: boolean; spin?: never }
    | { spin?: never; rock?: never }
  ) & {
    spinSpeed?: number;
    rockSpeed?: number;
    height?: number;
    className?: React.HTMLAttributes<HTMLDivElement>["className"];
  };

export type ViewerRef = {
  highlight: (proteinIndex: number, label: string) => Promise<void>;
  reset: () => Promise<void>;
  updateSuperposition: (
    proteinIndex: number,
    translation?: [number, number, number],
    rotation?: [
      [number, number, number],
      [number, number, number],
      [number, number, number],
    ]
  ) => Promise<void>;
};
