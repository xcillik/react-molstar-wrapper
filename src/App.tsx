import "./globals.css";
import Viewer, { type ViewerRef } from "./lib/react/Viewer";
import { useRef, useState, useMemo, useId } from "react";

function App() {
  const viewerRef = useRef<ViewerRef>(null);
  const rotationIdBase = useId();

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
    rz: number,
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

  const firstViewerProteins = useMemo(
    () => [
      {
        uniProtId: "P69905" as const,
        choppingData: [
          {
            start: 1,
            end: 10,
          },
          {
            start: 50,
            end: 100,
          },
        ],
      },
      {
        uniProtId: "H2PEZ7" as const,
        choppingData: [
          {
            start: 1,
            end: 10,
          },
          {
            start: 50,
            end: 100,
          },
        ],
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
    ],
    [],
  );

  const secondViewerProteins = useMemo(
    () => [
      {
        uniProtId: "H2PEZ7",
      },
      { uniProtId: "P69905" },
      { uniProtId: "P68871" },
    ],
    [],
  );

  const thirdViewerProteins = useMemo(
    () => [
      {
        uniProtId: "H2PEZ7",
        representation: "ball_and_stick" as const,
      },
    ],
    [],
  );

  const handleDomainHover = (domainId: number) => {
    viewerRef.current?.highlight(domainId);
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
      rotationZ,
    );
    viewerRef.current?.updateSuperposition(1, newTranslation, rotationMatrix);
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
      newRotation.z,
    );
    const translation: [number, number, number] = [
      translationX,
      translationY,
      translationZ,
    ];
    viewerRef.current?.updateSuperposition(1, translation, rotationMatrix);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-wrap -mx-2">
        <div className="w-full md:w-1/3 px-2 mb-4">
          <Viewer
            ref={viewerRef}
            proteins={firstViewerProteins}
            spin={true}
            height={600}
            bgColor="#FFFFFF"
          />
          <div style={{ marginTop: "16px" }}>
            {firstViewerProteins[0]?.choppingData?.map((domain, index) => (
              <fieldset
                key={`${domain.start}-${domain.end}`}
                style={{
                  marginBottom: "12px",
                  border: "1px solid #e0e0e0",
                  padding: "12px",
                  borderRadius: "4px",
                }}
                onMouseEnter={() => handleDomainHover(index)}
                onMouseLeave={handleDomainLeave}
              >
                <legend
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    padding: "0 4px",
                  }}
                >
                  Domain {index + 1} ({domain.start}-{domain.end}) - Translation
                </legend>
                <div
                  style={{ display: "flex", gap: "12px", alignItems: "center" }}
                >
                  <div style={{ flex: 1 }}>
                    <label
                      htmlFor={`slider-x-${index}`}
                      style={{ fontSize: "12px", marginRight: "4px" }}
                    >
                      X:
                    </label>
                    <input
                      id={`slider-x-${index}`}
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={translationX}
                      onChange={(e) =>
                        handleTranslationChange("x", Number(e.target.value))
                      }
                      style={{ width: "100%" }}
                    />
                    <span style={{ fontSize: "11px", marginLeft: "4px" }}>
                      {translationX}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      htmlFor={`slider-y-${index}`}
                      style={{ fontSize: "12px", marginRight: "4px" }}
                    >
                      Y:
                    </label>
                    <input
                      id={`slider-y-${index}`}
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={translationY}
                      onChange={(e) =>
                        handleTranslationChange("y", Number(e.target.value))
                      }
                      style={{ width: "100%" }}
                    />
                    <span style={{ fontSize: "11px", marginLeft: "4px" }}>
                      {translationY}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      htmlFor={`slider-z-${index}`}
                      style={{ fontSize: "12px", marginRight: "4px" }}
                    >
                      Z:
                    </label>
                    <input
                      id={`slider-z-${index}`}
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={translationZ}
                      onChange={(e) =>
                        handleTranslationChange("z", Number(e.target.value))
                      }
                      style={{ width: "100%" }}
                    />
                    <span style={{ fontSize: "11px", marginLeft: "4px" }}>
                      {translationZ}
                    </span>
                  </div>
                </div>
              </fieldset>
            ))}

            <fieldset
              style={{
                marginBottom: "12px",
                border: "1px solid #e0e0e0",
                padding: "12px",
                borderRadius: "4px",
              }}
              onMouseEnter={() => handleDomainHover(0)}
              onMouseLeave={handleDomainLeave}
            >
              <legend
                style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  padding: "0 4px",
                }}
              >
                Rotation (degrees)
              </legend>
              <div
                style={{ display: "flex", gap: "12px", alignItems: "center" }}
              >
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor={`${rotationIdBase}-x`}
                    style={{ fontSize: "12px", marginRight: "4px" }}
                  >
                    X:
                  </label>
                  <input
                    id={`${rotationIdBase}-x`}
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={rotationX}
                    onChange={(e) =>
                      handleRotationChange("x", Number(e.target.value))
                    }
                    style={{ width: "100%" }}
                  />
                  <span style={{ fontSize: "11px", marginLeft: "4px" }}>
                    {rotationX}°
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor={`${rotationIdBase}-y`}
                    style={{ fontSize: "12px", marginRight: "4px" }}
                  >
                    Y:
                  </label>
                  <input
                    id={`${rotationIdBase}-y`}
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={rotationY}
                    onChange={(e) =>
                      handleRotationChange("y", Number(e.target.value))
                    }
                    style={{ width: "100%" }}
                  />
                  <span style={{ fontSize: "11px", marginLeft: "4px" }}>
                    {rotationY}°
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor={`${rotationIdBase}-z`}
                    style={{ fontSize: "12px", marginRight: "4px" }}
                  >
                    Z:
                  </label>
                  <input
                    id={`${rotationIdBase}-z`}
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={rotationZ}
                    onChange={(e) =>
                      handleRotationChange("z", Number(e.target.value))
                    }
                    style={{ width: "100%" }}
                  />
                  <span style={{ fontSize: "11px", marginLeft: "4px" }}>
                    {rotationZ}°
                  </span>
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        <div className="w-full md:w-1/3 px-2 mb-4">
          <Viewer
            proteins={secondViewerProteins}
            rock={true}
            height={600}
            bgColor="#00FF00"
          />
        </div>

        <div className="w-full md:w-1/3 px-2 mb-4">
          <Viewer
            proteins={thirdViewerProteins}
            initialUI="minimal"
            spin={true}
            height={600}
            bgColor="#FFFFFF"
          />
        </div>
      </div>
    </div>
  );
}

export default App;
