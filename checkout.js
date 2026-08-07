const API = "https://casamento-backend-f7e4.onrender.com";

let produtoCheckout = null;
let metodoSelecionado = "";
let intervaloStatus = null;
let cardPaymentBrickController = null;
let mercadoPago = null;
let bricksBuilder = null;

document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("nomeProdutoCheckout")) return;

  produtoCheckout = carregarProdutoCheckout();

  if (!produtoCheckout) {
    alert("Nenhum presente foi selecionado.");
    window.location.href = "presentes.html";
    return;
  }

  preencherResumoCheckout();
});

function carregarProdutoCheckout() {
  try { return JSON.parse(localStorage.getItem("produtoCheckout")); }
  catch (erro) { console.error("Erro ao carregar checkout:", erro); return null; }
}

function preencherResumoCheckout() {
  const valor = Number(produtoCheckout.valor) || 0;
  const arrecadado = Number(produtoCheckout.arrecadado) || 0;
  const restante = Math.max(valor - arrecadado, 0);

  const foto = document.getElementById("fotoProduto");
  const nome = document.getElementById("nomeProdutoCheckout");
  const valorOriginal = document.getElementById("valorOriginal");
  const valorRestante = document.getElementById("valorRestante");
  const valorCompleto = document.getElementById("valorCompletoTexto");

  if (foto) {
    foto.src = converterUrlImagem(produtoCheckout.imagem || "");
    foto.alt = produtoCheckout.nome || "Presente";
  }

  if (nome) nome.textContent = produtoCheckout.nome || "Presente";

  if (valorOriginal) {
    if (arrecadado > 0) {
      valorOriginal.style.display = "block";
      valorOriginal.textContent = formatarMoeda(valor);
    } else {
      valorOriginal.style.display = "none";
    }
  }

  if (valorRestante) valorRestante.textContent = formatarMoeda(restante);
  if (valorCompleto) valorCompleto.textContent = formatarMoeda(restante);
}

function abrirOpcao(id) {
  document.querySelectorAll(".checkoutConteudo").forEach((conteudo) => {
    conteudo.classList.toggle("ativo", conteudo.id === id);
  });

  metodoSelecionado = "";
  document.querySelectorAll(".opcao").forEach((opcao) => opcao.classList.remove("ativa"));
  desmontarBrickCartao();
  limparAreaPagamento();
}

function selecionar(elemento, metodo) {
  const conteudo = elemento.closest(".checkoutConteudo");
  if (!conteudo) return;

  conteudo.querySelectorAll(".opcao").forEach((opcao) => opcao.classList.remove("ativa"));
  elemento.classList.add("ativa");
  metodoSelecionado = metodo;
}

function montarCompra(tipo) {
  const nome = document.getElementById("nome")?.value.trim();
  const email = document.getElementById("email")?.value.trim();

  if (!nome) { alert("Digite seu nome."); return null; }
  if (!email) { alert("Digite seu e-mail."); return null; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert("Digite um e-mail válido."); return null; }

  const valorTotal = Number(produtoCheckout.valor) || 0;
  const arrecadado = Number(produtoCheckout.arrecadado) || 0;
  const restante = Math.max(valorTotal - arrecadado, 0);

  let valorPagamento = 0;

  if (tipo === "parcial") {
    valorPagamento = Number(document.getElementById("valorContribuicao")?.value);
    if (!Number.isFinite(valorPagamento) || valorPagamento <= 0) { alert("Informe um valor válido."); return null; }
    if (valorPagamento > restante) { alert(`O valor máximo é ${formatarMoeda(restante)}.`); return null; }
  } else if (tipo === "total") {
    valorPagamento = restante;
  } else {
    return null;
  }

  return {
    produtoId: produtoCheckout.id,
    produtoIndex: produtoCheckout.index,
    produtoNome: produtoCheckout.nome,
    produtoImagem: produtoCheckout.imagem,
    tipoContribuicao: tipo,
    valor: valorPagamento,
    nome,
    email
  };
}

async function continuarPagamento(tipo) {
  if (!produtoCheckout) return;
  if (!metodoSelecionado) { alert("Escolha PIX ou Cartão de Crédito."); return; }

  const compra = montarCompra(tipo);
  if (!compra) return;

  localStorage.setItem("compraAtual", JSON.stringify(compra));

  if (metodoSelecionado === "pix") {
    desmontarBrickCartao();
    await gerarPix(compra);
    return;
  }

  await abrirFormularioCartao(compra);
}

async function gerarPix(compra) {
  const area = document.getElementById("areaPagamento");
  if (!area) return;

  area.innerHTML = `<div class="resumoPagamentoPendente"><p>Gerando PIX...</p></div>`;

  try {
    const resposta = await fetch(`${API}/criar-pix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(compra)
    });

    const texto = await resposta.text();
    let dados;
    try { dados = JSON.parse(texto); } catch { throw new Error("O servidor respondeu em formato inválido."); }

    if (!resposta.ok) throw new Error(dados.detalhe || dados.erro || "Não foi possível gerar o PIX.");

    const qrCodeImagem = dados.qrCodeBase64 ? `data:image/png;base64,${dados.qrCodeBase64}` : "";

    area.innerHTML = `
      <div class="pixMercadoPago">
        <h3>Pagamento via PIX</h3>
        <p>Valor: <strong>${formatarMoeda(dados.valor)}</strong></p>
        ${qrCodeImagem ? `<img src="${qrCodeImagem}" alt="QR Code PIX">` : `<p>Use o código PIX abaixo.</p>`}
        <textarea id="codigoPixCopiaCola" readonly>${dados.qrCode || ""}</textarea>
        <button type="button" class="btnPix" onclick="copiarCodigoPix()">COPIAR CÓDIGO PIX</button>
        <p id="statusPagamentoPix">Aguardando confirmação do pagamento...</p>
      </div>
    `;

    iniciarConsultaStatus(dados.pagamentoId, compra);
  } catch (erro) {
    console.error(erro);
    area.innerHTML = `<div class="resumoPagamentoPendente"><p>${escaparHtml(erro.message)}</p></div>`;
  }
}

async function copiarCodigoPix() {
  const codigo = document.getElementById("codigoPixCopiaCola")?.value || "";
  if (!codigo) { alert("Código PIX indisponível."); return; }
  await copiarTexto(codigo);
}

async function obterMercadoPago() {
  if (mercadoPago && bricksBuilder) return { mercadoPago, bricksBuilder };

  const resposta = await fetch(`${API}/config/mercadopago`);
  const dados = await resposta.json();

  if (!resposta.ok || !dados.publicKey) throw new Error(dados.erro || "Public Key do Mercado Pago indisponível.");
  if (typeof MercadoPago === "undefined") throw new Error("SDK do Mercado Pago não carregou.");

  mercadoPago = new MercadoPago(dados.publicKey, { locale: "pt-BR" });
  bricksBuilder = mercadoPago.bricks();

  return { mercadoPago, bricksBuilder };
}

async function abrirFormularioCartao(compra) {
  const area = document.getElementById("areaPagamento");
  if (!area) return;

  desmontarBrickCartao();

  area.innerHTML = `
    <div class="cartaoMercadoPago">
      <h3>Pagamento com Cartão</h3>
      <p class="valorCartaoCheckout">Valor: <strong>${formatarMoeda(compra.valor)}</strong></p>
      <div id="cardPaymentBrick_container"></div>
      <p id="statusPagamentoCartao"></p>
    </div>
  `;

  try {
    const { bricksBuilder } = await obterMercadoPago();

    const settings = {
      initialization: { amount: Number(compra.valor) },
      style: { theme: "default" },
      callbacks: {
        onReady: () => console.log("Formulário de cartão pronto"),
        onSubmit: (formData) => processarCartao(formData, compra),
        onError: (erro) => {
          console.error("Erro no Card Payment Brick:", erro);
          const status = document.getElementById("statusPagamentoCartao");
          if (status) status.textContent = "Não foi possível carregar os dados do cartão.";
        }
      }
    };

    cardPaymentBrickController = await bricksBuilder.create(
      "cardPayment",
      "cardPaymentBrick_container",
      settings
    );
  } catch (erro) {
    console.error(erro);
    area.innerHTML = `<div class="resumoPagamentoPendente"><p>${escaparHtml(erro.message)}</p></div>`;
  }
}

async function processarCartao(formData, compra) {
  const status = document.getElementById("statusPagamentoCartao");
  if (status) status.textContent = "Processando pagamento...";

  try {
    const payload = {
      ...compra,
      token: formData.token,
      installments: formData.installments,
      payment_method_id: formData.payment_method_id,
      issuer_id: formData.issuer_id,
      payer: formData.payer
    };

    const resposta = await fetch(`${API}/criar-cartao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const texto = await resposta.text();
    let dados;
    try { dados = JSON.parse(texto); } catch { throw new Error("O servidor respondeu em formato inválido."); }

    if (!resposta.ok) throw new Error(dados.detalhe || dados.erro || "Não foi possível processar o cartão.");

    if (dados.status === "approved") {
      aplicarPagamentoAprovado(dados.pagamentoId, compra, Number(dados.valor) || Number(compra.valor));
      mostrarPopupPagamentoAprovado();
      return;
    }

    if (["pending", "in_process", "authorized"].includes(dados.status)) {
      if (status) status.textContent = "Pagamento em análise. Aguardando confirmação...";
      iniciarConsultaStatus(dados.pagamentoId, compra);
      return;
    }

    if (dados.status === "rejected") {
      if (status) status.textContent = traduzirStatusCartao(dados.statusDetail);
      return;
    }

    if (status) status.textContent = `Status do pagamento: ${dados.status}`;
  } catch (erro) {
    console.error("Erro ao processar cartão:", erro);
    if (status) status.textContent = erro.message;
    throw erro;
  }
}

function traduzirStatusCartao(statusDetail) {
  const mensagens = {
    cc_rejected_bad_filled_card_number: "Confira o número do cartão.",
    cc_rejected_bad_filled_date: "Confira a data de validade.",
    cc_rejected_bad_filled_security_code: "Confira o código de segurança.",
    cc_rejected_insufficient_amount: "Saldo ou limite insuficiente.",
    cc_rejected_call_for_authorize: "O banco pediu autorização. Entre em contato com o emissor.",
    cc_rejected_card_disabled: "O cartão está desativado. Entre em contato com o banco.",
    cc_rejected_duplicated_payment: "Esse pagamento já foi processado.",
    cc_rejected_high_risk: "O pagamento não foi autorizado.",
    cc_rejected_other_reason: "O cartão não autorizou o pagamento."
  };

  return mensagens[statusDetail] || "Pagamento não aprovado. Confira os dados ou tente outro cartão.";
}

function desmontarBrickCartao() {
  if (cardPaymentBrickController && typeof cardPaymentBrickController.unmount === "function") {
    try { cardPaymentBrickController.unmount(); } catch {}
  }
  cardPaymentBrickController = null;
}

function limparAreaPagamento() {
  const area = document.getElementById("areaPagamento");
  if (area) area.innerHTML = "";
}

function iniciarConsultaStatus(pagamentoId, compra) {
  if (intervaloStatus) clearInterval(intervaloStatus);
  consultarStatusPagamento(pagamentoId, compra);
  intervaloStatus = setInterval(() => consultarStatusPagamento(pagamentoId, compra), 5000);
}

async function consultarStatusPagamento(pagamentoId, compra) {
  try {
    const resposta = await fetch(`${API}/pagamentos/${pagamentoId}/status`);
    const dados = await resposta.json();

    if (!resposta.ok) return;

    const statusPix = document.getElementById("statusPagamentoPix");
    const statusCartao = document.getElementById("statusPagamentoCartao");

    if (dados.status === "approved") {
      if (intervaloStatus) { clearInterval(intervaloStatus); intervaloStatus = null; }

      aplicarPagamentoAprovado(
        pagamentoId,
        compra,
        Number(dados.valor) || Number(compra.valor)
      );

      mostrarPopupPagamentoAprovado();
      return;
    }

    if (["rejected", "cancelled"].includes(dados.status)) {
      if (intervaloStatus) { clearInterval(intervaloStatus); intervaloStatus = null; }
      if (statusPix) statusPix.textContent = "Pagamento não aprovado. Gere um novo PIX.";
      if (statusCartao) statusCartao.textContent = traduzirStatusCartao(dados.statusDetail);
      return;
    }

    if (statusPix) statusPix.textContent = "Aguardando confirmação do pagamento...";
    if (statusCartao) statusCartao.textContent = "Pagamento em análise. Aguardando confirmação...";
  } catch (erro) {
    console.error("Erro ao consultar pagamento:", erro);
  }
}

function aplicarPagamentoAprovado(pagamentoId, compra, valorPago) {
  const chave = `pagamento_aplicado_${pagamentoId}`;
  if (localStorage.getItem(chave) === "sim") return;

  const produtos = getProdutos();

  let index = produtos.findIndex((produto) => String(produto.id) === String(compra.produtoId));
  if (index < 0) index = Number(compra.produtoIndex);

  const produto = produtos[index];
  if (!produto) return console.error("O presente pago não foi localizado.");

  const valorTotal = Number(produto.valor ?? produto.valorTotal) || 0;

  produto.arrecadado = Math.min(
    (Number(produto.arrecadado) || 0) + Number(valorPago),
    valorTotal
  );

  produto.comprado = produto.arrecadado >= valorTotal;
  produtos[index] = produto;

  saveProdutos(produtos);
  localStorage.setItem(chave, "sim");
}

function mostrarPopupPagamentoAprovado() {
  const popup = document.getElementById("popupPagamentoAprovado");

  if (!popup) return console.error("ERRO: #popupPagamentoAprovado não existe no HTML");

  popup.style.setProperty("display", "flex", "important");

  setTimeout(() => {
    window.location.href = "index.html";
  }, 3000);
}
