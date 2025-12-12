import type {
  ColorHEX,
  Matrix3D,
  Matrix3DFlattened,
  ModelSourceUrls,
  Protein,
  Vector3D,
} from "../types";
import type { MVSData } from "molstar/lib/extensions/mvs/mvs-data.d.ts";
import type { Plugin } from "../Plugin";
import { createMVSBuilder, Root } from "molstar/lib/extensions/mvs/tree/mvs/mvs-builder";
import { normalizeChoppingData } from "./chopping";
import { inferColors } from "./colors";
import { renderProteinWithChopping, renderProteinWithoutChopping } from "./rendering";

function transposeAndFlatten(matrix: Matrix3D): Matrix3DFlattened {
  return matrix[0].flatMap((_, colIndex) => matrix.map((row) => row[colIndex])) as Matrix3DFlattened;
}

const DEFAULT_ROTATION: Matrix3D = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const DEFAULT_TRANSLATION: Vector3D = [0, 0, 0];

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
      throw new Error("Plugin instance is required to create object URL from file");
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

  return protein.file.name.endsWith(".cif") || protein.file.name.endsWith(".mmcif")
    ? "mmcif"
    : "pdb";
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
    rotation: transposeAndFlatten(protein.superposition?.rotation ?? DEFAULT_ROTATION),
    translation: protein.superposition?.translation ?? DEFAULT_TRANSLATION,
    rotation_center: [0, 0, 0],
  });

  const choppingEntries = totalProteins >= 3
    ? []
    : normalizeChoppingData(protein.chopping);

  if (choppingEntries.length > 0) {
    renderProteinWithChopping(struct, protein, proteinIndex, totalProteins, colors, choppingEntries);
  } else {
    renderProteinWithoutChopping(struct, protein, proteinIndex, totalProteins, colors);
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
    const protein = proteins[i]!;
    processProtein(root, protein, i, proteins.length, colors, modelSourceUrls, plugin);
  }

  return root.getState({
    title: proteins.length > 1 ? "Protein Comparison" : "Protein Visualization",
    description: `Visualization of ${proteins.length} protein(s)`,
  });
}

export { createMVS };
