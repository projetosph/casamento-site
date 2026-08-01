// ==================================================
// LISTA DE PRESENTES
// ==================================================

document.addEventListener("DOMContentLoaded", () => {
  carregarPresentes();
});

function carregarPresentes() {
  const container = document.getElementById("listaPresentes");

  if (!container) return;

  const produtos = getProdutos();

  if (produtos.length === 0) {
    container.innerHTML = `
      <p class="listaPresentesVazia">
        Nenhum presente foi cadastrado ainda.
      </p>
    `;
    return;
  }

  container.innerHTML = produtos
    .map((produto, index) => criarCardPresente(produto, index))
    .join("");
}

function criarCardPresente(produto, index) {
  const valor = Number(produto.valor ?? produto.valorTotal) || 0;
  const arrecadado = Number(produto.arrecadado) || 0;
  const restante = Math.max(valor - arrecadado, 0);
  const quitado = Boolean(produto.comprado) || (valor > 0 && restante <= 0);
  const imagem = converterUrlImagem(produto.imagem || produto.img || "");

  const imagemHtml = imagem
    ? `
      <img
        src="${imagem}"
        alt="${escaparHtml(produto.nome || "Presente")}"
        onerror="this.style.display='none'">
    `
    : `<div class="cardPresenteSemImagem">Sem imagem</div>`;

  let valorHtml = "";

  if (arrecadado > 0) {
    valorHtml = `
      <p class="valorAntigo">${formatarMoeda(valor)}</p>
      ${
        quitado
          ? `<p class="presenteado">PRESENTEADO</p>`
          : `<p class="valorAtual">${formatarMoeda(restante)}</p>`
      }
    `;
  } else {
    valorHtml = `<p class="valorAtual">${formatarMoeda(valor)}</p>`;
  }

  const linkLoja = produto.link
    ? `
      <a
        href="${produto.link}"
        target="_blank"
        rel="noopener noreferrer"
        class="btnVerProduto">
        Ver produto
      </a>
    `
    : "";

  return `
    <article class="cardPresente">
      ${imagemHtml}

      <h3>${escaparHtml(produto.nome || "Presente")}</h3>

      ${
        produto.descricao
          ? `<p class="descricaoPresente">${escaparHtml(produto.descricao)}</p>`
          : ""
      }

      ${valorHtml}
      ${linkLoja}

      <button
        type="button"
        onclick="abrirCheckout(${index})"
        ${quitado ? "disabled" : ""}>
        ${quitado ? "PRESENTEADO" : "PRESENTEAR"}
      </button>
    </article>
  `;
}

function abrirCheckout(index) {
  const produtos = getProdutos();
  const produto = produtos[index];

  if (!produto) {
    alert("Não foi possível localizar esse presente.");
    return;
  }

  const valor = Number(produto.valor ?? produto.valorTotal) || 0;
  const arrecadado = Number(produto.arrecadado) || 0;
  const restante = Math.max(valor - arrecadado, 0);

  if (restante <= 0) {
    alert("Esse presente já foi completado.");
    return;
  }

  const produtoCheckout = {
    ...produto,
    index,
    id: produto.id ?? index,
    valor,
    arrecadado,
    restante,
    imagem: converterUrlImagem(produto.imagem || produto.img || "")
  };

  localStorage.setItem(
    "produtoCheckout",
    JSON.stringify(produtoCheckout)
  );

  // Limpa escolhas antigas para não misturar compras.
  localStorage.removeItem("valorPagamento");
  localStorage.removeItem("tipoContribuicao");
  localStorage.removeItem("metodoPagamento");

  window.location.href = "pagamento.html";
}
