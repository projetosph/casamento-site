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
      ordem INTEGER,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  /* Migração segura: preserva todos os presentes já existentes. */
  await pool.query(`
    ALTER TABLE presentes
    ADD COLUMN IF NOT EXISTS ordem INTEGER;
  `);

  await pool.query(`
    WITH ordenados AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          ORDER BY COALESCE(ordem, 2147483647), id
        ) AS nova_ordem
      FROM presentes
    )
    UPDATE presentes AS p
    SET ordem = o.nova_ordem
    FROM ordenados AS o
    WHERE p.id = o.id
      AND p.ordem IS NULL;
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
