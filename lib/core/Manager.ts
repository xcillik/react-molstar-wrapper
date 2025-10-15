import { Plugin } from "./Plugin";
import type { InitialUI } from "./types";

const PLUGIN_GC_TIMEOUT = 30 * 1000; // 30 seconds

class Manager {
  private static instance: Manager;

  private initializatingContainers: Set<HTMLElement>;
  private plugins: Map<HTMLElement, Plugin>;
  private refCount: Map<Plugin, [number, number]>; // [count, lastUsedTimestamp]
  private timer: number | undefined;

  private constructor() {
    this.initializatingContainers = new Set();
    this.plugins = new Map();
    this.refCount = new Map();
    this.timer = undefined;

    this.initGC();
  }

  public static getInstance(): Manager {
    if (!Manager.instance) {
      Manager.instance = new Manager();
    }

    return Manager.instance;
  }

  cleanup() {
    clearInterval(this.timer);
  }

  private initGC() {
    this.timer = setInterval(() => {
      const now = Date.now();

      for (const [plugin, lastActive] of this.refCount) {
        if (lastActive[0] === 0 && now - lastActive[1] > PLUGIN_GC_TIMEOUT) {
          plugin.dispose();
        }
      }
    }, 20 * 1000); // Run every 20 seconds
  }

  async initPlugin(
    container: HTMLElement,
    initialUI: InitialUI,
  ): Promise<Plugin> {
    if (this.plugins.has(container)) {
      // biome-ignore lint/style/noNonNullAssertion: Safe because of has() check
      return this.plugins.get(container)!;
    }

    if (container.querySelector(".msp-plugin")) {
      for (const [containerElem, plugin] of this.plugins) {
        if (containerElem.contains(container)) {
          return plugin;
        }
      }
    }

    if (this.initializatingContainers.has(container)) {
      while (this.initializatingContainers.has(container)) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const plugin = this.plugins.get(container);
      if (!plugin) {
        throw new Error("Viewer initialization failed");
      }

      return plugin;
    }

    try {
      this.initializatingContainers.add(container);

      if (!container.querySelector(".msp-plugin")) {
        container.innerHTML = "";
      }

      const instance = await Plugin.create(container, initialUI);
      this.refCount.set(instance, [1, Date.now()]);

      this.plugins.set(container, instance);
      return instance;
    } finally {
      this.initializatingContainers.delete(container);
    }
  }

  getPlugin(container: HTMLElement): Plugin | undefined {
    const plugin = this.plugins.get(container);

    if (plugin) {
      const ref = this.refCount.get(plugin);
      if (ref) {
        ref[0]++;
        ref[1] = Date.now();
      }
    }

    return plugin;
  }

  releasePlugin(plugin: Plugin) {
    const ref = this.refCount.get(plugin);
    if (!ref) {
      throw new Error("Trying to release a plugin that is not managed");
    }

    ref[0] = Math.max(0, ref[0] - 1);
    ref[1] = Date.now();
  }

  disposePlugin(container: HTMLElement) {
    const plugin = this.plugins.get(container);

    if (plugin) {
      plugin.dispose();
      this.plugins.delete(container);
      container.innerHTML = "";
    }
  }
}

export { Manager };
