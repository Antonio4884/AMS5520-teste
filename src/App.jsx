import React, { useState } from "react";

function analisar({ olt, porta, idImplantacao, hht }) {
  if (!olt || !porta) {
    return "Preencha OLT e PORTA.";
  }

  const partes = porta.split("/").map((p) => p.trim());

  const lt = partes[2];
  const pon = partes[3];
  const ont = partes[4];

  const tipo = ont ? "SECUNDARIA" : "PRIMARIA";

  // ---------------- PRIMARIA ----------------
  if (tipo === "PRIMARIA") {
    const listaOlt = olt.split(",").map((o) => o.trim().toUpperCase());

    const linhas = listaOlt.map((o) => {
      return `${o}:R1.S1.LT${lt}.PON${pon} - ${idImplantacao || "SEM ID IMPLANTAÇÃO"}`;
    }).join("\n");

    return `Indisponibilidade em rede PRIMARIA:
GPON: ${listaOlt.join(", ")}

${linhas}`;
  }

  // ---------------- SECUNDARIA ----------------
  return `Indisponibilidade em rede SECUNDARIA - Com afetação
${olt.toUpperCase()}:R1.S1.LT${lt}.PON${pon}

HHT-AFETADOS:
${hht || "NÃO INFORMADO"}`;
}

export default function App() {
  const [olt, setOlt] = useState("");
  const [porta, setPorta] = useState("");
  const [idImplantacao, setIdImplantacao] = useState("");
  const [hht, setHht] = useState("");
  const [saida, setSaida] = useState("");

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>Gerador de Carimbo NOC</h2>

      <input
        placeholder="OLT (ex: OLTCTA21, OLTCTA22)"
        value={olt}
        onChange={(e) => setOlt(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <input
        placeholder="PORTA (ex: 1/1/16/7)"
        value={porta}
        onChange={(e) => setPorta(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <input
        placeholder="ID Implantação (primária)"
        value={idImplantacao}
        onChange={(e) => setIdImplantacao(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <textarea
        placeholder="HHT afetados (secundária)"
        value={hht}
        onChange={(e) => setHht(e.target.value)}
        style={{ width: "100%", height: 120, marginBottom: 10 }}
      />

      <button
        onClick={() =>
          setSaida(analisar({ olt, porta, idImplantacao, hht }))
        }
      >
        Gerar
      </button>

      <button
        onClick={() => navigator.clipboard.writeText(saida)}
        style={{ marginLeft: 10 }}
      >
        Copiar
      </button>

      <textarea
        value={saida}
        readOnly
        style={{
          width: "100%",
          height: 300,
          marginTop: 20,
          background: "#000",
          color: "#00ff88",
          fontFamily: "monospace",
        }}
      />
    </div>
  );
}
