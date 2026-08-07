const express = require("express");
const cors = require("cors");
const { criarPix, criarPagamentoCartao, consultarPagamento } = require("./services/mercadoPago");
const { salvarOuAtualizarPagamento, localizarPagamento, listarPagamentos } = require("./database/database");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || "https://casamento-backend-f7e4.onrender.com";

app.get("/", (req, res) => {
  res.json({ ok: true, servico: "casamento-backend", mensagem: "Backend funcionando" });
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

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
