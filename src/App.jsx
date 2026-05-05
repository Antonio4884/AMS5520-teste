import React, { useEffect, useState } from "react";

function extrairInfo(texto) {
  const primaria =
    texto.match(/PON Port:(OLT[A-Z0-9]+):R1\.S1\.(LT\d+)\.(PON\d+)/i);

  if (primaria) {
    return {
      tipo: "PRIMARIA",
      olt: primaria[1].toUpperCase(),
      lt: primaria[2].replace("LT", ""),
      pon: primaria[3].replace("PON", ""),
      ont: null,
    };
  }

  const secundaria =
    texto.match(
      /ONT:(OLT[A-Z0-9]+):R1\.S1\.(LT\d+)\.(PON\d+)\.(ONT\d+)/i
    );

  if (secundaria) {
    return {
      tipo: "SECUNDARIA",
      olt: secundaria[1].toUpperCase(),
      lt: secundaria[2].replace("LT", ""),
      pon: secundaria[3].replace("PON", ""),
      ont: secundaria[4].replace("ONT", ""),
    };
  }

  return null;
}

function analisar(texto, dados) {
  const info = extrairInfo(texto);

  if (!info) {
    return "Não foi possível identificar o alarme.";
  }

  const { tipo, olt, lt, pon, ont } = info;

  const encontrados = dados.filter((item) => {
    const oltItem = (item["OLT"] || "").toUpperCase();
    const porta = (item["Porta"] || "").trim();

    if (oltItem !== olt) return false;

    const partesPorta = porta.split("/");

    if (tipo === "PRIMARIA") {
      return partesPorta[2] === lt && partesPorta[3] === pon;
    }

    if (tipo === "SECUNDARIA") {
      return (
        partesPorta[2] === lt &&
        partesPorta[3] === pon &&
        partesPorta[4] === ont
      );
    }

    return false;
  });

  if (!encontrados.length) {
    return `Indisponibilidade em rede ${tipo}:
GPON: ${olt}

Nenhuma correspondência encontrada.`;
  }

  const linhas = encontrados
    .map((item) => {
      const implantacao = item["ID Implantação"] || "SEM ID IMPLANTAÇÃO";

      if (tipo === "PRIMARIA") {
        return `${olt}:R1.S1.LT${lt}.PON${pon} - ${implantacao}`;
      }

      return `${olt}:R1.S1.LT${lt}.PON${pon}.ONT${ont} - ${implantacao}`;
    })
    .join("\n");

  return `Indisponibilidade em rede ${tipo}:
GPON: ${olt}

${linhas}`;
}

export default function App() {
  const [entrada, setEntrada] = useState("");
  const [saida, setSaida] = useState("");
  const [dados, setDados] = useState([]);

  useEffect(() => {
    async function carregarCSV() {
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
    }

    carregarCSV();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "Arial" }}>
      <h1>AMS5520 / Horizon</h1>

      <textarea
        value={entrada}
        onChange={(e) => setEntrada(e.target.value)}
        style={{ width: "100%", height: 200 }}
        placeholder="Cole aqui o alarme"
      />

      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <button onClick={() => setSaida(analisar(entrada, dados))}>
          Pesquisar
        </button>

        <button
          onClick={() => {
            navigator.clipboard.writeText(saida);
            alert("Copiado!");
          }}
        >
          Copiar
        </button>

        <button
          onClick={() => {
            setEntrada("");
            setSaida("");
          }}
        >
          Limpar
        </button>
      </div>

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
