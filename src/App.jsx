import { useEffect, useMemo, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxXRLi8KECMTkku8WyjIvbyO--N3tJfx_oIQU1PPN4_aqnmkTApo6jYqh03iAJ5kUSz/exec";

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function extractSearchValue(rawText) {
  const text = String(rawText ?? "").trim();
  if (!text) return "";

  try {
    const url = new URL(text);
    const q = url.searchParams.get("q");
    if (q) return q.trim();

    const lastPath = url.pathname.split("/").filter(Boolean).pop();
    if (lastPath) return decodeURIComponent(lastPath).trim();

    return text;
  } catch {
    return text;
  }
}

export default function App() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingCode, setSavingCode] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [loadError, setLoadError] = useState("");

  const filteredItems = useMemo(() => {
    const q = normalize(search);

    if (!q) return items;

    return items.filter((item) =>
      [
        item.codigo,
        item.marca,
        item.tipo,
        item.color,
        item.talla,
        item.temporada,
        item.ubicacion,
        item.zona,
        item.estado,
      ].some((field) => normalize(field).includes(q))
    );
  }, [items, search]);

  const loadData = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch(`${SCRIPT_URL}?action=read`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();

      if (!json?.ok || !Array.isArray(json.data)) {
        throw new Error("Respuesta inválida del Apps Script");
      }

      setItems(json.data);
    } catch (error) {
      console.error(error);
      setLoadError("No se pudieron cargar los datos de Google Sheets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");

    if (q) {
      setSearch(q);
    }

    loadData();
  }, []);

  const updateEstado = async (codigo, estado) => {
    setSavingCode(codigo);

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update",
          codigo,
          estado,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();

      if (!json?.ok) {
        throw new Error(json?.error || "No se pudo guardar");
      }

      setItems((prev) =>
        prev.map((item) =>
          item.codigo === codigo ? { ...item, estado } : item
        )
      );
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar el cambio en Google Sheets.");
    } finally {
      setSavingCode("");
    }
  };

  const buildItemAppUrl = (codigo) => {
    const origin = window.location.origin;
    const url = new URL(window.location.pathname || "/", origin);
    url.searchParams.set("q", codigo);
    return url.toString();
  };

  const buildQrImageUrl = (codigo) => {
    const itemUrl = buildItemAppUrl(codigo);
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
      itemUrl
    )}`;
  };

  const handleScan = (detectedCodes) => {
    if (!Array.isArray(detectedCodes) || detectedCodes.length === 0) return;

    const firstCode = detectedCodes[0];
    const rawValue = firstCode?.rawValue ?? "";
    const value = extractSearchValue(rawValue);

    if (!value) return;

    setSearch(value);
    setShowScanner(false);
    setCameraError("");

    const url = new URL(window.location.href);
    url.searchParams.set("q", value);
    window.history.replaceState({}, "", url.toString());
  };

  const cardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    background: "#ffffff",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: 20,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        color: "#111827",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>👟 Zapatos Dani</h1>
            <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
              Inventario conectado a Google Sheets con QR y escáner
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={loadData}
              disabled={loading}
              style={{
                border: "none",
                borderRadius: 10,
                padding: "10px 14px",
                background: "#111827",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {loading ? "Cargando..." : "🔄 Recargar"}
            </button>

            <button
              onClick={() => {
                setShowScanner((prev) => !prev);
                setCameraError("");
              }}
              style={{
                border: "none",
                borderRadius: 10,
                padding: "10px 14px",
                background: showScanner ? "#dc2626" : "#2563eb",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {showScanner ? "✖ Cerrar escáner" : "📷 Escanear QR"}
            </button>
          </div>
        </header>

        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 16,
            border: "1px solid #e5e7eb",
            marginBottom: 20,
          }}
        >
          <input
            type="text"
            placeholder="Buscar por código, marca, tipo, color, ubicación, estado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 12,
              border: "1px solid #d1d5db",
              padding: "0 14px",
              fontSize: 15,
              boxSizing: "border-box",
            }}
          />

          <div
            style={{
              marginTop: 12,
              fontSize: 14,
              color: "#6b7280",
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span>
              Total cargados: <strong>{items.length}</strong>
            </span>
            <span>
              Mostrando: <strong>{filteredItems.length}</strong>
            </span>
          </div>
        </div>

        {showScanner && (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 16,
              border: "1px solid #e5e7eb",
              marginBottom: 20,
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: 20 }}>Escáner QR</h2>
            <p style={{ color: "#6b7280", marginTop: 0 }}>
              Apunta al QR de una caja o etiqueta. Si el QR contiene una URL de
              la app, se extraerá automáticamente el parámetro <code>?q=</code>.
            </p>

            <div
              style={{
                maxWidth: 420,
                overflow: "hidden",
                borderRadius: 16,
                border: "1px solid #d1d5db",
              }}
            >
              <Scanner
                onScan={handleScan}
                onError={(error) => {
                  console.error(error);
                  setCameraError("No se pudo acceder a la cámara.");
                }}
                constraints={{ facingMode: "environment" }}
                formats={["qr_code"]}
                styles={{
                  container: {
                    width: "100%",
                    background: "#000",
                  },
                  video: {
                    width: "100%",
                    height: "auto",
                    objectFit: "cover",
                  },
                }}
              />
            </div>

            {cameraError && (
              <p style={{ color: "#b91c1c", marginTop: 12 }}>{cameraError}</p>
            )}
          </div>
        )}

        {loadError && (
          <div
            style={{
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: 14,
              marginBottom: 20,
            }}
          >
            {loadError}
          </div>
        )}

        {filteredItems.length === 0 && !loading ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              border: "1px solid #e5e7eb",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            No hay resultados para la búsqueda actual.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {filteredItems.map((item) => (
              <article key={item.codigo} style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 20,
                        lineHeight: 1.2,
                        wordBreak: "break-word",
                      }}
                    >
                      {item.codigo}
                    </h3>
                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "#374151",
                        fontWeight: 600,
                      }}
                    >
                      {item.marca || "Sin marca"}
                    </p>
                  </div>

                  <img
                    src={buildQrImageUrl(item.codigo)}
                    alt={`QR de ${item.codigo}`}
                    width={96}
                    height={96}
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      flexShrink: 0,
                    }}
                  />
                </div>

                <div
                  style={{
                    marginTop: 14,
                    fontSize: 14,
                    color: "#4b5563",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div>
                    <strong>Tipo:</strong> {item.tipo || "-"}
                  </div>
                  <div>
                    <strong>Color:</strong> {item.color || "-"}
                  </div>
                  <div>
                    <strong>Talla:</strong> {item.talla || "-"}
                  </div>
                  <div>
                    <strong>Temporada:</strong> {item.temporada || "-"}
                  </div>
                  <div>
                    <strong>Ubicación:</strong> {item.ubicacion || "-"}
                  </div>
                  <div>
                    <strong>Zona:</strong> {item.zona || "-"}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <label
                    htmlFor={`estado-${item.codigo}`}
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    Estado
                  </label>

                  <input
                    id={`estado-${item.codigo}`}
                    type="text"
                    defaultValue={item.estado || ""}
                    onBlur={(e) => updateEstado(item.codigo, e.target.value)}
                    disabled={savingCode === item.codigo}
                    style={{
                      width: "100%",
                      height: 40,
                      borderRadius: 10,
                      border: "1px solid #d1d5db",
                      padding: "0 12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <a
                    href={buildItemAppUrl(item.codigo)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "#2563eb",
                      fontSize: 13,
                      textDecoration: "none",
                      wordBreak: "break-all",
                    }}
                  >
                    Abrir enlace de este QR
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
