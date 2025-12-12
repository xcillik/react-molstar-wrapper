import type {
  ColorHEX,
  Matrix3D,
  Matrix3DFlattened,
  ModelSourceUrls,
  Protein,
  Vector3D,
} from "../types";
import type { MVSData } from "molstar/lib/extensions/mvs/mvs-data.d.ts";
import type {
  ComponentExpressionT,
  ComponentSelectorT,
} from "molstar/lib/extensions/mvs/tree/mvs/param-types";
// import type { MVSTree } from "molstar/lib/extensions/mvs/tree/mvs/mvs-tree.d.ts";
import type { Plugin } from "../Plugin";
import { createMVSBuilder, Root } from "molstar/lib/extensions/mvs/tree/mvs/mvs-builder";

function transposeAndFlatten(matrix: Matrix3D): Matrix3DFlattened {
  return matrix[0].flatMap((_, colIndex) =>
    matrix.map((row) => row[colIndex]),
  ) as Matrix3DFlattened;
}

const DEFAULT_ROTATION: Matrix3D = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const DEFAULT_TRANSLATION: Vector3D = [0, 0, 0];

type RGB = [number, number, number];

type ShadeMode = "lighten" | "darken" | "base";

const SHADE_STEPS: { mode: ShadeMode; factor: number }[] = [
  { mode: "lighten", factor: 0.5 },
  { mode: "lighten", factor: 0.25 },
  { mode: "base", factor: 0 },
  { mode: "darken", factor: 0.1 },
  { mode: "darken", factor: 0.25 },
  { mode: "darken", factor: 0.4 },
];

const BASE_COLOR_YELLOW: ColorHEX = "#FD9D0D";
const BASE_COLOR_BLUE: ColorHEX = "#0D6EFD";
const BASE_COLOR_GREY: ColorHEX = "#F0F0F0";
const REST_OPACITY = 0.15;
const MULTI_PROTEIN_OPACITY_MAX = 0.5;
const MULTI_PROTEIN_OPACITY_MIN = 0.1;
const ALPHAFOLD_CONFIDENCE_COLORS = {
  veryHigh: "#0053D6" as ColorHEX,
  confident: "#65CBF3" as ColorHEX,
  low: "#FFDB13" as ColorHEX,
  veryLow: "#FF7D45" as ColorHEX,
};

const MULTI_DOMAIN_COLORS: ColorHEX[] = [
  "#4e79a7",
  "#f28e2c",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc949",
  "#af7aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
] as ColorHEX[];

type NormalizedChoppingEntry = {
  label: string;
  showLabel: boolean;
  ranges: { start: number; end: number }[];
};

function normalizeHexColor(hex: ColorHEX): ColorHEX {
  const trimmed = hex.trim();
  const withoutHash = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (withoutHash.length !== 3 && withoutHash.length !== 6) {
    throw new Error("Only 3 or 6 digit hex colors are supported");
  }

  if (!/^[0-9A-Fa-f]+$/.test(withoutHash)) {
    throw new Error("Invalid hex color value");
  }

  const expanded = withoutHash.length === 3
    ? withoutHash
        .split("")
        .map((char) => char + char)
        .join("")
    : withoutHash;

  return `#${expanded.toUpperCase()}` as ColorHEX;
}

function hexToRgb(hex: ColorHEX): RGB {
  const normalized = normalizeHexColor(hex);
  return [
    parseInt(normalized.slice(1, 3), 16),
    parseInt(normalized.slice(3, 5), 16),
    parseInt(normalized.slice(5, 7), 16),
  ];
}

function rgbToHex([r, g, b]: RGB): ColorHEX {
  const channelToHex = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`
    .toUpperCase() as ColorHEX;
}

function mixChannel(value: number, target: number, factor: number) {
  return Math.round(value + (target - value) * factor);
}

function lightenColor([r, g, b]: RGB, factor: number): RGB {
  return [
    mixChannel(r, 255, factor),
    mixChannel(g, 255, factor),
    mixChannel(b, 255, factor),
  ];
}

function darkenColor([r, g, b]: RGB, factor: number): RGB {
  return [
    mixChannel(r, 0, factor),
    mixChannel(g, 0, factor),
    mixChannel(b, 0, factor),
  ];
}

function makeShades(color: ColorHEX, count: number): ColorHEX[] {
  if (count < 1) {
    throw new Error("Count must be at least 1");
  }

  const baseColor = hexToRgb(color);
  const palette = SHADE_STEPS.map((step) => {
    if (step.mode === "lighten") {
      return rgbToHex(lightenColor(baseColor, step.factor));
    }

    if (step.mode === "darken") {
      return rgbToHex(darkenColor(baseColor, step.factor));
    }

    return rgbToHex(baseColor);
  });

  const shades: ColorHEX[] = [];
  for (let i = 0; i < count; i++) {
    shades.push(palette[i % palette.length]!);
  }

  return shades;
}

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

function getBaseColor(colors: ColorHEX[], index: number): ColorHEX {
  return colors[index] ?? BASE_COLOR_GREY;
}

function getOpacityForProtein(index: number, totalProteins: number): number | undefined {
  if (totalProteins < 3 || index === 0) {
    return undefined;
  }

  // Map opacity linearly from MAX (at index 1) to MIN (at last index)
  const range = MULTI_PROTEIN_OPACITY_MAX - MULTI_PROTEIN_OPACITY_MIN;
  const step = range / (totalProteins - 1);
  return Math.max(
    MULTI_PROTEIN_OPACITY_MIN,
    MULTI_PROTEIN_OPACITY_MAX - (index - 1) * step,
  );
}

function applyFlatColor(
  representation: any,
  color: ColorHEX,
  selector?: ComponentSelectorT | ComponentExpressionT | ComponentExpressionT[],
) {
  const params: {
    color: ColorHEX;
    selector?: ComponentSelectorT | ComponentExpressionT | ComponentExpressionT[];
  } = { color };

  if (selector) {
    params.selector = selector;
  }

  representation.color(params);
}

function applyAlphaFoldConfidenceColor(
  struct: any,
  component: any,
  representation: any,
) {
  representation.colorFromSource({
    schema: "all_atomic",
    category_name: "atom_site",
    field_name: "B_iso_or_equiv",
    palette: {
      kind: "discrete",
      mode: "absolute",
      colors: [
        [ALPHAFOLD_CONFIDENCE_COLORS.veryLow, 0],
        [ALPHAFOLD_CONFIDENCE_COLORS.low, 50],
        [ALPHAFOLD_CONFIDENCE_COLORS.confident, 70],
        [ALPHAFOLD_CONFIDENCE_COLORS.veryHigh, 90],
      ],
    },
  });

  component.tooltip({ text: "pLDDT:" });
  struct.tooltipFromSource({
    schema: "all_atomic",
    category_name: "atom_site",
    field_name: "B_iso_or_equiv",
  });
}


function inferColors(count: number, domains?: number): ColorHEX[] {
  if (count < 0) {
    throw new Error("Count must be non-negative");
  }

  if (count === 0) {
    return [];
  }

  if (domains !== undefined) {
    if (domains <= 1) {
      throw new Error("At least two domains are required to infer domain colors");
    }

    return ["#FF999C", "#C8EAFF", "#8D272B", "#86AEC6"];
  }

  if (count === 1) {
    return [BASE_COLOR_YELLOW];
  }

  if (count === 2) {
    return [BASE_COLOR_YELLOW, BASE_COLOR_BLUE];
  }

  return [BASE_COLOR_YELLOW, ...Array(count - 1).fill(BASE_COLOR_GREY)];
}

function prepareModelSourceUrl(
  protein: Protein,
  modelSourceUrls: Partial<ModelSourceUrls>,
  plugin?: Plugin,
) {
  const defaultModelSourceUrls = {
    uniProtId: "https://alphafold.ebi.ac.uk/files",
  };

  let url: string;

  if (protein.file) {
    if (!plugin) {
      throw new Error(
        "Plugin instance is required to create object URL from file",
      );
    }

    url = plugin.createObjectUrlFromFile(protein.file);
  } else if (modelSourceUrls.uniProtId !== undefined) {
    url = modelSourceUrls.uniProtId(protein.uniProtId);
  } else {
    url = `${defaultModelSourceUrls.uniProtId}/AF-${protein.uniProtId}-F1-model_v6.cif`;
  }

  return url;
}

function getParseFormat(protein: Protein): "mmcif" | "pdb" {
  if (!protein.file) {
    return "mmcif";
  }

  return protein.file.name.endsWith(".cif") ||
    protein.file.name.endsWith(".mmcif")
    ? "mmcif"
    : "pdb";
}

function createChainSelector(protein: Protein) {
  if (!protein.chain) {
    return "all";
  }

  return protein.file
    ? { label_asym_id: protein.chain }
    : { auth_asym_id: protein.chain };
}

function getRepresentationType(protein: Protein, representationType?: string) {
  return representationType ?? protein.representation ?? "cartoon";
}

function createRepresentationParams(
  protein: Protein,
  representationType?: string,
) {
  const repType = getRepresentationType(protein, representationType);

  if (protein.file) {
    return { size_factor: 1, tubular_helices: false, type: repType };
  }

  return { type: repType };
}

function isCartoonLikeRepresentation(repType: string) {
  return repType === "cartoon" || repType === "backbone";
}

function createDomainSelector(
  protein: Protein,
  seqRange?: { beg_auth_seq_id: number; end_auth_seq_id: number },
) {
  if (!protein.chain) {
    return seqRange ?? "all";
  }

  const chainId = protein.file
    ? { label_asym_id: protein.chain }
    : { auth_asym_id: protein.chain };

  return seqRange ? { ...chainId, ...seqRange } : chainId;
}

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

  // Single protein without chopping: use pLDDT coloring
  if (totalProteins === 1) {
    if (isCartoonLikeRepresentation(repType)) {
      applyAlphaFoldConfidenceColor(struct, comp, repr);
    }
    return;
  }

  // For 3+ proteins: first protein gets AlphaFold coloring, others get gray with decreasing opacity
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

  // For exactly 2 proteins: use flat colors
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

  // Determine background color based on context
  let backgroundColor: ColorHEX;
  let restOpacity = REST_OPACITY;
  if (totalProteins === 1 && choppingEntries.length >= 2) {
    // Single protein with 2+ chopping: use light gray
    backgroundColor = BASE_COLOR_GREY;
    restOpacity = 1;
  } else {
    // Other cases: use the inferred base color
    backgroundColor = getBaseColor(colors, proteinIndex);
  }

  applyFlatColor(baseRepr, backgroundColor);
  baseRepr.opacity({ opacity: restOpacity });

  const useInlineDomainColoring = totalProteins === 1 && choppingEntries.length >= 2;

  // Determine domain palette based on protein count and chopping entries
  let domainPalette: ColorHEX[];
  
  if (totalProteins === 1 && choppingEntries.length >= 2) {
    // Single protein with 2+ chopping: use multi-domain color palette
    domainPalette = choppingEntries.map((_, index) => 
      MULTI_DOMAIN_COLORS[index % MULTI_DOMAIN_COLORS.length]!
    );
  } else if (totalProteins === 2 && choppingEntries.length >= 2) {
    // Exactly 2 proteins with 2+ chopping entries each: use solid yellow/blue only
    const baseColorForDomains = proteinIndex === 0 ? BASE_COLOR_YELLOW : BASE_COLOR_BLUE;
    domainPalette = Array(choppingEntries.length).fill(baseColorForDomains);
  } else if (totalProteins === 2 && choppingEntries.length === 1) {
    // Exactly 2 proteins with single chopping: use base color
    domainPalette = [backgroundColor];
  } else {
    // Other cases: use shades of base color
    domainPalette = makeShades(backgroundColor, choppingEntries.length).slice().reverse();
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
  struct.component({ selector: labelSelector }).label({ text: entry.label });
}

function processProtein(
  root: Root,
  protein: Protein,
  proteinIndex: number,
  totalProteins: number,
  colors: ColorHEX[],
  modelSourceUrls: Partial<ModelSourceUrls>,
  plugin?: Plugin,
) {
  const url = prepareModelSourceUrl(protein, modelSourceUrls, plugin);
  const download = root.download({ url });

  const parseFormat = getParseFormat(protein);
  const parse = download.parse({ format: parseFormat });

  const struct = parse.modelStructure(
    protein.file ? { block_header: null, block_index: 0, model_index: 0 } : {},
  );

  struct.transform({
    rotation: transposeAndFlatten(
      protein.superposition?.rotation ?? DEFAULT_ROTATION,
    ),
    translation: protein.superposition?.translation ?? DEFAULT_TRANSLATION,
    rotation_center: [0, 0, 0],
  });

  const choppingEntries = totalProteins >= 3
    ? []
    : normalizeChoppingData(protein.chopping);
  if (choppingEntries.length > 0) {
    renderProteinWithChopping(struct, protein, proteinIndex, totalProteins, colors, choppingEntries);
  } else {
    renderProteinWithoutChopping(
      struct,
      protein,
      proteinIndex,
      totalProteins,
      colors,
    );
  }
}

function createMVS(
  proteins: Protein[],
  modelSourceUrls: Partial<ModelSourceUrls>,
  plugin?: Plugin,
): MVSData {
  const colors = inferColors(proteins.length);

  const root = createMVSBuilder();

  for (let i = 0; i < proteins.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: Safe because of loop condition
    const protein = proteins[i]!;
    processProtein(root, protein, i, proteins.length, colors, modelSourceUrls, plugin);
  }

  return root.getState({
    title: proteins.length > 1 ? "Protein Comparison" : "Protein Visualization",
    description: `Visualization of ${proteins.length} protein(s)`,
  });
}

export {
  createMVS
};
