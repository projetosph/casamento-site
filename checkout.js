// ==================================================
// CHECKOUT
// ==================================================

let produtoCheckout = null;
let metodoSelecionado = "";

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
  const valorLivre = Boolean(produtoCheckout.valorLivre);
  const valor = Number(produtoCheckout.valor) || 0;
  const arrecadado = Number(produtoCheckout.arrecadado) || 0;
  const restante = valorLivre ? 0 : Math.max(valor - arrecadado, 0);

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
    if (valorLivre) {
      valorOriginal.style.display = "none";
    } else if (arrecadado > 0) {
      valorOriginal.style.display = "block";
      valorOriginal.textContent = formatarMoeda(valor);
    } else {
      valorOriginal.style.display = "none";
    }
  }

  if (valorRestante) {
    valorRestante.textContent = valorLivre
      ? "Você escolhe o valor"
      : formatarMoeda(restante);
  }

  if (valorCompleto) {
    valorCompleto.textContent = valorLivre
      ? "Defina o valor"
      : formatarMoeda(restante);
  }
}

function abrirOpcao(id) {
  document.querySelectorAll(".checkoutConteudo").forEach((conteudo) => {
    conteudo.classList.toggle("ativo", conteudo.id === id);
  });

  // Ao trocar entre parte e total, limpa a forma de pagamento anterior.
  metodoSelecionado = "";
  localStorage.removeItem("metodoPagamento");

  document.querySelectorAll(".opcao").forEach((opcao) => {
    opcao.classList.remove("ativa");
  });
}

function selecionar(elemento, metodo) {
  const conteudoAtual = elemento.closest(".checkoutConteudo");

  if (!conteudoAtual) return;

  conteudoAtual.querySelectorAll(".opcao").forEach((opcao) => {
    opcao.classList.remove("ativa");
  });

  elemento.classList.add("ativa");
  metodoSelecionado = metodo;
  localStorage.setItem("metodoPagamento", metodo);
}

function continuarPagamento(tipo) {
  if (!produtoCheckout) return;

  const valorLivre = Boolean(produtoCheckout.valorLivre);
  const valorTotal = Number(produtoCheckout.valor) || 0;
  const arrecadado = Number(produtoCheckout.arrecadado) || 0;
  const restante = valorLivre ? 0 : Math.max(valorTotal - arrecadado, 0);

  let valorPagamento = 0;

  if (valorLivre || tipo === "parcial") {
    const campo = document.getElementById("valorContribuicao");
    valorPagamento = Number(campo?.value);

    if (!Number.isFinite(valorPagamento) || valorPagamento <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    if (!valorLivre && valorPagamento > restante) {
      alert(`O valor máximo para este presente é ${formatarMoeda(restante)}.`);
      return;
    }
  } else if (tipo === "total") {
    valorPagamento = restante;
  } else {
    alert("Escolha Parte do Valor ou Valor Completo.");
    return;
  }

  if (!metodoSelecionado) {
    alert("Escolha PIX ou Cartão de Crédito.");
    return;
  }

  const compraAtual = {
    produtoId: produtoCheckout.id,
    produtoIndex: produtoCheckout.index,
    produtoNome: produtoCheckout.nome,
    produtoImagem: produtoCheckout.imagem,
    tipoContribuicao: valorLivre ? "livre" : tipo,
    metodoPagamento: metodoSelecionado,
    valor: valorPagamento,
    criadoEm: new Date().toISOString()
  };

  localStorage.setItem("compraAtual", JSON.stringify(compraAtual));
  localStorage.setItem("tipoContribuicao", tipo);
  localStorage.setItem("valorPagamento", String(valorPagamento));

  gerarPagamento(compraAtual);
}

function gerarPagamento(compra) {
  // Nesta etapa apenas deixa todos os dados certos e ligados ao produto.
  // O próximo passo será substituir este bloco pela chamada ao Mercado Pago.
  const area = document.getElementById("areaPagamento");

  if (area) {
    area.innerHTML = `
      <div class="resumoPagamentoPendente">
        <h3>Pagamento preparado</h3>
        <p><strong>Presente:</strong> ${escaparHtml(compra.produtoNome)}</p>
        <p><strong>Valor:</strong> ${formatarMoeda(compra.valor)}</p>
        <p><strong>Forma:</strong> ${
          compra.metodoPagamento === "pix" ? "PIX" : "Cartão de Crédito"
        }</p>
        <p>A integração com o Mercado Pago será conectada nesta etapa.</p>
      </div>
    `;
  }

  console.log("Compra preparada para o Mercado Pago:", compra);
}
