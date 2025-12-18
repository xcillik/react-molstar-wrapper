import type { ColorHEX, Protein } from "../types";
import type { ComponentExpressionT } from "molstar/lib/extensions/mvs/tree/mvs/param-types";
import {
  applyAlphaFoldConfidenceColor,
  applyFlatColor,
  BASE_COLOR_BLUE,
  BASE_COLOR_GREY,
  BASE_COLOR_YELLOW,
  getBaseColor,
  getOpacityForProtein,
  MULTI_DOMAIN_COLORS,
} from "./colors";
import type { NormalizedChoppingEntry } from "./chopping";
import {
  createChainSelector,
  createDomainSelector,
  createRepresentationParams,
  getRepresentationType,
  isCartoonLikeRepresentation,
} from "./selectors";

const REST_OPACITY = 0.15;

function renderProteinWithoutChopping(
  struct: any,
  protein: Protein,
  proteinIndex: number,
  totalProteins: number,
  colors: ColorHEX[],
) {
  const selector = createChainSelector(protein);
  const comp = struct.component({ selector });
  const repType = getRepresentationType(protein);
  const repr = comp.representation(createRepresentationParams(protein, repType));

  if (totalProteins === 1) {
    if (isCartoonLikeRepresentation(repType)) {
      applyAlphaFoldConfidenceColor(struct, comp, repr);
    }
    return;
  }

  if (totalProteins >= 3) {
    if (proteinIndex === 0 && isCartoonLikeRepresentation(repType)) {
      applyAlphaFoldConfidenceColor(struct, comp, repr);
    } else {
      const color = getBaseColor(colors, proteinIndex);
      applyFlatColor(repr, color);
      const opacity = getOpacityForProtein(proteinIndex, totalProteins);
      if (opacity !== undefined) {
        repr.opacity({ opacity });
      }
    }
    return;
  }

  const color = getBaseColor(colors, proteinIndex);
  applyFlatColor(repr, color);

  const opacity = getOpacityForProtein(proteinIndex, totalProteins);
  if (opacity !== undefined && opacity < 1) {
    repr.opacity({ opacity });
  }
}

function renderProteinWithChopping(
  struct: any,
  protein: Protein,
  proteinIndex: number,
  totalProteins: number,
  colors: ColorHEX[],
  choppingEntries: NormalizedChoppingEntry[],
) {
  if (choppingEntries.length === 0) {
    return;
  }

  const selector = createChainSelector(protein);
  const comp = struct.component({ selector });
  const baseRepr = comp.representation(createRepresentationParams(protein));

  let backgroundColor: ColorHEX;
  let restOpacity = REST_OPACITY;
  if (totalProteins === 1 && choppingEntries.length >= 2) {
    backgroundColor = BASE_COLOR_GREY;
    restOpacity = 1;
  } else {
    backgroundColor = getBaseColor(colors, proteinIndex);
  }

  applyFlatColor(baseRepr, backgroundColor);
  baseRepr.opacity({ opacity: restOpacity });

  const useInlineDomainColoring = totalProteins === 1 && choppingEntries.length >= 2;

  let domainPalette: ColorHEX[];

  if (totalProteins === 1 && choppingEntries.length >= 2) {
    domainPalette = choppingEntries.map((_, index) =>
      MULTI_DOMAIN_COLORS[index % MULTI_DOMAIN_COLORS.length]!,
    );
  } else if (totalProteins === 2 && choppingEntries.length >= 2) {
    const baseColorForDomains = proteinIndex === 0 ? BASE_COLOR_BLUE : BASE_COLOR_YELLOW;
    domainPalette = Array(choppingEntries.length).fill(baseColorForDomains);
  } else if (totalProteins === 2 && choppingEntries.length === 1) {
    domainPalette = [backgroundColor];
  } else {
    domainPalette = Array(choppingEntries.length).fill(BASE_COLOR_BLUE);
  }

  if (useInlineDomainColoring) {
    choppingEntries.forEach((entry, entryIndex) => {
      applyDomainColor(baseRepr, protein, entry, domainPalette[entryIndex]!);
      addDomainLabel(struct, protein, entry);
    });
    return;
  }

  choppingEntries.forEach((entry, entryIndex) => {
    renderDomainEntry(struct, protein, entry, domainPalette[entryIndex]!);
  });
}

function applyDomainColor(
  representation: any,
  protein: Protein,
  entry: NormalizedChoppingEntry,
  color: ColorHEX,
) {
  if (entry.ranges.length === 0) {
    return;
  }

  const selectors = entry.ranges.map<ComponentExpressionT>((range) => {
    const seqRange = {
      beg_auth_seq_id: range.start,
      end_auth_seq_id: range.end,
    };
    return createDomainSelector(protein, seqRange) as ComponentExpressionT;
  });

  const selectorParam = selectors.length === 1 ? selectors[0]! : selectors;
  applyFlatColor(representation, color, selectorParam);
}

function renderDomainEntry(
  struct: any,
  protein: Protein,
  entry: NormalizedChoppingEntry,
  color: ColorHEX,
) {
  const reprParams = createRepresentationParams(protein);

  entry.ranges.forEach((range) => {
    const seqRange = {
      beg_auth_seq_id: range.start,
      end_auth_seq_id: range.end,
    };
    const selector = createDomainSelector(protein, seqRange);
    const domainComp = struct.component({ selector });
    const domainRepr = domainComp.representation(reprParams);
    applyFlatColor(domainRepr, color);
  });

  addDomainLabel(struct, protein, entry);
}

function addDomainLabel(
  struct: any,
  protein: Protein,
  entry: NormalizedChoppingEntry,
) {
  if (!entry.showLabel || entry.ranges.length === 0) {
    return;
  }

  const labelRange =
    entry.ranges[Math.floor(entry.ranges.length / 2)] ?? entry.ranges[0]!;
  const labelSelector = createDomainSelector(protein, {
    beg_auth_seq_id: labelRange.start,
    end_auth_seq_id: labelRange.end,
  });
  struct.component({ selector: labelSelector }).label({
    text: entry.label,
  });
}

export { renderProteinWithChopping, renderProteinWithoutChopping };
