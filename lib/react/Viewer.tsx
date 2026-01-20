"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  type CSSProperties,
} from "react";
import "./style.css";
import "molstar/lib/mol-plugin-ui/skin/light.scss";
import LoaderView from "./LoaderView";
import ErrorView from "./ErrorView";
import { Manager } from "../core/Manager";
import { createMVS } from "../core/tree";
import type { Plugin as P } from "../core/Plugin";
import type { Props, ViewerRef } from "./types";

type ViewerState = "loading" | "success" | "error";

/**
 * Viewer
 *
 * React component that embeds a Mol* viewer plugin and exposes a small imperative
 * API via a forwarded ref. The component is responsible for initializing and
 * releasing a shared plugin instance (via Manager), loading structure data (either
 * from raw `proteins` input or from precomputed `mvs`), and exposing convenience
 * controls such as background color and simple animations (spin/rock).
 *
 * Remarks
 * - Exactly one of `proteins` or `mvs` must be provided. Passing both or neither
 *   will throw an error during initialization.
 * - The component holds internal loading state: "loading" | "success" | "error".
 *   On initialization errors the state becomes "error" and the error is logged to
 *   the console.
 * - The plugin instance is created/reused via Manager.getInstance() and is
 *   released when the component unmounts (or when the effect cleans up).
 * - UI mode `initialUI` toggles whether control chrome is shown; when set to
 *   "minimal" an additional CSS class ("no-controls") is applied to the container.
 *
 * Props
 * @param proteins - Optional raw proteins data used to construct an MVS representation.
 *   When provided, the component will call `createMVS(proteins, modelSourceUrls, plugin)`
 *   to compute the view state to load into the plugin.
 * @param mvs - Optional precomputed MVS data. If provided, the viewer loads this
 *   directly and does not call `createMVS`.
 * @param modelSourceUrls - Optional lookup mapping used by `createMVS` to resolve
 *   model source URLs for remote model retrieval when `proteins` is used.
 *   Without trailing slashes, e.g. { uniProtId: "https://api.example.com/protein" }.
 * @param initialUI - Which initial UI preset to use for the embedded plugin.
 *   Typical values: "standard" | "minimal". Default: "standard".
 * @param bgColor - Background color for the viewer (any valid CSS color). Default: "#ffffff".
 * @param spin - Whether to enable continuous spin animation. Mutually exclusive with `rock`.
 * @param spinSpeed - Speed multiplier for the spin animation. Default: 0.05.
 * @param rock - Whether to enable rock animation (back-and-forth). Mutually exclusive with `spin`.
 * @param rockSpeed - Speed multiplier for the rock animation. Default: 0.2.
 * @param height - Optional explicit height (in pixels) for the outer wrapper. If omitted,
 *   the wrapper will fill available height ("100%").
 * @param className - Optional CSS class to apply to the outer wrapper.
 *
 * Forwarded ref (ViewerRef)
 * The component forwards a ref exposing the following async methods:
 * - highlight(domainId: number): Promise<void>
 *     Focuses/highlights a domain in the first protein using its choppingData.
 *     No-op if plugin or choppingData is not available.
 * - reset(): Promise<void>
 *     Resets the plugin's view to its default/original pose.
 * - updateSuperposition(proteinIndex: number, translation?, rotation?): Promise<void>
 *     Updates the transform for a loaded structure (protein) without reloading the
 *     entire scene. `translation` is an optional [x, y, z] tuple. `rotation` is an
 *     optional 3x3 matrix represented as [[r11,r12,r13],[r21,r22,r23],[r31,r32,r33]].
 *     This method relies on the Mol* plugin API to update transforms in-place.
 *
 * Behavior & Side Effects
 * - While the component is initializing the plugin and loading data, it renders a
 *   LoaderView. If initialization fails, it renders an ErrorView.
 * - When `spin` or `rock` props change (and the component is in "success" state),
 *   the corresponding plugin animation is enabled with the provided speed. Passing
 *   neither results in animations being turned off.
 * - When `bgColor` changes (and the component is in "success" state), the plugin's
 *   background color is updated.
 * - The container element receives a stable id (useId) and CSS class "react-molstar",
 *   plus "no-controls" when `initialUI === "minimal"`. The visualization container's
 *   opacity animates between loading/success states.
 *
 * Example
 * const ref = useRef<ViewerRef | null>(null);
 * <Viewer
 *   ref={ref}
 *   proteins={myProteins}
 *   initialUI="standard"
 *   bgColor="#000"
 * />
 * // later
 * await ref.current?.highlight(3);
 * await ref.current?.updateSuperposition(1, [10,0,0], [[1,0,0],[0,1,0],[0,0,1]]);
 *
 * See also
 * - Manager: plugin lifecycle management used to acquire/release plugin instances.
 * - createMVS: helper to convert raw protein input into an MVS representation accepted
 *   by the plugin.
 */
const Viewer = forwardRef<ViewerRef, Props>(function Viewer(
  {
    proteins,
    mvs,
    modelSourceUrls,
    initialUI = "standard",
    bgColor = "#ffffff",
    spin = false,
    spinSpeed = 0.05,
    rock = false,
    rockSpeed = 0.2,
    height,
    className,
  }: Props,
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<P | null>(null);
  const proteinsRef = useRef<Props["proteins"]>(proteins);
  const [state, setState] = useState<ViewerState>("loading");
  const id = useId();

  // Update proteins ref when proteins prop changes
  useEffect(() => {
    proteinsRef.current = proteins;
  }, [proteins]);

  // Expose API methods via ref
  useImperativeHandle(
    ref,
    () => ({
      highlight: async (proteinIndex: number, label: string) => {
        if (
          !pluginRef.current ||
          proteinsRef.current === undefined ||
          proteinsRef.current.length <= proteinIndex
        ) {
          return;
        }

        const domain = proteinsRef.current[proteinIndex]?.chopping?.find(
          (d) => d.label === label
        );
        const start = domain?.ranges[0]?.start;
        const end = domain?.ranges[0]?.end;

        if (start !== undefined && end !== undefined) {
          await pluginRef.current.focusOnDomain(start, end);
        }
      },
      reset: async () => {
        if (!pluginRef.current) {
          return;
        }
        await pluginRef.current.resetView();
      },
      updateSuperposition: async (
        proteinIndex: number,
        translation?: [number, number, number],
        rotation?: [
          [number, number, number],
          [number, number, number],
          [number, number, number],
        ]
      ) => {
        if (!pluginRef.current) {
          return;
        }

        // Use Mol* API directly to update the transform without reloading
        await pluginRef.current.updateStructureTransform(
          proteinIndex,
          translation,
          rotation
        );
      },
    }),
    []
  );

  useEffect(() => {
    return () => {
      pluginRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    if (
      (proteins !== undefined && mvs !== undefined) ||
      (proteins === undefined && mvs === undefined)
    ) {
      throw new Error(
        "Either `proteins` or `mvs` must be provided, but not both."
      );
    }

    setState("loading");

    let ref: P | undefined;

    async function init() {
      const manager = Manager.getInstance();

      const el = containerRef.current;
      if (!el) {
        return;
      }

      let pl = manager.getPlugin(el);
      if (!pl) {
        pl = await manager.initPlugin(el, initialUI);
      }
      ref = pl;
      pluginRef.current = pl;

      try {
        // ensure proteins is defined when mvs is undefined
        if (mvs === undefined && proteins === undefined) {
          throw new Error(
            "Either `proteins` or `mvs` must be provided, but not both."
          );
        }

        const proteinsVal = proteins;
        if (mvs === undefined && proteinsVal === undefined) {
          // defensive check, should not happen because of earlier validation
          throw new Error("Missing proteins data");
        }

        const proteinsArg = proteinsVal as unknown as Parameters<
          typeof createMVS
        >[0];
        const mvsData =
          mvs ?? createMVS(proteinsArg, modelSourceUrls ?? {}, pl);
        await pl.loadMvs(mvsData);
      } catch (e) {
        // biome-ignore lint/suspicious/noConsole: intentional runtime error logging for viewer init
        console.error(e);
        setState("error");
        return;
      }

      setState("success");
    }

    init();

    return () => {
      if (ref !== undefined) {
        Manager.getInstance().releasePlugin(ref);
      }
    };
  }, [proteins, mvs, modelSourceUrls, initialUI]);

  useEffect(() => {
    if (state !== "success" || !pluginRef.current) {
      return;
    }

    if (spin) {
      pluginRef.current.setAnimation("spin", spinSpeed);
    } else if (rock) {
      pluginRef.current.setAnimation("rock", rockSpeed);
    } else {
      pluginRef.current.setAnimation("off");
    }
  }, [state, spin, rock, spinSpeed, rockSpeed]);

  useEffect(() => {
    if (state !== "success" || !pluginRef.current) {
      return;
    }

    if (bgColor) {
      pluginRef.current.setBackgroundColor(bgColor);
    }
  }, [state, bgColor]);

  const styles: CSSProperties = {
    height: height ? `${height}px` : "100%",
    position: "relative",
  };
  const containerClasses = `react-molstar${initialUI === "minimal" ? " no-controls" : ""}`;

  return (
    <div className={className} style={styles}>
      <div
        ref={containerRef}
        id={id}
        className={containerClasses}
        style={{
          opacity: state === "success" ? 1 : 0.7,
          transition: "opacity 0.3s ease-in-out",
        }}
      />

      {state === "loading" && <LoaderView />}

      {state === "error" && <ErrorView />}
    </div>
  );
});

export default Viewer;
