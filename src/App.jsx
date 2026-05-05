import React, { useEffect, useState } from "react";

function extrairDadosGPON(texto) {
  const regex = /(OLT[A-Z0-9]+):R1\.S1\.(LT\d+)\.(PON\d+)/i;
  const match = texto.match(regex);

  if (!match) return null;

  return {
    olt: match[1].toUpperCase(),
    lt: match[2].toUpperCase(),
    pon: match[3].toUpperCase(),
  };
}

function analisarAlarme(texto, dados) {
  const info = extrairDadosGPON(texto);

  if (!info) {
    return "Não foi possível identificar OLT/LT/PON.";
  }

  const { olt, lt, pon } = info;

  const numeroLT = lt.replace("LT", "");
  const numeroPON = pon.replace("PON", "");

  const encontrados = dados.filter((item) => {
    const oltItem = (item["OLT"] || "").toUpperCase();
    const porta = (item["Porta"] || "").toUpperCase();

    return (
      oltItem === olt &&
      porta.includes(`/${numeroLT}/`) &&
      porta.includes(`/${numeroPON}`)
    );
  });

  if (!encontrados.length) {
    return `Nenhuma correspondência encontrada para:
${olt} ${lt} ${pon}`;
  }

  const implantacoes = encontrados.map(
    (item) => item["ID Implantação"] || "SEM ID IMPLANTAÇÃO"
  );

  const descricao = [...new Set(implantacoes)].join("\n");

  const tipo = texto.includes("ONT:")
    ? "SECUNDARIA"
    : texto.includes("PON Port:")
    ? "PRIMARIA"
    : "GPON";

  return `Indisponibilidade em rede ${tipo}:
GPON: ${olt}


${olt}:R1.S1.${lt}.${pon} - ${descricao}`;
}

export default function App() {
  const [entrada, setEntrada] = useState("");
  const [saida, setSaida] = useState("");
  const [dados, setDados] = useState([]);

  useEffect(() => {
    async function carregarCSV() {
      try {
        const response = await fetch("/Base_clientes_Horizon.csv");
        const text = await response.text();

        const linhas = text.split("\n").filter(Boolean);
        const headers = linhas[0].split(",");

        const rows = linhas.slice(1).map((linha) => {
          const valores = linha.split(",");
          const obj = {};

          headers.forEach((header, index) => {
            obj[header.trim()] = (valores[index] || "").trim();
          });

          return obj;
        });

        setDados(rows);
      } catch (error) {
        console.error(error);
      }
    }

    carregarCSV();
  }, []);

  function processar() {
    setSaida(analisarAlarme(entrada, dados));
  }

  function limpar() {
    setEntrada("");
    setSaida("");
  }

  async function copiar() {
    if (!saida) return;
    await navigator.clipboard.writeText(saida);
    alert("Resultado copiado!");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        padding: 24,
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          background: "white",
          padding: 24,
          borderRadius: 16,
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        }}
      >
        <h1>AMS5520 / Horizon</h1>

        <textarea
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          placeholder="Cole alarmes GPON aqui"
          style={{
            width: "100%",
            height: 200,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccc",
            marginBottom: 20,
          }}
        />

        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <button onClick={processar}>Pesquisar</button>
          <button onClick={copiar}>📋 Copiar</button>
          <button onClick={limpar}>🗑️ Limpar</button>
        </div>

        <textarea
          value={saida}
          readOnly
          style={{
            width: "100%",
            height: 320,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#000",
            color: "#00ff88",
            fontFamily: "monospace",
          }}
        />
      </div>
    </div>
  );
}
