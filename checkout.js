// ==================================================
// CHECKOUT PIX - MERCADO PAGO
// ==================================================

const API = "https://casamento-backend-f7e4.onrender.com";

let produtoCheckout = null;
let metodoSelecionado = "";
let intervaloStatus = null;

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
  try {
    return JSON.parse(localStorage.getItem("produtoCheckout"));
  } catch (erro) {
    console.error("Erro ao carregar checkout:", erro);
    return null;
  }
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

  if (valorRestante) {
    valorRestante.textContent = formatarMoeda(restante);
  }

  if (valorCompleto) {
    valorCompleto.textContent = formatarMoeda(restante);
  }
}

function abrirOpcao(id) {
  document.querySelectorAll(".checkoutConteudo").forEach((conteudo) => {
    conteudo.classList.toggle("ativo", conteudo.id === id);
  });

  metodoSelecionado = "";

  document.querySelectorAll(".opcao").forEach((opcao) => {
    opcao.classList.remove("ativa");
  });
}

function selecionar(elemento, metodo) {
  const conteudo = elemento.closest(".checkoutConteudo");

  if (!conteudo) return;

  conteudo.querySelectorAll(".opcao").forEach((opcao) => {
    opcao.classList.remove("ativa");
  });

  elemento.classList.add("ativa");
  metodoSelecionado = metodo;
}

async function continuarPagamento(tipo) {
  if (!produtoCheckout) return;

  const nome = document.getElementById("nome")?.value.trim();
  const email = document.getElementById("email")?.value.trim();

    if (!nome) {
    alert("Digite seu nome.");
    return;
  }

  if (!email) {
    alert("Digite seu e-mail.");
    return;
  }

  const emailValido =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailValido) {
    alert("Digite um e-mail válido.");
    return;
  }

  const valorTotal = Number(produtoCheckout.valor) || 0;
  const arrecadado = Number(produtoCheckout.arrecadado) || 0;
  const restante = Math.max(valorTotal - arrecadado, 0);

  let valorPagamento = 0;

  if (tipo === "parcial") {
    valorPagamento = Number(
      document.getElementById("valorContribuicao")?.value
    );

    if (!Number.isFinite(valorPagamento) || valorPagamento <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    if (valorPagamento > restante) {
      alert(`O valor máximo é ${formatarMoeda(restante)}.`);
      return;
    }
  } else if (tipo === "total") {
    valorPagamento = restante;
  } else {
    return;
  }

  if (!metodoSelecionado) {
    alert("Escolha PIX ou Cartão de Crédito.");
    return;
  }

  if (metodoSelecionado === "cartao") {
    alert("O cartão será conectado depois do PIX.");
    return;
  }

  const compra = {
    produtoId: produtoCheckout.id,
    produtoIndex: produtoCheckout.index,
    produtoNome: produtoCheckout.nome,
    produtoImagem: produtoCheckout.imagem,
    tipoContribuicao: tipo,
    valor: valorPagamento,
    nome,
    email
  };

  localStorage.setItem("compraAtual", JSON.stringify(compra));

  await gerarPix(compra);
}

async function gerarPix(compra) {
  const area = document.getElementById("areaPagamento");

  if (!area) return;

  area.innerHTML = `
    <div class="resumoPagamentoPendente">
      <p>Gerando PIX...</p>
    </div>
  `;

  try {
    const resposta = await fetch(`${API}/criar-pix`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(compra)
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        dados.detalhe || dados.erro || "Não foi possível gerar o PIX."
      );
    }

    localStorage.setItem(
      "pagamentoAtual",
      JSON.stringify({
        pagamentoId: dados.pagamentoId,
        produtoId: compra.produtoId,
        produtoIndex: compra.produtoIndex,
        valor: dados.valor
      })
    );

    const qrCodeImagem = dados.qrCodeBase64
      ? `data:image/png;base64,${dados.qrCodeBase64}`
      : "";

    area.innerHTML = `
      <div class="pixMercadoPago">
        <h3>Pagamento via PIX</h3>

        <p>
          Valor:
          <strong>${formatarMoeda(dados.valor)}</strong>
        </p>

        ${
          qrCodeImagem
            ? `<img src="${qrCodeImagem}" alt="QR Code PIX">`
            : `<p>Use o código PIX abaixo.</p>`
        }

        <textarea
          id="codigoPixCopiaCola"
          readonly>${dados.qrCode || ""}</textarea>

        <button
          type="button"
          class="btnPix"
          onclick="copiarCodigoPix()">
          COPIAR CÓDIGO PIX
        </button>

        <p id="statusPagamentoPix">
          Aguardando confirmação do pagamento...
        </p>
      </div>
    `;

    iniciarConsultaStatus(dados.pagamentoId, compra);
  } catch (erro) {
    console.error(erro);

    area.innerHTML = `
      <div class="resumoPagamentoPendente">
        <p>${escaparHtml(erro.message)}</p>
      </div>
    `;
  }
}

async function copiarCodigoPix() {
  const codigo =
    document.getElementById("codigoPixCopiaCola")?.value || "";

  if (!codigo) {
    alert("Código PIX indisponível.");
    return;
  }

  await copiarTexto(codigo);
}

function iniciarConsultaStatus(pagamentoId, compra) {
  if (intervaloStatus) {
    clearInterval(intervaloStatus);
  }

  consultarStatusPagamento(pagamentoId, compra);

  intervaloStatus = setInterval(() => {
    consultarStatusPagamento(pagamentoId, compra);
  }, 5000);
}

async function consultarStatusPagamento(pagamentoId, compra) {

  try {

    const resposta = await fetch(
      `${API}/pagamentos/${pagamentoId}/status`
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      console.error("Erro ao consultar pagamento:", dados);
      return;
    }

    const status = document.getElementById("statusPagamentoPix");

    if (dados.status === "approved") {

      console.log("PAGAMENTO APROVADO DETECTADO");

      if (intervaloStatus) {

        clearInterval(intervaloStatus);

        intervaloStatus = null;

      }

      aplicarPagamentoAprovado(
        pagamentoId,
        compra,
        Number(dados.valor) || Number(compra.valor)
      );

      mostrarPopupPagamentoAprovado();

      return;

    }

    if (
      dados.status === "rejected" ||
      dados.status === "cancelled"
    ) {

      if (intervaloStatus) {
        clearInterval(intervaloStatus);
        intervaloStatus = null;
      }

      if (status) {
        status.textContent =
          "Pagamento não aprovado. Gere um novo PIX.";
      }

      return;
    }

    if (status) {
      status.textContent =
        "Aguardando confirmação do pagamento...";
    }

  } catch (erro) {

    console.error(
      "Erro ao consultar pagamento:",
      erro
    );

  }

}

function aplicarPagamentoAprovado(pagamentoId, compra, valorPago) {
  const chave = `pagamento_aplicado_${pagamentoId}`;

  if (localStorage.getItem(chave) === "sim") return;

  const produtos = getProdutos();

  let index = produtos.findIndex(
    (produto) =>
      String(produto.id) === String(compra.produtoId)
  );

  if (index < 0) {
    index = Number(compra.produtoIndex);
  }

  const produto = produtos[index];

  if (!produto) {
    console.error("O presente pago não foi localizado.");
    return;
  }

  const valorTotal =
    Number(produto.valor ?? produto.valorTotal) || 0;

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

  console.log("Abrindo popup de pagamento aprovado");

  const popup =
    document.getElementById("popupPagamentoAprovado");

  if (!popup) {

    console.error(
      "ERRO: #popupPagamentoAprovado não existe no pagamento.html"
    );

    return;
  }

  // Força o popup a aparecer,
  // independentemente de outras regras do CSS
  popup.style.setProperty("display", "flex", "important");
  popup.style.position = "fixed";
  popup.style.inset = "0";
  popup.style.width = "100%";
  popup.style.height = "100%";
  popup.style.background = "rgba(0, 0, 0, 0.65)";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
  popup.style.zIndex = "999999";

  setTimeout(() => {

    console.log("Redirecionando para a Home");

    // Funciona tanto no Live Server
    // quanto abrindo o HTML diretamente
    window.location.href = "index.html";

  }, 3000);

}