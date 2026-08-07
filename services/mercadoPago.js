const crypto = require("crypto");

const API_URL = "https://api.mercadopago.com";
const ACCESS_TOKEN = process.env.MERCADO_PAGO_TOKEN;

function validarToken() {
  if (!ACCESS_TOKEN) throw new Error("A variável MERCADO_PAGO_TOKEN não está configurada.");
}

async function chamarMercadoPago(caminho, opcoes = {}) {
  validarToken();

  const resposta = await fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(opcoes.headers || {})
    }
  });

  const texto = await resposta.text();
  let dados = {};
  try { dados = texto ? JSON.parse(texto) : {}; } catch { dados = { message: texto }; }

  if (!resposta.ok) {
    const erro = new Error(dados.message || `Mercado Pago respondeu com status ${resposta.status}.`);
    erro.status = resposta.status;
    erro.detalhes = dados;
    throw erro;
  }

  return dados;
}

async function criarPix({ nome, email, valor, produtoId, produtoIndex, produtoNome, tipoContribuicao, externalReference, notificationUrl }) {
  const partesNome = String(nome).trim().split(/\s+/);
  const primeiroNome = partesNome.shift() || "Convidado";
  const sobrenome = partesNome.join(" ") || "Convidado";

  const corpo = {
    transaction_amount: Number(valor),
    description: `Presente: ${produtoNome}`,
    payment_method_id: "pix",
    external_reference: String(externalReference),
    notification_url: notificationUrl,
    payer: { email: String(email).trim(), first_name: primeiroNome, last_name: sobrenome },
    metadata: {
      produto_id: String(produtoId ?? ""),
      produto_index: Number(produtoIndex ?? -1),
      produto_nome: String(produtoNome),
      tipo_contribuicao: String(tipoContribuicao || "")
    }
  };

  return chamarMercadoPago("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(corpo)
  });
}

async function criarPagamentoCartao({
  nome, email, valor, produtoId, produtoIndex, produtoNome, tipoContribuicao,
  externalReference, notificationUrl, token, installments, paymentMethodId, issuerId, payer
}) {
  const partesNome = String(nome).trim().split(/\s+/);
  const primeiroNome = partesNome.shift() || "Convidado";
  const sobrenome = partesNome.join(" ") || "Convidado";

  const corpo = {
    transaction_amount: Number(valor),
    token: String(token),
    description: `Presente: ${produtoNome}`,
    installments: Number(installments),
    payment_method_id: String(paymentMethodId),
    external_reference: String(externalReference),
    notification_url: notificationUrl,
    payer: {
      email: String(email).trim(),
      first_name: primeiroNome,
      last_name: sobrenome
    },
    metadata: {
      produto_id: String(produtoId ?? ""),
      produto_index: Number(produtoIndex ?? -1),
      produto_nome: String(produtoNome),
      tipo_contribuicao: String(tipoContribuicao || "")
    }
  };

  if (issuerId) corpo.issuer_id = Number(issuerId);

  if (payer?.identification?.type && payer?.identification?.number) {
    corpo.payer.identification = {
      type: String(payer.identification.type),
      number: String(payer.identification.number)
    };
  }

  return chamarMercadoPago("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(corpo)
  });
}

async function consultarPagamento(pagamentoId) {
  return chamarMercadoPago(`/v1/payments/${encodeURIComponent(pagamentoId)}`, { method: "GET" });
}

module.exports = { criarPix, criarPagamentoCartao, consultarPagamento };
