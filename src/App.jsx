import React, { useEffect, useState } from "react";

function analisar({ olt, porta, indexPorta, hht }) {
  if (!olt || !porta) {
    return "Preencha OLT e PORTA.";
  }

  // 🔥 OLTs múltiplas
  const olts = olt
    .split(",")
    .map((o) => o.trim().toUpperCase())
    .filter(Boolean);

  // 🔥 portas múltiplas (ENTER ou vírgula)
  const portas = porta
    .split(/\n|,/)
    .map((p) => p.trim())
    .filter(Boolean);

  const linhasPrimaria = [];
  const linhasSecundaria = [];

  portas.forEach((p) => {
    const partes = p.split("/").map((x) => x.trim());

    if (partes.length < 4) return;

    const lt = partes[2];
    const pon = partes[3];
    const ont = partes[4];

    // 🔥 busca automática ID Implantação pela porta
    const idImplantacao = indexPorta[p] || "SEM ID IMPLANTAÇÃO";

    // ---------------- PRIMÁRIA ----------------
    if (!ont) {
      olts.forEach((o) => {
        linhasPrimaria.push(
          `${o}:R1.S1.LT${lt}.PON${pon} - ${idImplantacao}`
        );
      });
    }

    // ---------------- SECUNDÁRIA ----------------
    if (ont) {
      linhasSecundaria.push(
        `${olts[0]}:R1.S1.LT${lt}.PON${pon}.ONT${ont}`
      );
    }
  });

  // ---------------- SAÍDA PRIMÁRIA ----------------
  if (linhasPrimaria.length > 0 && linhasSecundaria.length === 0) {
    return `Indisponibilidade em rede PRIMARIA:
GPON: ${olts.join(", ")}


${linhasPrimaria.join("\n")}`;
  }

  // ---------------- SAÍDA SECUNDÁRIA ----------------
  if (linhasSecundaria.length > 0) {
    return `Indisponibilidade em rede SECUNDARIA - Com afetação
GPON: ${olts.join(", ")}


${linhasSecundaria.join("\n")}

HHT-AFETADOS:
${hht || "NÃO INFORMADO"}`;
  }

  return "Não foi possível identificar o tipo de alarme.";
}

export default function App() {
  const [olt, setOlt] = useState("");
  const [porta, setPorta] = useState("");
  const [hht, setHht] = useState("");
  const [saida, setSaida] = useState("");

  const [dados, setDados] = useState([]);
  const [indexPorta, setIndexPorta] = useState({});

  // ---------------- CARREGAR CSV ----------------
  useEffect(() => {
    async function carregarCSV() {
      const response = await fetch("/Base_clientes_Horizon.csv");
      const text = await response.text();

      const linhas = text.split("\n").filter(Boolean);
      const headers = linhas[0].split(",");

      const rows = [];
      const index = {};

      linhas.slice(1).forEach((linha) => {
        const valores = linha.split(",");
        const obj = {};

        headers.forEach((header, i) => {
          obj[header.trim()] = (valores[i] || "").trim();
        });

        rows.push(obj);

        // 🔥 INDEXAÇÃO POR PORTA
        const porta = obj["Porta"];
        if (porta) {
          index[porta.trim()] = obj["ID Implantação"];
        }
      });

      setDados(rows);
      setIndexPorta(index);
    }

    carregarCSV();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>Gerador de Carimbo NOC</h2>

      <input
        placeholder="OLT (ex: OLTCTA21, OLTCTA22)"
        value={olt}
        onChange={(e) => setOlt(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <textarea
        placeholder="PORTA (ex: 1/1/15/7 ou várias linhas)"
        value={porta}
        onChange={(e) => setPorta(e.target.value)}
        style={{ width: "100%", height: 120, marginBottom: 10 }}
      />

      <textarea
        placeholder="HHT afetados (secundária)"
        value={hht}
        onChange={(e) => setHht(e.target.value)}
        style={{ width: "100%", height: 120, marginBottom: 10 }}
      />

      <button
        onClick={() =>
          setSaida(analisar({ olt, porta, indexPorta, hht }))
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
