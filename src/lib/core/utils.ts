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
import { createMVSBuilder } from "molstar/lib/extensions/mvs/tree/mvs/mvs-builder";

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
    url = `${modelSourceUrls.uniProtId}/${protein.uniProtId}`;
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
    uniProtId: "https://alphafold.ebi.ac.uk/files",
    ...modelSourceUrls,
  };

  const isDomain = proteins.some(
    (p) => !!(p.choppingData && p.choppingData.length > 0),
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

function createMVS(
  proteins: Protein[],
  modelSourceUrls: Partial<ModelSourceUrls>,
  plugin?: Plugin,
): MVSData {
  const isDomain = proteins.some((p) => p.choppingData);
  const colors = inferColors(proteins.length, isDomain);

  const root = createMVSBuilder();

  for (let i = 0; i < proteins.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: Safe because of loop condition
    const protein = proteins[i]!;

    const url = prepareModelSourceUrl(protein, modelSourceUrls, plugin);

    const download = root.download({ url });

    const parseFormat = protein.file
      ? protein.file.name.endsWith(".cif") ||
        protein.file.name.endsWith(".mmcif")
        ? "mmcif"
        : "pdb"
      : "mmcif";

    const parse = download.parse({ format: parseFormat });

    const struct = parse.modelStructure(
      protein.file
        ? { block_header: null, block_index: 0, model_index: 0 }
        : {},
    );

    struct.transform({
      rotation: transposeAndFlatten(
        protein.superposition?.rotation ?? DEFAULT_ROTATION,
      ),
      translation: protein.superposition?.translation ?? DEFAULT_TRANSLATION,
    });

    const selector = protein.chain
      ? protein.file
        ? { label_asym_id: protein.chain }
        : { auth_asym_id: protein.chain }
      : "all";

    if (protein.choppingData && protein.choppingData.length > 0) {
      // Treat choppingData as an array of ranges. Create a component per domain range,
      // then a "rest" component that excludes all ranges.
      const ranges = protein.choppingData;

      // Create domain components for each chopping range
      ranges.forEach((r) => {
        const seqRange = { beg_auth_seq_id: r.start, end_auth_seq_id: r.end };
        const domainSelector = protein.chain
          ? protein.file
            ? { label_asym_id: protein.chain, ...seqRange }
            : { auth_asym_id: protein.chain, ...seqRange }
          : seqRange;

        const domainComp = struct.component({ selector: domainSelector });
        const domainRepr = domainComp.representation(
          protein.file ? { size_factor: 1, tubular_helices: false } : {},
        );
        domainRepr.color({ color: colors[(i % 2) + 2]!, selector: "all" });
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
      restRepr.color({ color: colors[i % 2]!, selector: "all" });
      restRepr.opacity({ opacity: 0.4 });
    } else {
      const comp = struct.component({ selector });

      const defaultRepre = protein.representation ?? "cartoon";

      // Build representation params. If a file is present, keep the file-specific params
      // (size_factor, tubular_helices). Otherwise pass the type from defaultRepre.
      const reprParams = protein.file
        ? { size_factor: 1, tubular_helices: false, type: defaultRepre }
        : { type: defaultRepre };

      const repr = comp.representation(reprParams);

      // Apply color rules:
      // - If there's only a single protein, use the 'sequence-id' custom theme for
      //   both 'cartoon' and 'backbone' representations.
      // - If multiple proteins, keep the per-protein color for 'cartoon' and
      //   'backbone'.
      // - For any other representation, use a custom theme: 'sequence-id' for a
      //   single protein, otherwise 'element-symbol'.
      const singleProtein = proteins.length === 1;

      if (defaultRepre === "cartoon" || defaultRepre === "backbone") {
        if (singleProtein) {
          repr.color({
            custom: {
              molstar_color_theme_name: "sequence-id",
              molstar_color_theme_params: {
                carbonColor: { name: "sequence-id", params: {} },
              },
            },
          });
        } else {
          repr.color({ color: colors[i] ?? "#CCCCCC", selector: "all" });
        }
      } else {
        repr.color({
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

      if (proteins.length >= 3 && i > 0) {
        repr.opacity({ opacity: 0.5 });
      }
    }
  }

  return root.getState({
    title: proteins.length > 1 ? "Protein Comparison" : "Protein Visualization",
    description: `Visualization of ${proteins.length} protein(s)`,
  });
}

export { createMVS, createMVSLegacy };
