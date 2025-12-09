import type {
  ColorHEX,
  Matrix3D,
  Matrix3DFlattened,
  ModelSourceUrls,
  Protein,
  Vector3D,
} from "./types";
import type { MVSData } from "molstar/lib/extensions/mvs/mvs-data.d.ts";
import type { MVSTree } from "molstar/lib/extensions/mvs/tree/mvs/mvs-tree.d.ts";
import type { Plugin } from "./Plugin";
import { createMVSBuilder, Root } from "molstar/lib/extensions/mvs/tree/mvs/mvs-builder";

function transposeAndFlatten(matrix: Matrix3D): Matrix3DFlattened {
  return matrix[0].flatMap((_, colIndex) =>
    matrix.map((row) => row[colIndex]),
  ) as Matrix3DFlattened;
}

// MVS

const DEFAULT_ROTATION: Matrix3D = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const DEFAULT_TRANSLATION: Vector3D = [0, 0, 0];

function inferColors(count: number, domainColors: boolean): ColorHEX[] {
  if (domainColors) {
    return ["#FF999C", "#C8EAFF", "#8D272B", "#86AEC6"];
  }

  if (count === 1) {
    return ["#FD9D0D"];
  }

  if (count === 2) {
    return ["#FD9D0D", "#0D6EFD"];
  }

  return ["#FD9D0D", ...Array(count - 1).fill("#CCCCCC")];
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
  } else if (modelSourceUrls.uniProtId) {
    // url = `${modelSourceUrls.uniProtId}/${protein.uniProtId}`;
    url = modelSourceUrls.uniProtId(protein.uniProtId);
  } else {
    url = `${defaultModelSourceUrls.uniProtId}/AF-${protein.uniProtId}-F1-model_v6.cif`;
  }

  return url;
}

// =====================
// LEGACY API BEGIN
// =====================

function createMVSLegacy(
  proteins: Protein[],
  modelSourceUrls: Partial<ModelSourceUrls>,
  plugin?: Plugin,
): MVSData {
  const _modelSourceUrls = {
    // uniProtId: "https://alphafold.ebi.ac.uk/files",
    uniProtId: (uniProtId: string) => `https://alphafold.ebi.ac.uk/files/AF-${uniProtId}-F1-model_v6.cif`,
    ...modelSourceUrls,
  };

  const isDomain = proteins.some(
    (p) => !!(p.chopping && p.chopping.length > 0),
  );

  const colors = inferColors(proteins.length, isDomain);

  const children: MVSTree[] = [];
  for (let i = 0; i < proteins.length; i++) {
    const protein = proteins[i];
    if (!protein) {
      continue;
    }
    const url = prepareModelSourceUrl(protein, _modelSourceUrls, plugin);

    const component = {
      kind: "component",
      params: {
        selector: protein.chain
          ? protein.file
            ? { label_asym_id: protein.chain }
            : { auth_asym_id: protein.chain }
          : "all",
      },
      children: [
        {
          kind: "representation",
          params: {
            type: "cartoon",
            ...(protein.file
              ? {
                  size_factor: 1,
                  tubular_helices: false,
                }
              : {}),
          },
          children: [
            {
              kind: "color",
              params: {
                color: colors[i] ?? "#CCCCCC",
                selector: "all",
              },
            },
            ...(proteins.length >= 3 && i > 0
              ? [
                  {
                    kind: "opacity",
                    params: {
                      opacity: 0.5,
                    },
                  },
                ]
              : []),
          ],
        },
      ],
    };

    const parseFormat = protein.file
      ? protein.file.name.endsWith(".cif") ||
        protein.file.name.endsWith(".mmcif")
        ? "mmcif"
        : "pdb"
      : "mmcif";

    const structure = {
      kind: "parse",
      params: {
        format: parseFormat,
      },
      children: [
        {
          kind: "structure",
          params: {
            type: "model",
            ...(protein.file
              ? {
                  block_header: null,
                  block_index: 0,
                  model_index: 0,
                }
              : {}),
          },
          children: [
            {
              kind: "transform",
              params: {
                rotation: transposeAndFlatten(
                  protein.superposition?.rotation ?? DEFAULT_ROTATION,
                ),
                translation:
                  protein.superposition?.translation ?? DEFAULT_TRANSLATION,
              },
            },
            component,
          ],
        },
      ],
    };

    const download = {
      kind: "download",
      params: {
        url,
      },
      children: [structure],
    };

    children.push(download as unknown as MVSTree);
  }

  return {
    kind: "single",
    root: {
      kind: "root",
      children: children,
    },

    metadata: {
      version: "1.4",
      timestamp: new Date().toISOString(),
      title:
        proteins.length > 1 ? "Protein Comparison" : "Protein Visualization",
      description: `Visualization of ${proteins.length} protein(s)`,
    },
  };
}

// =====================
// LEGACY API END
// ====================

// =====================
// CURRENT API BEGIN
// =====================

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

function createRepresentationParams(
  protein: Protein,
  representationType?: string,
) {
  const repType = representationType ?? protein.representation ?? "cartoon";

  if (protein.file) {
    return { size_factor: 1, tubular_helices: false, type: repType };
  }

  return { type: repType };
}

function applyRepresentationColor(
  representation: any,
  protein: Protein,
  proteinIndex: number,
  totalProteins: number,
  colors: ColorHEX[],
) {
  const singleProtein = totalProteins === 1;
  const defaultRepre = protein.representation ?? "cartoon";

  if (defaultRepre === "cartoon" || defaultRepre === "backbone") {
    if (singleProtein) {
      representation.color({
        custom: {
          molstar_color_theme_name: "sequence-id",
          molstar_color_theme_params: {
            carbonColor: { name: "sequence-id", params: {} },
          },
        },
      });
    } else {
      representation.color({
        color: colors[proteinIndex] ?? "#CCCCCC",
        selector: "all",
      });
    }
  } else {
    representation.color({
      custom: {
        molstar_color_theme_name: "element-symbol",
        molstar_color_theme_params: {
          carbonColor: {
            name: singleProtein ? "sequence-id" : "element-symbol",
            params: {},
          },
        },
      },
    });
  }
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

function handleDomainChopping(
  struct: any,
  protein: Protein,
  proteinIndex: number,
  colors: ColorHEX[],
) {
  const ranges = protein.chopping!;

  // Create domain components for each chopping range
  ranges.forEach((r) => {
    const seqRange = { beg_auth_seq_id: r.start, end_auth_seq_id: r.end };
    const domainSelector = createDomainSelector(protein, seqRange);

    const domainComp = struct.component({ selector: domainSelector });
    const domainRepr = domainComp.representation(
      protein.file ? { size_factor: 1, tubular_helices: false } : {},
    );
    domainRepr.color({
      color: colors[(proteinIndex % 2) + 2]!,
      selector: "all",
    });
  });

  // Build a rest selector that excludes all ranges using an `or` inside `not`.
  const orArray = ranges.map((r) => ({
    beg_auth_seq_id: r.start,
    end_auth_seq_id: r.end,
  }));
  const notInner = orArray.length === 1 ? orArray[0] : { or: orArray };

  const restSelector = protein.chain
    ? protein.file
      ? { label_asym_id: protein.chain, not: notInner }
      : { auth_asym_id: protein.chain, not: notInner }
    : { not: notInner };

  const restComp = struct.component({ selector: restSelector });
  const restRepr = restComp.representation(
    protein.file ? { size_factor: 1, tubular_helices: false } : {},
  );
  restRepr.color({
    color: colors[proteinIndex % 2]!,
    selector: "all",
  });
  restRepr.opacity({ opacity: 0.25 });
}

function handleRegularProtein(
  struct: any,
  protein: Protein,
  proteinIndex: number,
  totalProteins: number,
  colors: ColorHEX[],
) {
  const selector = createChainSelector(protein);
  const comp = struct.component({ selector });

  const reprParams = createRepresentationParams(protein);
  const repr = comp.representation(reprParams);

  applyRepresentationColor(
    repr,
    protein,
    proteinIndex,
    totalProteins,
    colors,
  );

  if (totalProteins >= 3 && proteinIndex > 0) {
    repr.opacity({ opacity: 0.5 });
  }
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

  if (protein.chopping && protein.chopping.length > 0) {
    handleDomainChopping(struct, protein, proteinIndex, colors);
  } else {
    handleRegularProtein(struct, protein, proteinIndex, totalProteins, colors);
  }
}

function createMVS(
  proteins: Protein[],
  modelSourceUrls: Partial<ModelSourceUrls>,
  plugin?: Plugin,
): MVSData {
  const isDomain = proteins.some((p) => p.chopping);
  const colors = inferColors(proteins.length, isDomain);

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

export { createMVS, createMVSLegacy };
