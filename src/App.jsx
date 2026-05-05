import React, { useEffect, useState } from "react";

function gerarCarimbo(texto) {
  try {
    const textoLimpo = texto.replace(/<!--.*?-->/g, "");

    const partes = textoLimpo
      .split(/\t|\n|,/)
      .map((p) => p.trim())
      .filter(Boolean);

    let equipamento = "";
    let dataHora = "";
    let alarme = "";
    let ip = "";

    const alarmesConhecidos = [
      "DEVICE HAS STOPPED RESPONDING TO POLLS",
      "Communication Failure",
      "The Device is offline",
      "Link down",
      "Link Up",
      "LOS",
      "PONLOS",
    ];

    for (const item of partes) {
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(item)) {
        ip = item;
        continue;
      }

      if (
        item.includes("BRT") ||
        /\d{1,2}\sde\s.+\s\d{2}:\d{2}:\d{2}/i.test(item)
      ) {
        dataHora = item;
        continue;
      }

      if (
        alarmesConhecidos.some((txt) =>
          item.toUpperCase().includes(txt.toUpperCase())
        )
      ) {
        alarme = item;
        continue;
      }

      if (
        !equipamento &&
        item !== "No" &&
        /^[A-Za-z0-9\-_:()./]+$/.test(item) &&
        !item.includes("Directly Managed") &&
        !item.includes("EventModel")
      ) {
        equipamento = item;
      }
    }

    return `.-:CARIMBO DE ABERTURA - NOC:-.

Falha: 

Equipamento: ${equipamento || "N/A"}

Alarme: ${alarme || "N/A"}

Data/Hora: ${dataHora || "N/A"}

IP: ${ip || "N/A"}

Interface: N/A`;
  } catch {
    return "Erro ao processar alarme.";
  }
}

function analisarAlarmes(texto) {
  const linhas = texto.split("\n");
  const grupos = {};

  linhas.forEach((linha) => {
    if (!linha.trim()) return;

    const partes = linha
      .split("\t")
      .map((p) => p.trim())
      .filter(Boolean);

    let equipamento = null;

    const indiceBRT = partes.findIndex((p) => p.includes("BRT"));
    if (indiceBRT !== -1 && partes[indiceBRT + 1]) {
      equipamento = partes[indiceBRT + 1];
    }

    if (!equipamento && partes.length >= 2) {
      const candidato = partes[1];
      if (/^[A-Za-z0-9\-_]+(\(.*\))?$/.test(candidato)) {
        equipamento = candidato;
      }
    }

    if (!equipamento) return;

    let grupo = "OUTROS";

    const parenteses = equipamento.match(/^([A-Za-z0-9]+)\(/);
    if (parenteses) {
      grupo = parenteses[1].toUpperCase();
    } else {
      const prefixo = equipamento.match(/^([a-zA-Z]+\d*)/);
      if (prefixo) grupo = prefixo[1].toUpperCase();
    }

    if (!grupos[grupo]) grupos[grupo] = [];
    grupos[grupo].push(equipamento);
  });

  let resultado = "Análise: Possível falha massiva / backbone / gerência\n\n";

  Object.keys(grupos)
    .sort()
    .forEach((grupo) => {
      const equipamentos = [...new Set(grupos[grupo])].sort();

      resultado += `[${grupo}] (${equipamentos.length})\n`;

      for (let i = 0; i < equipamentos.length; i += 4) {
        resultado +=
          equipamentos
            .slice(i, i + 4)
            .map((e) => e.padEnd(28, " "))
            .join("") + "\n\n";
      }

      resultado += "\n";
    });

  return resultado;
}

function analisarPrimaria(texto, dados) {
  const regex = /(OLT[A-Z0-9]+).*?(LT\d+)\.(PON\d+)/i;
  const match = texto.match(regex);

  if (!match) {
    return "Não foi possível identificar OLT/LT/PON.";
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

  const linhas = encontrados
    .map((item) => {
      const implantacao = item["ID Implantação"] || "SEM ID IMPLANTAÇÃO";
      return `${olt}:R1.S1.${lt}.${pon} - ${implantacao}`;
    })
    .join("\n");

  return `Indisponibilidade em rede PRIMARIA:
GPON: ${olt}

${linhas}`;
}

export default function App() {
  const [entrada, setEntrada] = useState("");
  const [saida, setSaida] = useState("");
  const [dados, setDados] = useState([]);

  useEffect(() => {
    async function carregarCSV() {
      try {
        const response = await fetch("/Base_Cliente.csv");
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

  function limpar() {
    setEntrada("");
    setSaida("");
  }

  async function copiar() {
    await navigator.clipboard.writeText(saida);
    alert("Resultado copiado!");
  }

  return (
    <div style={{ padding: 24, fontFamily: "Arial" }}>
      <h1>📄 NOC Toolkit + AMS5520</h1>

      <textarea
        value={entrada}
        onChange={(e) => setEntrada(e.target.value)}
        placeholder="Cole alarmes ou consulta"
        style={{
          width: "100%",
          height: 180,
          marginBottom: 16,
          padding: 12,
        }}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => setSaida(gerarCarimbo(entrada))}>
          Gerar Carimbo
        </button>

        <button onClick={() => setSaida(analisarAlarmes(entrada))}>
          Analisar Alarmes
        </button>

        <button onClick={() => setSaida(analisarPrimaria(entrada, dados))}>
          Analisar Primária
        </button>

        <button onClick={copiar}>📋 Copiar</button>
        <button onClick={limpar}>🗑️ Limpar</button>
      </div>

      <textarea
        value={saida}
        readOnly
        style={{
          width: "100%",
          height: 400,
          marginTop: 20,
          background: "#000",
          color: "#00ff88",
          padding: 12,
          fontFamily: "monospace",
        }}
      />
    </div>
  );
}
