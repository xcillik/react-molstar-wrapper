import { loadMVSData } from "molstar/lib/extensions/mvs/components/formats";
import type { MVSData } from "molstar/lib/extensions/mvs/mvs-data.d.ts";
import type { ColorHEX, Matrix3D, Vector3D } from "./types";
import { Color } from "molstar/lib/mol-util/color";

import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { renderReact18 } from "molstar/lib/mol-plugin-ui/react18";
import { PluginSpec } from "molstar/lib/mol-plugin/spec";
import { MolViewSpec } from "molstar/lib/extensions/mvs/behavior";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec";
import type { InitialUI } from "./types";
import type { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { Mat4, Vec3 } from "molstar/lib/mol-math/linear-algebra";
import { PluginStateObject } from "molstar/lib/mol-plugin-state/objects";
import { Script } from "molstar/lib/mol-script/script";
import { StructureElement, StructureSelection } from "molstar/lib/mol-model/structure";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";

class Plugin {
  private plugin: PluginUIContext;
  private objectUrls: Set<string>;

  constructor(plugin: PluginUIContext) {
    this.plugin = plugin;
    this.objectUrls = new Set();
  }

  /**
   * Create a Plugin by instantiating the underlying PluginUI.
   * We use a static async factory because constructors cannot be async.
   */
  static async create(
    container: HTMLElement,
    initialUI: InitialUI,
  ): Promise<Plugin> {
    const defaultSpec = DefaultPluginUISpec();

    if (!container.querySelector(".msp-plugin")) {
      container.innerHTML = "";
    }

    const plugin = await createPluginUI({
      target: container,
      render: renderReact18,
      spec: {
        actions: defaultSpec.actions ?? [],
        behaviors: [
          ...(initialUI !== "minimal" ? defaultSpec.behaviors : []),
          PluginSpec.Behavior(MolViewSpec),
        ],
        animations: [...(defaultSpec.animations || [])],
        layout: {
          initial: {
            showControls: initialUI === "expanded",
            controlsDisplay: "reactive",
            // isExpanded: false,
          },
        },
        components: {
          ...defaultSpec.components,
        },
        canvas3d: {
          ...defaultSpec.canvas3d,
          camera: {
            ...defaultSpec.canvas3d?.camera,
            helper: {
              axes:
                initialUI === "minimal"
                  ? {
                      name: "off",
                      params: {},
                    }
                  : defaultSpec.canvas3d?.camera?.helper?.axes,
            },
          },
        },
      },
    });

    return new Plugin(plugin);
  }

  dispose() {
    this.plugin.dispose();
    this.cleanupObjectUrls();
  }

  cleanupObjectUrls() {
    for (const url of this.objectUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch (_e) {
        // ignore
      }

      this.objectUrls.delete(url);
    }
  }

  createObjectUrlFromFile(file: File): string {
    const url = URL.createObjectURL(file);
    this.objectUrls.add(url);
    return url;
  }

  clear() {
    this.plugin.clear();
  }

  async loadMvs(mvs: MVSData) {
    return await loadMVSData(this.plugin, mvs, "mvsj");
  }

  setBackgroundColor(color: ColorHEX) {
    const hexString = color.replace("#", "0x");

    this.plugin.canvas3d?.setProps({
      renderer: { backgroundColor: Color.fromHexString(hexString) },
    });
  }

  setAnimation(type: "spin" | "rock" | "off", speed?: number) {
    if (type === "off") {
      this.plugin.canvas3d?.setProps({
        trackball: {
          animate: {
            name: "off",
            params: {},
          },
        },
      });

      return;
    }

    const animationParams =
      type === "spin"
        ? {
            speed: speed ?? 0.05,
          }
        : {
            speed: speed ?? 0.2,
            angle: 10,
          };

    this.plugin.canvas3d?.setProps({
      trackball: {
        animate: {
          name: type,
          params: animationParams,
        },
      },
    });
  }

  async focusOnDomain(domainStart: number, domainEnd: number) {
    const state = this.plugin.state.data;

    // Find all structure cells in the state tree
    const structures = state.selectQ((q) =>
      q.rootsOfType(PluginStateObject.Molecule.Structure),
    );

    if (structures.length === 0) {
      return;
    }

    // Use the first structure for focusing
    const structureCell = structures[0];
    if (!structureCell?.obj) {
      return;
    }

    const structureData = structureCell.obj.data;

    // Build a selection query for the residue range
    const selection = Script.getStructureSelection(
      (Q) =>
        Q.struct.generator.atomGroups({
          "residue-test": Q.core.rel.inRange([
            Q.struct.atomProperty.macromolecular.auth_seq_id(),
            domainStart,
            domainEnd,
          ]),
        }),
      structureData,
    );

    const loci = StructureSelection.toLociWithSourceUnits(selection);

    // Focus camera on the loci
    if (!StructureElement.Loci.isEmpty(loci)) {
      await this.plugin.managers.camera.focusLoci(loci);
    }
  }

  async resetView() {
    // Reset camera to show all structures
    await this.plugin.managers.camera.reset();
  }

  async updateStructureTransform(
    structureIndex: number,
    translation?: Vector3D,
    rotation?: Matrix3D,
  ) {
    const state = this.plugin.state.data;

    // Find all structure cells in the state tree
    const structures = state.selectQ((q) =>
      q.rootsOfType(PluginStateObject.Molecule.Structure),
    );

    if (structureIndex >= structures.length) {
      return;
    }

    const targetStructure = structures[structureIndex];
    if (!targetStructure) {
      return;
    }

    // Find transform nodes in the structure's subtree
    const allCells = state.selectQ((q) => q.root.subtree());
    const transforms = allCells.filter(
      (cell) =>
        cell.transform.transformer ===
        StateTransforms.Model.TransformStructureConformation,
    );

    // Match transform by structure index (assumes structures and transforms are in same order)
    const targetTransform = transforms[structureIndex];

    if (targetTransform) {
      // Create the transformation matrix
      const matrix = Mat4.identity();

      // Apply rotation if provided
      if (rotation) {
        // Set rotation part of the matrix (top-left 3x3)
        Mat4.setValue(matrix, 0, 0, rotation[0][0]);
        Mat4.setValue(matrix, 0, 1, rotation[0][1]);
        Mat4.setValue(matrix, 0, 2, rotation[0][2]);
        Mat4.setValue(matrix, 1, 0, rotation[1][0]);
        Mat4.setValue(matrix, 1, 1, rotation[1][1]);
        Mat4.setValue(matrix, 1, 2, rotation[1][2]);
        Mat4.setValue(matrix, 2, 0, rotation[2][0]);
        Mat4.setValue(matrix, 2, 1, rotation[2][1]);
        Mat4.setValue(matrix, 2, 2, rotation[2][2]);
      }

      // Apply translation if provided
      if (translation) {
        Mat4.setTranslation(
          matrix,
          Vec3.create(translation[0], translation[1], translation[2]),
        );
      }

      // Update the transform with new rotation and translation
      const update = state
        .build()
        .to(targetTransform.transform.ref)
        .update(
          StateTransforms.Model.TransformStructureConformation,
          (old) => ({
            ...old,
            transform: {
              name: "matrix" as const,
              params: {
                data: matrix,
                transpose: false,
              },
            },
          }),
        );

      await this.plugin.runTask(state.updateTree(update));
    }
  }

  getPluginContext() {
    return this.plugin;
  }
}

export { Plugin };
