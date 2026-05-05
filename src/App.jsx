import React, { useEffect, useState } from "react";

function analisarPrimaria(texto, dados) {
  const regex = /(OLT[A-Z0-9]+).*?(LT\d+)\.(PON\d+)/i;
  const match = texto.match(regex);

  if (!match) {
    return "Não foi possível identificar OLT/LT/PON no alarme.";
  }

  const olt = match[1].toUpperCase();
  const lt = match[2].toUpperCase();
  const pon = match[3].toUpperCase();

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
    return `Indisponibilidade em rede PRIMARIA:
GPON: ${olt}

Nenhuma correspondência encontrada.`;
  }

  const resultado = encontrados
    .map((item) => {
      const implantacao = item["ID Implantação"] || "SEM ID IMPLANTAÇÃO";
      return `${olt}:R1.S1.${lt}.${pon} - ${implantacao}`;
    })
    .join("\n");

  return `Indisponibilidade em rede PRIMARIA:
GPON: ${olt}


${resultado}`;
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
        console.error("Erro ao carregar CSV:", error);
      }
    }

    carregarCSV();
  }, []);

  function processar() {
    setSaida(analisarPrimaria(entrada, dados));
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
        <h1>🌐 Consulta AMS5520 / Horizon</h1>

        <textarea
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          placeholder="Cole aqui o alarme GPON"
          style={{
            width: "100%",
            height: 180,
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
          placeholder="Resultado aparecerá aqui"
          style={{
            width: "100%",
            height: 350,
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
