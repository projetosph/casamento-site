const express = require("express");
const cors = require("cors");

const {
  criarPix,
  consultarPagamento
} = require("./services/mercadoPago");

const {
  salvarOuAtualizarPagamento,
  localizarPagamento,
  listarPagamentos
} = require("./database/database");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const PUBLIC_URL =
  process.env.PUBLIC_URL ||
  "https://casamento-backend-f7e4.onrender.com";

// Teste do servidor
app.get("/", (req, res) => {
  res.json({
    ok: true,
    servico: "casamento-backend",
    mensagem: "Backend funcionando"
  });
});

// Criar pagamento PIX
app.post("/criar-pix", async (req, res) => {
  try {
    const {
      nome,
      email,
      valor,
      produtoId,
      produtoIndex,
      produtoNome,
      produtoImagem,
      tipoContribuicao
    } = req.body;

    const valorNumerico = Number(valor);

    if (!nome || !email || !produtoNome) {
      return res.status(400).json({
        erro: "Nome, e-mail e produto são obrigatórios."
      });
    }

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      return res.status(400).json({
        erro: "O valor informado é inválido."
      });
    }

    const referencia = `${produtoId ?? produtoIndex ?? "produto"}:${Date.now()}`;

    const pagamento = await criarPix({
      nome,
      email,
      valor: valorNumerico,
      produtoId,
      produtoIndex,
      produtoNome,
      tipoContribuicao,
      externalReference: referencia,
      notificationUrl: `${PUBLIC_URL}/webhook`
    });

    const dadosPix =
      pagamento.point_of_interaction?.transaction_data || {};

    const registro = {
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor: Number(pagamento.transaction_amount) || valorNumerico,
      nome,
      email,
      produtoId,
      produtoIndex,
      produtoNome,
      produtoImagem: produtoImagem || "",
      tipoContribuicao,
      externalReference:
        pagamento.external_reference || referencia,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    salvarOuAtualizarPagamento(registro);

    return res.status(201).json({
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor: registro.valor,
      qrCode: dadosPix.qr_code || "",
      qrCodeBase64: dadosPix.qr_code_base64 || "",
      ticketUrl: dadosPix.ticket_url || ""
    });
  } catch (erro) {
    console.error("Erro ao criar PIX:", erro);

    return res.status(500).json({
      erro: "Não foi possível gerar o PIX.",
      detalhe:
        erro?.detalhes?.message ||
        erro?.message ||
        "Erro interno."
    });
  }
});

// Consultar o pagamento.
// O checkout chama esta rota de 5 em 5 segundos.
app.get("/pagamentos/:id/status", async (req, res) => {
  try {
    const pagamento = await consultarPagamento(req.params.id);
    const anterior = localizarPagamento(req.params.id) || {};

    const registro = {
      ...anterior,
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor:
        Number(pagamento.transaction_amount) ||
        Number(anterior.valor) ||
        0,
      atualizadoEm: new Date().toISOString()
    };

    salvarOuAtualizarPagamento(registro);

    return res.json({
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor: registro.valor,
      aprovado: pagamento.status === "approved"
    });
  } catch (erro) {
    console.error("Erro ao consultar pagamento:", erro);

    return res.status(500).json({
      erro: "Não foi possível consultar o pagamento."
    });
  }
});

// Webhook do Mercado Pago.
// O status também é validado diretamente na API do Mercado Pago.
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  const pagamentoId =
    req.body?.data?.id ||
    req.query?.["data.id"] ||
    req.query?.id;

  if (!pagamentoId) return;

  try {
    const pagamento = await consultarPagamento(pagamentoId);
    const anterior = localizarPagamento(pagamentoId) || {};

    salvarOuAtualizarPagamento({
      ...anterior,
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor:
        Number(pagamento.transaction_amount) ||
        Number(anterior.valor) ||
        0,
      atualizadoEm: new Date().toISOString()
    });

    console.log(
      `Webhook: pagamento ${pagamento.id} = ${pagamento.status}`
    );
  } catch (erro) {
    console.error("Erro no webhook:", erro);
  }
});

// Diagnóstico
app.get("/pagamentos", (req, res) => {
  res.json(listarPagamentos());
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
