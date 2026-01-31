import "./globals.css";
import Viewer from "../lib/react/Viewer";
import { useRef, useState, useMemo, useId } from "react";
import type { ViewerRef } from "../lib";
import {
  proteins1,
  proteins2,
  proteins3,
  proteins4,
  proteins5,
  proteins6,
} from "./proteins";

const viewerHeight = 400;

function App() {
  const viewerRef = useRef<ViewerRef>(null);
  const rotationIdBase = useId();

  // State for label visibility
  const [labelsVisible, setLabelsVisible] = useState(true);

  // State for slider values (X, Y, Z translation for second protein)
  const [translationX, setTranslationX] = useState(0);
  const [translationY, setTranslationY] = useState(0);
  const [translationZ, setTranslationZ] = useState(0);

  // State for rotation values (Euler angles in degrees for second protein)
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(0);
  const [rotationZ, setRotationZ] = useState(0);

  // Helper function to convert Euler angles (degrees) to rotation matrix
  const eulerToRotationMatrix = (
    rx: number,
    ry: number,
    rz: number
  ): [
    [number, number, number],
    [number, number, number],
    [number, number, number],
  ] => {
    // Convert degrees to radians
    const xRad = (rx * Math.PI) / 180;
    const yRad = (ry * Math.PI) / 180;
    const zRad = (rz * Math.PI) / 180;

    // Calculate sine and cosine for each angle
    const cx = Math.cos(xRad);
    const sx = Math.sin(xRad);
    const cy = Math.cos(yRad);
    const sy = Math.sin(yRad);
    const cz = Math.cos(zRad);
    const sz = Math.sin(zRad);

    // Rotation matrix using ZYX Euler angle convention
    return [
      [cy * cz, -cy * sz, sy],
      [cx * sz + sx * sy * cz, cx * cz - sx * sy * sz, -sx * cy],
      [sx * sz - cx * sy * cz, sx * cz + cx * sy * sz, cx * cy],
    ];
  };

  const modelSourceUrls = useMemo(
    () => ({
      uniProtId: (uniProtId: string) =>
        `https://alphafold.ebi.ac.uk/files/AF-${uniProtId}-F1-model_v6.cif`,
    }),
    []
  );

  const handleDomainHover = (proteinIndex: number, domainId: number) => {
    viewerRef.current?.highlight(proteinIndex, `Domain ${domainId}`);
  };

  const handleDomainLeave = () => {
    viewerRef.current?.reset();
  };

  const handleTranslationChange = (axis: "x" | "y" | "z", value: number) => {
    const newTranslation: [number, number, number] = [
      translationX,
      translationY,
      translationZ,
    ];

    if (axis === "x") {
      setTranslationX(value);
      newTranslation[0] = value;
    } else if (axis === "y") {
      setTranslationY(value);
      newTranslation[1] = value;
    } else {
      setTranslationZ(value);
      newTranslation[2] = value;
    }

    const rotationMatrix = eulerToRotationMatrix(
      rotationX,
      rotationY,
      rotationZ
    );
    viewerRef.current?.updateSuperposition(0, newTranslation, rotationMatrix);
  };

  const handleRotationChange = (axis: "x" | "y" | "z", value: number) => {
    const newRotation = { x: rotationX, y: rotationY, z: rotationZ };

    if (axis === "x") {
      setRotationX(value);
      newRotation.x = value;
    } else if (axis === "y") {
      setRotationY(value);
      newRotation.y = value;
    } else {
      setRotationZ(value);
      newRotation.z = value;
    }

    const rotationMatrix = eulerToRotationMatrix(
      newRotation.x,
      newRotation.y,
      newRotation.z
    );
    const translation: [number, number, number] = [
      translationX,
      translationY,
      translationZ,
    ];
    viewerRef.current?.updateSuperposition(0, translation, rotationMatrix);
  };

  return (
    <div className="w-screen p-4">
      <h1 className="text-2xl font-bold mb-4">React Molstar Showcase</h1>
      <div className="flex flex-wrap -mx-2">
        {/* Single protein with chopping */}
        <div className="w-full md:w-1/3 px-2 mb-4">
          <h2 className="text-lg font-semibold mb-1">Single Protein</h2>
          <p className="text-sm text-gray-600 mb-3">
            Display a single protein with domain chopping.
          </p>
          <Viewer
            proteins={proteins4}
            modelSourceUrls={modelSourceUrls}
            height={viewerHeight}
          />
        </div>

        {/* Labels toggle and sliders */}
        <div className="w-full md:w-1/3 px-2 mb-4">
          <h2 className="text-lg font-semibold mb-1">Labels & Controls</h2>
          <p className="text-sm text-gray-600 mb-3">
            Toggle labels and adjust superposition with sliders.
          </p>
          <Viewer
            ref={viewerRef}
            proteins={proteins2}
            modelSourceUrls={modelSourceUrls}
            height={viewerHeight}
            labels={labelsVisible}
          />
          <div className="mt-3">
            <button
              onClick={() => setLabelsVisible(!labelsVisible)}
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors duration-200 text-sm font-medium"
            >
              Toggle Labels {labelsVisible ? "Off" : "On"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-slate-600 font-medium">
              Hover domains:
            </span>
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-slate-500 mr-1">Query:</span>
              {[1, 2].map((domainId) => (
                <button
                  key={`q-${domainId}`}
                  onMouseEnter={() => handleDomainHover(0, domainId)}
                  onMouseLeave={handleDomainLeave}
                  className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md border border-slate-200 hover:bg-slate-200 hover:border-slate-300 transition-colors"
                >
                  D{domainId}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-slate-500 mr-1">Target:</span>
              {[1, 2, 3, 4, 5, 6].map((domainId) => (
                <button
                  key={`t-${domainId}`}
                  onMouseEnter={() => handleDomainHover(1, domainId)}
                  onMouseLeave={handleDomainLeave}
                  className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md border border-slate-200 hover:bg-slate-200 hover:border-slate-300 transition-colors"
                >
                  D{domainId}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold mb-2 text-xs text-slate-700">
              Translation
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label
                  htmlFor={`${rotationIdBase}-tx`}
                  className="block text-[10px] font-medium text-slate-600 mb-0.5"
                >
                  X: {translationX.toFixed(2)}
                </label>
                <input
                  id={`${rotationIdBase}-tx`}
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={translationX}
                  onChange={(e) =>
                    handleTranslationChange(
                      "x",
                      Number.parseFloat(e.target.value)
                    )
                  }
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                />
              </div>
              <div>
                <label
                  htmlFor={`${rotationIdBase}-ty`}
                  className="block text-[10px] font-medium text-slate-600 mb-0.5"
                >
                  Y: {translationY.toFixed(2)}
                </label>
                <input
                  id={`${rotationIdBase}-ty`}
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={translationY}
                  onChange={(e) =>
                    handleTranslationChange(
                      "y",
                      Number.parseFloat(e.target.value)
                    )
                  }
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                />
              </div>
              <div>
                <label
                  htmlFor={`${rotationIdBase}-tz`}
                  className="block text-[10px] font-medium text-slate-600 mb-0.5"
                >
                  Z: {translationZ.toFixed(2)}
                </label>
                <input
                  id={`${rotationIdBase}-tz`}
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={translationZ}
                  onChange={(e) =>
                    handleTranslationChange(
                      "z",
                      Number.parseFloat(e.target.value)
                    )
                  }
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                />
              </div>
            </div>

            <h3 className="font-semibold mb-2 text-xs text-slate-700">
              Rotation (degrees)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label
                  htmlFor={`${rotationIdBase}-rx`}
                  className="block text-[10px] font-medium text-slate-600 mb-0.5"
                >
                  X: {rotationX.toFixed(2)}°
                </label>
                <input
                  id={`${rotationIdBase}-rx`}
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={rotationX}
                  onChange={(e) =>
                    handleRotationChange("x", Number.parseFloat(e.target.value))
                  }
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                />
              </div>
              <div>
                <label
                  htmlFor={`${rotationIdBase}-ry`}
                  className="block text-[10px] font-medium text-slate-600 mb-0.5"
                >
                  Y: {rotationY.toFixed(2)}°
                </label>
                <input
                  id={`${rotationIdBase}-ry`}
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={rotationY}
                  onChange={(e) =>
                    handleRotationChange("y", Number.parseFloat(e.target.value))
                  }
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                />
              </div>
              <div>
                <label
                  htmlFor={`${rotationIdBase}-rz`}
                  className="block text-[10px] font-medium text-slate-600 mb-0.5"
                >
                  Z: {rotationZ.toFixed(2)}°
                </label>
                <input
                  id={`${rotationIdBase}-rz`}
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={rotationZ}
                  onChange={(e) =>
                    handleRotationChange("z", Number.parseFloat(e.target.value))
                  }
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Multiple proteins */}
        <div className="w-full md:w-1/3 px-2 mb-4">
          <h2 className="text-lg font-semibold mb-1">Multiple Proteins</h2>
          <p className="text-sm text-gray-600 mb-3">
            Display multiple proteins together.
          </p>
          <Viewer
            proteins={proteins3}
            modelSourceUrls={modelSourceUrls}
            height={viewerHeight}
            bgColor="#FFFFFF"
          />
        </div>

        {/* Superposition */}
        <div className="w-full md:w-1/3 px-2 mb-4">
          <h2 className="text-lg font-semibold mb-1">Superposition</h2>
          <p className="text-sm text-gray-600 mb-3">
            Align two proteins using superposition.
          </p>
          <Viewer
            proteins={proteins1}
            modelSourceUrls={modelSourceUrls}
            height={viewerHeight}
          />
        </div>

        {/* Chopping pairs */}
        <div className="w-full md:w-1/3 px-2 mb-4">
          <h2 className="text-lg font-semibold mb-1">Chopping Pairs</h2>
          <p className="text-sm text-gray-600 mb-3">
            Display two proteins with domain chopping.
          </p>
          <Viewer
            proteins={proteins5}
            modelSourceUrls={modelSourceUrls}
            height={viewerHeight}
          />
        </div>

        {/* All labels visible */}
        <div className="w-full md:w-1/3 px-2 mb-4">
          <h2 className="text-lg font-semibold mb-1">All Labels Visible</h2>
          <p className="text-sm text-gray-600 mb-3">
            Show all domain labels on a protein.
          </p>
          <Viewer
            proteins={proteins6}
            modelSourceUrls={modelSourceUrls}
            height={viewerHeight}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
