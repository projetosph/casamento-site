const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.warn(
    "DATABASE_URL não configurada. O PostgreSQL só funcionará quando essa variável existir."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
});

pool.on("connect", () => {
  console.log("PostgreSQL conectado");
});

pool.on("error", (erro) => {
  console.error("Erro inesperado no PostgreSQL:", erro);
});

async function iniciarBanco() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL não configurada no ambiente."
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS presentes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      descricao TEXT,
      categoria TEXT,
      valor NUMERIC(10,2) NOT NULL DEFAULT 0,
      arrecadado NUMERIC(10,2) NOT NULL DEFAULT 0,
      imagem TEXT,
      link TEXT,
      comprado BOOLEAN NOT NULL DEFAULT FALSE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS presencas (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      nomes JSONB NOT NULL DEFAULT '[]'::jsonb,
      quantidade INTEGER NOT NULL DEFAULT 1,
      mensagem TEXT,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recados (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Tabelas PostgreSQL verificadas/criadas");
}

module.exports = {
  pool,
  iniciarBanco
};
