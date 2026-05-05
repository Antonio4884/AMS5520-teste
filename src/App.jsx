import React, { useEffect, useState } from "react";

// ---------------- NORMALIZA PORTA ----------------
function normalizarPorta(p) {
  return (p || "")
    .replace(/\s+/g, "")
    .replace(/\r/g, "")
    .trim();
}

// ---------------- ANALISA REGRA ----------------
function analisar({ olt, porta, indexBase }) {
  if (!olt || !porta) return "Preencha OLT e PORTA.";

  const olts = olt
    .split(",")
    .map((o) => o.trim().toUpperCase())
    .filter(Boolean);

  const portas = porta
    .split(/\n|,/)
    .map((p) => p.trim())
    .filter(Boolean);

  const linhasPrimaria = [];
  const linhasSecundaria = [];

  portas.forEach((p) => {
    const partes = normalizarPorta(p).split("/");

    const lt = partes[2];
    const pon = partes[3];
    const ont = partes[4];

    const isSecundaria = partes.length === 5;

    olts.forEach((o) => {
      const chave = `${o}|${partes.join("/")}`;
      const base = indexBase[chave];

      // ---------------- PRIMÁRIA ----------------
      if (!isSecundaria) {
        const idImplantacao =
          base?.idImplantacao || "SEM ID IMPLANTAÇÃO";

        linhasPrimaria.push(
          `${o}:R1.S1.LT${lt}.PON${pon} - ${idImplantacao}`
        );
      }

      // ---------------- SECUNDÁRIA ----------------
      if (isSecundaria) {
        const customerId =
          base?.customerId || "SEM CUSTOMER ID";

        linhasSecundaria.push(
          `${o}:R1.S1.LT${lt}.PON${pon}.ONT${ont} - ${customerId}`
        );
      }
    });
  });

  if (linhasSecundaria.length > 0) {
    return `Indisponibilidade em rede SECUNDARIA - Com afetação
GPON: ${olts.join(", ")}

${linhasSecundaria.join("\n")}`;
  }

  return `Indisponibilidade em rede PRIMARIA:
GPON: ${olts.join(", ")}


${linhasPrimaria.join("\n")}`;
}

// ---------------- APP ----------------
export default function App() {
  const [olt, setOlt] = useState("");
  const [porta, setPorta] = useState("");
  const [saida, setSaida] = useState("");

  const [indexBase, setIndexBase] = useState({});

  // ---------------- CARREGAR PLANILHA ----------------
  useEffect(() => {
    async function carregarCSV() {
      const response = await fetch("/Base_clientes_Horizon.csv");
      const text = await response.text();

      const linhas = text.split("\n").filter(Boolean);
      const headers = linhas[0].split(",");

      const index = {};

      linhas.slice(1).forEach((linha) => {
        const valores = linha.split(",");
        const obj = {};

        headers.forEach((h, i) => {
          obj[h.trim()] = (valores[i] || "").trim();
        });

        const olt = obj["OLT"];
        const porta = obj["Porta"];
        const idImplantacao = obj["ID Implantação"];
        const customerId = obj["Customer ID"];

        if (!olt || !porta) return;

        const chave = `${olt.toUpperCase()}|${normalizarPorta(porta)}`;

        index[chave] = {
          idImplantacao,
          customerId,
        };
      });

      setIndexBase(index);
    }

    carregarCSV();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>Gerador NOC - AMS5520</h2>

      <input
        placeholder="OLT (ex: OLTCTA11, OLTCTA22)"
        value={olt}
        onChange={(e) => setOlt(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <textarea
        placeholder="PORTA (ex: 1/1/9/4 ou 1/1/9/4/5)"
        value={porta}
        onChange={(e) => setPorta(e.target.value)}
        style={{ width: "100%", height: 120, marginBottom: 10 }}
      />

      <button
        onClick={() =>
          setSaida(analisar({ olt, porta, indexBase }))
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
