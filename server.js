const express = require("express");
const cors = require("cors");
const { criarPix, criarPagamentoCartao, consultarPagamento } = require("./services/mercadoPago");
const { salvarOuAtualizarPagamento, localizarPagamento, listarPagamentos } = require("./database/database");
const { pool, iniciarBanco } = require("./database");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || "https://casamento-backend-f7e4.onrender.com";

app.get("/", (req, res) => {
  res.json({ ok: true, servico: "casamento-backend", mensagem: "Backend funcionando" });
});


// ==========================================================
// PRESENTES - POSTGRESQL
// ==========================================================

function normalizarPresente(row) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao || "",
    categoria: row.categoria || "",
    valor: Number(row.valor) || 0,
    arrecadado: Number(row.arrecadado) || 0,
    imagem: row.imagem || "",
    link: row.link || "",
    comprado: Boolean(row.comprado),
    criadoEm: row.criado_em
  };
}

app.get("/presentes", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        id, nome, descricao, categoria, valor,
        arrecadado, imagem, link, comprado, criado_em
      FROM presentes
      ORDER BY id ASC
    `);

    res.json(resultado.rows.map(normalizarPresente));
  } catch (erro) {
    console.error("Erro ao listar presentes:", erro);
    res.status(500).json({
      erro: "Não foi possível carregar os presentes."
    });
  }
});

app.post("/presentes", async (req, res) => {
  try {
    const {
      nome,
      descricao = "",
      categoria = "",
      valor,
      arrecadado = 0,
      imagem = "",
      link = "",
      comprado = false
    } = req.body;

    const valorNumerico = Number(valor);
    const arrecadadoNumerico = Number(arrecadado) || 0;

    if (!nome || !Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      return res.status(400).json({
        erro: "Nome e valor válido são obrigatórios."
      });
    }

    const resultado = await pool.query(
      `
        INSERT INTO presentes
          (nome, descricao, categoria, valor, arrecadado, imagem, link, comprado)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        String(nome).trim(),
        String(descricao || "").trim(),
        String(categoria || "").trim(),
        valorNumerico,
        Math.max(arrecadadoNumerico, 0),
        String(imagem || "").trim(),
        String(link || "").trim(),
        Boolean(comprado)
      ]
    );

    res.status(201).json(
      normalizarPresente(resultado.rows[0])
    );
  } catch (erro) {
    console.error("Erro ao cadastrar presente:", erro);
    res.status(500).json({
      erro: "Não foi possível cadastrar o presente."
    });
  }
});

app.put("/presentes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      nome,
      descricao = "",
      categoria = "",
      valor,
      imagem = "",
      link = ""
    } = req.body;

    const valorNumerico = Number(valor);

    if (
      !Number.isInteger(id) ||
      !nome ||
      !Number.isFinite(valorNumerico) ||
      valorNumerico <= 0
    ) {
      return res.status(400).json({
        erro: "Dados do presente inválidos."
      });
    }

    const resultado = await pool.query(
      `
        UPDATE presentes
        SET
          nome = $1,
          descricao = $2,
          categoria = $3,
          valor = $4,
          imagem = $5,
          link = $6,
          comprado =
            CASE
              WHEN arrecadado >= $4 THEN TRUE
              ELSE FALSE
            END
        WHERE id = $7
        RETURNING *
      `,
      [
        String(nome).trim(),
        String(descricao || "").trim(),
        String(categoria || "").trim(),
        valorNumerico,
        String(imagem || "").trim(),
        String(link || "").trim(),
        id
      ]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        erro: "Presente não encontrado."
      });
    }

    res.json(normalizarPresente(resultado.rows[0]));
  } catch (erro) {
    console.error("Erro ao atualizar presente:", erro);
    res.status(500).json({
      erro: "Não foi possível atualizar o presente."
    });
  }
});

app.delete("/presentes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        erro: "ID do presente inválido."
      });
    }

    const resultado = await pool.query(
      "DELETE FROM presentes WHERE id = $1 RETURNING id",
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        erro: "Presente não encontrado."
      });
    }

    res.json({ ok: true, id });
  } catch (erro) {
    console.error("Erro ao excluir presente:", erro);
    res.status(500).json({
      erro: "Não foi possível excluir o presente."
    });
  }
});

app.get("/config/mercadopago", (req, res) => {
  const publicKey = process.env.MERCADO_PAGO_PUBLIC_KEY;
  if (!publicKey) return res.status(500).json({ erro: "MERCADO_PAGO_PUBLIC_KEY não configurada." });
  res.json({ publicKey });
});

app.post("/criar-pix", async (req, res) => {
  try {
    const { nome, email, valor, produtoId, produtoIndex, produtoNome, produtoImagem, tipoContribuicao } = req.body;
    const valorNumerico = Number(valor);

    if (!nome || !email || !produtoNome) return res.status(400).json({ erro: "Nome, e-mail e produto são obrigatórios." });
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) return res.status(400).json({ erro: "O valor informado é inválido." });

    const referencia = `${produtoId ?? produtoIndex ?? "produto"}:${Date.now()}`;

    const pagamento = await criarPix({
      nome, email, valor: valorNumerico, produtoId, produtoIndex, produtoNome, tipoContribuicao,
      externalReference: referencia, notificationUrl: `${PUBLIC_URL}/webhook`
    });

    const dadosPix = pagamento.point_of_interaction?.transaction_data || {};

    salvarOuAtualizarPagamento({
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor: Number(pagamento.transaction_amount) || valorNumerico,
      nome, email, produtoId, produtoIndex, produtoNome, produtoImagem: produtoImagem || "",
      tipoContribuicao, metodoPagamento: "pix",
      externalReference: pagamento.external_reference || referencia,
      criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString()
    });

    res.status(201).json({
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor: Number(pagamento.transaction_amount) || valorNumerico,
      qrCode: dadosPix.qr_code || "",
      qrCodeBase64: dadosPix.qr_code_base64 || "",
      ticketUrl: dadosPix.ticket_url || ""
    });
  } catch (erro) {
    console.error("Erro ao criar PIX:", erro);
    res.status(500).json({ erro: "Não foi possível gerar o PIX.", detalhe: erro?.detalhes?.message || erro?.message || "Erro interno." });
  }
});

app.post("/criar-cartao", async (req, res) => {
  try {
    const {
      nome, email, valor, produtoId, produtoIndex, produtoNome, produtoImagem, tipoContribuicao,
      token, installments, payment_method_id, issuer_id, payer
    } = req.body;

    const valorNumerico = Number(valor);
    const parcelas = Number(installments);

    if (!nome || !email || !produtoNome) return res.status(400).json({ erro: "Nome, e-mail e produto são obrigatórios." });
    if (!token || !payment_method_id || !parcelas) return res.status(400).json({ erro: "Os dados do cartão estão incompletos." });
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) return res.status(400).json({ erro: "O valor informado é inválido." });

    const referencia = `${produtoId ?? produtoIndex ?? "produto"}:${Date.now()}`;

    const pagamento = await criarPagamentoCartao({
      nome, email, valor: valorNumerico, produtoId, produtoIndex, produtoNome, tipoContribuicao,
      externalReference: referencia, notificationUrl: `${PUBLIC_URL}/webhook`,
      token, installments: parcelas, paymentMethodId: payment_method_id, issuerId: issuer_id, payer
    });

    salvarOuAtualizarPagamento({
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor: Number(pagamento.transaction_amount) || valorNumerico,
      nome, email, produtoId, produtoIndex, produtoNome, produtoImagem: produtoImagem || "",
      tipoContribuicao, metodoPagamento: "cartao",
      paymentMethodId: pagamento.payment_method_id || payment_method_id,
      installments: pagamento.installments || parcelas,
      externalReference: pagamento.external_reference || referencia,
      criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString()
    });

    res.status(201).json({
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor: Number(pagamento.transaction_amount) || valorNumerico
    });
  } catch (erro) {
    console.error("Erro ao criar pagamento com cartão:", erro);
    const status = erro?.status && Number(erro.status) >= 400 ? Number(erro.status) : 500;
    res.status(status).json({
      erro: "Não foi possível processar o cartão.",
      detalhe: erro?.detalhes?.message || erro?.message || "Erro interno.",
      causa: erro?.detalhes?.cause || []
    });
  }
});

app.get("/pagamentos/:id/status", async (req, res) => {
  try {
    const pagamento = await consultarPagamento(req.params.id);
    const anterior = localizarPagamento(req.params.id) || {};
    const registro = {
      ...anterior,
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor: Number(pagamento.transaction_amount) || Number(anterior.valor) || 0,
      atualizadoEm: new Date().toISOString()
    };
    salvarOuAtualizarPagamento(registro);
    res.json({
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor: registro.valor,
      aprovado: pagamento.status === "approved"
    });
  } catch (erro) {
    console.error("Erro ao consultar pagamento:", erro);
    res.status(500).json({ erro: "Não foi possível consultar o pagamento." });
  }
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  const pagamentoId = req.body?.data?.id || req.query?.["data.id"] || req.query?.id;
  if (!pagamentoId) return;

  try {
    const pagamento = await consultarPagamento(pagamentoId);
    const anterior = localizarPagamento(pagamentoId) || {};
    salvarOuAtualizarPagamento({
      ...anterior,
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor: Number(pagamento.transaction_amount) || Number(anterior.valor) || 0,
      atualizadoEm: new Date().toISOString()
    });
    console.log(`Webhook: pagamento ${pagamento.id} = ${pagamento.status}`);
  } catch (erro) {
    console.error("Erro no webhook:", erro);
  }
});

app.get("/pagamentos", (req, res) => res.json(listarPagamentos()));

async function iniciarServidor() {
  try {
    await iniciarBanco();

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (erro) {
    console.error("Erro ao iniciar o banco PostgreSQL:", erro);
    process.exit(1);
  }
}

iniciarServidor();
