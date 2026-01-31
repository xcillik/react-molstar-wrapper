import "./globals.css";
import Viewer from "../lib/react/Viewer";
import { useRef, useState, useMemo, useId } from "react";
import type { Protein, ViewerRef } from "../lib";

const proteins1: Protein[] = [
  {
    uniProtId: "P69905",
  },
  {
    uniProtId: "A0A2J8INE6",
    superposition: {
      rotation: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ] as [
        [number, number, number],
        [number, number, number],
        [number, number, number],
      ],
      translation: [0, 0, 0] as [number, number, number],
    },
  },
];

const proteins2: Protein[] = [
  {
    uniProtId: "A0A2N7XP94",
    chopping: [
      {
        label: "Domain 1",
        showLabel: true,
        ranges: [
          { start: 1, end: 5 },
          { start: 10, end: 45 },
        ],
      },
      {
        label: "Domain 2",
        showLabel: false,
        ranges: [{ start: 400, end: 500 }],
      },
      {
        label: "Domain 3",
        showLabel: false,
        ranges: [{ start: 530, end: 570 }],
      },
      {
        label: "Domain 4",
        showLabel: false,
        ranges: [{ start: 600, end: 680 }],
      },
      {
        label: "Domain 5",
        showLabel: false,
        ranges: [{ start: 720, end: 850 }],
      },
      {
        label: "Domain 6",
        showLabel: false,
        ranges: [{ start: 900, end: 950 }],
      },
    ],
  },
  {
    uniProtId: "A0A502HNZ2",
    chopping: [
      {
        label: "Domain 1",
        showLabel: false,
        ranges: [{ start: 1, end: 30 }],
      },
      {
        label: "Domain 2",
        showLabel: false,
        ranges: [{ start: 100, end: 160 }],
      },
      {
        label: "Domain 3",
        showLabel: false,
        ranges: [{ start: 180, end: 230 }],
      },
      {
        label: "Domain 4",
        showLabel: false,
        ranges: [{ start: 250, end: 300 }],
      },
      {
        label: "Domain 5",
        showLabel: false,
        ranges: [{ start: 320, end: 380 }],
      },
      {
        label: "Domain 6",
        showLabel: false,
        ranges: [{ start: 400, end: 450 }],
      },
    ],
  },
  // { uniProtId: "P68871" },
];

const proteins3: Protein[] = [
  {
    uniProtId: "A0A2N7XP94",
    // representation: "ball_and_stick" as const,
  },
  { uniProtId: "A0A448DWS8" },
  { uniProtId: "A0A2T5SU65" },
];

const proteins4: Protein[] = [
  {
    uniProtId: "A0A2N7XP94",
    chopping: [
      {
        label: "Domain 1",
        showLabel: true,
        ranges: [
          { start: 1, end: 100 },
          { start: 150, end: 300 },
        ],
      },
    ],
  },
];

const proteins5: Protein[] = [
  {
    uniProtId: "A0A2J8INE6",
    chopping: [
      {
        label: "Domain 1",
        showLabel: false,
        ranges: [{ start: 1, end: 50 }],
      },
    ],
  },
  {
    uniProtId: "P68871",
    chopping: [
      {
        label: "Hemoglobin subunit beta",
        showLabel: false,
        ranges: [{ start: 1, end: 60 }],
      },
    ],
  },
];

const proteins6 = [
  {
    uniProtId: "A0A2N7XP94",
    chopping: [
      {
        label: "Domain 1",
        showLabel: true,
        ranges: [
          { start: 1, end: 5 },
          { start: 10, end: 45 },
        ],
      },
      {
        label: "Domain 2",
        showLabel: true,
        ranges: [{ start: 400, end: 500 }],
      },
      {
        label: "Domain 3",
        showLabel: true,
        ranges: [{ start: 530, end: 570 }],
      },
      {
        label: "Domain 4",
        showLabel: true,
        ranges: [{ start: 600, end: 680 }],
      },
      {
        label: "Domain 5",
        showLabel: true,
        ranges: [{ start: 720, end: 850 }],
      },
      {
        label: "Domain 6",
        showLabel: true,
        ranges: [{ start: 900, end: 950 }],
      },
    ],
  },
];

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

  const handleDomainHover = (domainId: number) => {
    viewerRef.current?.highlight(0, `Domain ${domainId}`);
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
      <div className="flex flex-wrap -mx-2">
        <div className="w-full md:w-1/3 px-2 mb-4">
          <Viewer
            proteins={proteins4}
            modelSourceUrls={modelSourceUrls}
            // spin={true}
            height={600}
            // bgColor="#FFFFFF"
          />
        </div>
        <div className="w-full md:w-1/3 px-2 mb-4">
          <div className="mb-4">
            <button
              onClick={() => setLabelsVisible(!labelsVisible)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Toggle Labels {labelsVisible ? "Off" : "On"}
            </button>
          </div>
          <Viewer
            ref={viewerRef}
            // proteins={proteins6}
            proteins={proteins2}
            modelSourceUrls={modelSourceUrls}
            // rock={true}
            height={600}
            // bgColor="#00FF00"
            labels={labelsVisible}
          />

          <div
            onMouseEnter={() => handleDomainHover(1)}
            onMouseLeave={() => handleDomainLeave()}
          >1</div>
          {/* <div
            onMouseEnter={() => handleDomainHover(2)}
            onMouseLeave={() => handleDomainLeave()}
          >2</div>
          <div
            onMouseEnter={() => handleDomainHover(3)}
            onMouseLeave={() => handleDomainLeave()}
          >3</div> */}

          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-bold mb-3">Translation</h3>
            <div className="mb-3">
              <label
                htmlFor={`${rotationIdBase}-tx`}
                className="block text-sm font-medium mb-1"
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
                className="w-full"
              />
            </div>
            <div className="mb-3">
              <label
                htmlFor={`${rotationIdBase}-ty`}
                className="block text-sm font-medium mb-1"
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
                className="w-full"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor={`${rotationIdBase}-tz`}
                className="block text-sm font-medium mb-1"
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
                className="w-full"
              />
            </div>

            <h3 className="font-bold mb-3">Rotation (degrees)</h3>
            <div className="mb-3">
              <label
                htmlFor={`${rotationIdBase}-rx`}
                className="block text-sm font-medium mb-1"
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
                className="w-full"
              />
            </div>
            <div className="mb-3">
              <label
                htmlFor={`${rotationIdBase}-ry`}
                className="block text-sm font-medium mb-1"
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
                className="w-full"
              />
            </div>
            <div>
              <label
                htmlFor={`${rotationIdBase}-rz`}
                className="block text-sm font-medium mb-1"
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
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/3 px-2 mb-4">
          <Viewer
            proteins={proteins3}
            modelSourceUrls={modelSourceUrls}
            // initialUI="minimal"
            // spin={true}
            height={600}
            bgColor="#FFFFFF"
          />
        </div>

        <div className="w-full md:w-1/3 px-2 mb-4">
          <Viewer
            proteins={proteins1}
            modelSourceUrls={modelSourceUrls}
            height={600}
          />
        </div>

        <div className="w-full md:w-1/3 px-2 mb-4">
          <Viewer
            proteins={proteins5}
            modelSourceUrls={modelSourceUrls}
            height={600}
          />
        </div>

        <div className="w-full md:w-1/3 px-2 mb-4">
          <Viewer
            proteins={proteins2}
            modelSourceUrls={modelSourceUrls}
            height={600}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
