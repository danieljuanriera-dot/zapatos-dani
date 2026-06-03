import { useState, useEffect } from "react";
import { QrReader } from "react-qr-reader";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxXRLi8KECMTkku8WyjIvbyO--N3tJfx_oIQU1PPN4_aqnmkTApo6jYqh03iAJ5kUSz/exec";

export default function App() {

  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  // ✅ QR CORRECTO (IMPORTANTE: devuelve una URL)
  const getQR = (codigo) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}?q=${codigo}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
  };

  // ✅ CARGAR DATOS
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(SCRIPT_URL + "?action=read");
      const json = await res.json();

      if (json.ok) {
        setData(json.data);
        setFiltered(json.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // ✅ LEER QUERY (?q=123)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");

    if (q) {
      setSearch(q);
    }

    loadData();
  }, []);

  // ✅ FILTRO
  useEffect(() => {
    const q = search.toLowerCase();

    const result = data.filter(
      (item) =>
        item.codigo?.toLowerCase().includes(q) ||
        item.marca?.toLowerCase().includes(q)
    );

    setFiltered(result);
  }, [search, data]);

  // ✅ GUARDAR
  const updateItem = async (codigo, estado) => {
    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", codigo, estado })
      });

      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // ✅ SCAN QR
  const handleScan = (result) => {
    if (result?.text) {
      setSearch(result.text);
      setScanning(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>👟 Zapatos Dani</h1>

      <input
        placeholder="Buscar..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: 10, width: "100%", marginBottom: 10 }}
      />

      <button onClick={() => setScanning(!scanning)}>
        📷 Escanear QR
      </button>

      {scanning && (
        <div style={{ margin: "20px 0" }}>
          <QrReader
            constraints={{ facingMode: "environment" }}
            onResult={(result) => handleScan(result)}
          />
        </div>
      )}

      <button onClick={loadData}>🔄 Recargar</button>

      {loading && <p>Cargando...</p>}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 15,
        marginTop: 20
      }}>
        {filtered.map((item) => (
          <div key={item.codigo} style={{
            border: "1px solid #ddd",
            padding: 10,
            textAlign: "center"
          }}>

            <h3>{item.codigo}</h3>

          <img src={getQR(item.codigo)} alt="QR" style={{ width: 120, marginBottom: 10 }} />

            <p>{item.marca}</p>

            <input
              defaultValue={item.estado}
              onBlur={(e) => updateItem(item.codigo, e.target.value)}
            />

          </div>
        ))}
      </div>
    </div>
  );
}