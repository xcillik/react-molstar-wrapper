import type { Protein } from "../types";

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
  representationType?: string
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
  seqRange?: { beg_auth_seq_id: number; end_auth_seq_id: number }
) {
  if (!protein.chain) {
    return seqRange ?? "all";
  }

  const chainId = protein.file
    ? { label_asym_id: protein.chain }
    : { auth_asym_id: protein.chain };

  return seqRange ? { ...chainId, ...seqRange } : chainId;
}

export {
  createChainSelector,
  createDomainSelector,
  createRepresentationParams,
  getRepresentationType,
  isCartoonLikeRepresentation,
};
