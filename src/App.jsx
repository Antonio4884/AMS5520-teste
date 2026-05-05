"use client";

import React, { useEffect, useState } from "react";

export default function App() {
  const [busca, setBusca] = useState("");
  const [dados, setDados] = useState([]);
  const [resultado, setResultado] = useState("");

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

  function pesquisar() {
    if (!busca) return;

    const termo = busca.toLowerCase();

    const encontrados = dados.filter((item) =>
      Object.values(item).some((valor) =>
        valor.toLowerCase().includes(termo)
      )
    );

    if (!encontrados.length) {
      setResultado("Nenhum registro encontrado.");
      return;
    }

    const texto = encontrados
      .map(
        (item) => `
Cidade: ${item["Cidade"] || "N/A"}
Customer ID: ${item["Customer ID"] || "N/A"}
Nome: ${item["Nome"] || "N/A"}
Endereço: ${item["Endereço"] || "N/A"}
ID Implantação: ${item["ID Implantação"] || "N/A"}
OLT: ${item["OLT"] || "N/A"}
Porta: ${item["Porta"] || "N/A"}
-----------------------------------
`
      )
      .join("\n");

    setResultado(texto);
  }

  function limpar() {
    setBusca("");
    setResultado("");
  }

  async function copiar() {
    await navigator.clipboard.writeText(resultado);
    alert("Resultado copiado!");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "#f1f5f9",
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
        <h1>AMS5520 - Consulta Base Cliente</h1>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar Customer ID, Nome, OLT ou Porta"
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <button onClick={pesquisar}>Pesquisar</button>
          <button onClick={copiar}>📋 Copiar</button>
          <button onClick={limpar}>🗑️ Limpar</button>
        </div>

        <textarea
          value={resultado}
          readOnly
          style={{
            width: "100%",
            height: 450,
            padding: 12,
            borderRadius: 8,
            background: "#000",
            color: "#00ff88",
            fontFamily: "monospace",
          }}
        />
      </div>
    </div>
  );
}