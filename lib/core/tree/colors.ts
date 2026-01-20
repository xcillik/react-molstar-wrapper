import type { ColorHEX } from "../types";
import type {
  ComponentExpressionT,
  ComponentSelectorT,
} from "molstar/lib/extensions/mvs/tree/mvs/param-types";

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
const MULTI_PROTEIN_OPACITY_MAX = 0.5;
const MULTI_PROTEIN_OPACITY_MIN = 0.1;
const ALPHAFOLD_CONFIDENCE_COLORS = {
  veryHigh: "#0053D6" as ColorHEX,
  confident: "#65CBF3" as ColorHEX,
  low: "#FFDB13" as ColorHEX,
  veryLow: "#FF7D45" as ColorHEX,
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

  const expanded =
    withoutHash.length === 3
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
  const channelToHex = (channel: number) =>
    channel.toString(16).padStart(2, "0");
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`.toUpperCase() as ColorHEX;
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

function getBaseColor(colors: ColorHEX[], index: number): ColorHEX {
  return colors[index] ?? BASE_COLOR_GREY;
}

function getOpacityForProtein(
  index: number,
  totalProteins: number
): number | undefined {
  if (totalProteins < 3 || index === 0) {
    return undefined;
  }

  const range = MULTI_PROTEIN_OPACITY_MAX - MULTI_PROTEIN_OPACITY_MIN;
  const step = range / (totalProteins - 1);
  return Math.max(
    MULTI_PROTEIN_OPACITY_MIN,
    MULTI_PROTEIN_OPACITY_MAX - (index - 1) * step
  );
}

function applyFlatColor(
  representation: any,
  color: ColorHEX,
  selector?: ComponentSelectorT | ComponentExpressionT | ComponentExpressionT[]
) {
  const params: {
    color: ColorHEX;
    selector?:
      | ComponentSelectorT
      | ComponentExpressionT
      | ComponentExpressionT[];
  } = { color };

  if (selector) {
    params.selector = selector;
  }

  representation.color(params);
}

function applyAlphaFoldConfidenceColor(
  struct: any,
  component: any,
  representation: any
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
      throw new Error(
        "At least two domains are required to infer domain colors"
      );
    }

    return ["#FF999C", "#C8EAFF", "#8D272B", "#86AEC6"];
  }

  if (count === 1) {
    return [BASE_COLOR_BLUE];
  }

  if (count === 2) {
    return [BASE_COLOR_BLUE, BASE_COLOR_YELLOW];
  }

  return [BASE_COLOR_YELLOW, ...Array(count - 1).fill(BASE_COLOR_GREY)];
}

export {
  BASE_COLOR_BLUE,
  BASE_COLOR_GREY,
  BASE_COLOR_YELLOW,
  MULTI_DOMAIN_COLORS,
  makeShades,
  getBaseColor,
  getOpacityForProtein,
  applyFlatColor,
  applyAlphaFoldConfidenceColor,
  inferColors,
};
