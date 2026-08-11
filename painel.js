// ==================================================
// PAINEL DOS NOIVOS
// ==================================================

document.addEventListener("DOMContentLoaded", () => {
  migrarProdutosAntigos();
  carregarProdutosAdmin();
  carregarPresencasAdmin();
  carregarRecadosAdmin();
  previewImagemProduto();
});

// ==================================================
// PRODUTOS
// ==================================================

function salvarProduto() {
  const nome = document.getElementById("nomeProduto").value.trim();
  const descricao = document.getElementById("descricaoProduto").value.trim();
  const categoria = document.getElementById("categoriaProduto").value;
  const valor = Number(document.getElementById("valorProduto").value);
  const imagemDigitada = document.getElementById("imagemProduto").value.trim();
  const link = document.getElementById("linkProduto").value.trim();
  const editIndex = document.getElementById("editIndex").value;

  if (!nome || !Number.isFinite(valor) || valor <= 0) {
    alert("Preencha o nome e um valor válido.");
    return;
  }

  const produtos = getProdutos();
  const imagem = converterUrlImagem(imagemDigitada);

  const anterior =
    editIndex !== "" && produtos[Number(editIndex)]
      ? produtos[Number(editIndex)]
      : null;

  const produto = {
    id: anterior?.id ?? Date.now(),
    nome,
    descricao,
    categoria,
    imagem,
    link,
    valor,
    arrecadado: Number(anterior?.arrecadado) || 0,
    comprado: Boolean(anterior?.comprado),
    historico: Array.isArray(anterior?.historico) ? anterior.historico : [],
    criadoEm: anterior?.criadoEm ?? new Date().toISOString()
  };

  if (editIndex !== "") {
    produtos[Number(editIndex)] = produto;
  } else {
    produtos.push(produto);
  }

  saveProdutos(produtos);
  limparFormulario();
  carregarProdutosAdmin();

  if (typeof atualizarDashboard === "function") {
    atualizarDashboard();
  }

  alert(editIndex !== "" ? "Presente atualizado!" : "Presente cadastrado!");
}

function editarProduto(index) {
  const produtos = getProdutos();
  const produto = produtos[index];

  if (!produto) return;

  document.getElementById("nomeProduto").value = produto.nome || "";
  document.getElementById("descricaoProduto").value = produto.descricao || "";
  document.getElementById("categoriaProduto").value = produto.categoria || "";
  document.getElementById("valorProduto").value = produto.valor || "";
  document.getElementById("imagemProduto").value = produto.imagem || "";
  document.getElementById("linkProduto").value = produto.link || "";
  document.getElementById("editIndex").value = index;

  previewImagemProduto();

  const formulario = document.getElementById("nomeProduto");
  formulario?.scrollIntoView({ behavior: "smooth", block: "center" });
  formulario?.focus();
}

function excluirProduto(index) {
  if (!confirm("Deseja excluir este produto?")) return;

  const produtos = getProdutos();

  if (!produtos[index]) return;

  produtos.splice(index, 1);
  saveProdutos(produtos);
  carregarProdutosAdmin();

  if (typeof atualizarDashboard === "function") {
    atualizarDashboard();
  }
}

function carregarProdutosAdmin() {
  const lista = getProdutos();
  const container = document.getElementById("listaProdutos");

  if (!container) return;

  if (lista.length === 0) {
    container.innerHTML = `
      <h3 class="tituloListaAdmin">Presentes cadastrados</h3>
      <p class="listaVazia">Nenhum presente cadastrado.</p>
    `;
    return;
  }

  container.innerHTML = `
    <h3 class="tituloListaAdmin">Presentes cadastrados</h3>
    <div class="gridProdutosAdmin">
      ${lista.map((produto, index) => criarCardProdutoAdmin(produto, index)).join("")}
    </div>
  `;
}

function criarCardProdutoAdmin(produto, index) {
  const imagem = produto.imagem
    ? `<img src="${produto.imagem}" class="produtoAdminFoto"
            alt="${escaparHtml(produto.nome)}"
            onerror="this.style.display='none'">`
    : `<div class="produtoAdminSemFoto">Sem imagem</div>`;

  const linkLoja = produto.link
    ? `<a href="${produto.link}" target="_blank" rel="noopener noreferrer"
          class="btnVerProduto">Ver produto</a>`
    : "";

  return `
    <article class="produtoAdmin">
      ${imagem}

      <div class="produtoAdminInfo">
        <h3>${escaparHtml(produto.nome || "Sem nome")}</h3>

        ${produto.descricao
          ? `<p>${escaparHtml(produto.descricao)}</p>`
          : ""}

        ${produto.categoria
          ? `<small>${escaparHtml(produto.categoria)}</small>`
          : ""}

        ${mostrarPreco(produto)}
        ${linkLoja}
      </div>

      <div class="acoesProduto">
        <button type="button" onclick="editarProduto(${index})">Editar</button>
        <button type="button" onclick="excluirProduto(${index})">Excluir</button>
      </div>
    </article>
  `;
}

function mostrarPreco(produto) {
  const valor = Number(produto.valor) || 0;
  const arrecadado = Number(produto.arrecadado) || 0;
  const restante = Math.max(valor - arrecadado, 0);

  if (arrecadado <= 0) {
    return `<p class="valorAtual">${formatarMoeda(valor)}</p>`;
  }

  if (restante <= 0) {
    return `
      <p class="valorAntigo">${formatarMoeda(valor)}</p>
      <p class="presenteado">PRESENTEADO</p>
    `;
  }

  return `
    <p class="valorAntigo">${formatarMoeda(valor)}</p>
    <p class="valorAtual">${formatarMoeda(restante)}</p>
  `;
}

function limparFormulario() {
  document.getElementById("nomeProduto").value = "";
  document.getElementById("descricaoProduto").value = "";
  document.getElementById("categoriaProduto").value = "";
  document.getElementById("valorProduto").value = "";
  document.getElementById("imagemProduto").value = "";
  document.getElementById("linkProduto").value = "";
  document.getElementById("editIndex").value = "";

  previewImagemProduto();
}

function previewImagemProduto() {
  const input = document.getElementById("imagemProduto");
  const preview = document.getElementById("previewImagemProduto");
  const texto = document.getElementById("previewImagemTexto");

  if (!input || !preview || !texto) return;

  const url = converterUrlImagem(input.value.trim());

  if (!url) {
    preview.removeAttribute("src");
    preview.style.display = "none";
    texto.style.display = "block";
    texto.textContent = "A prévia da imagem aparecerá aqui.";
    return;
  }

  texto.style.display = "none";
  preview.style.display = "block";
  preview.src = url;

  preview.onerror = () => {
    preview.style.display = "none";
    texto.style.display = "block";
    texto.textContent = "Não foi possível carregar essa URL como imagem.";
  };

  preview.onload = () => {
    preview.style.display = "block";
    texto.style.display = "none";
  };
}

function converterUrlImagem(url) {
  if (!url) return "";

  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);

  if (drive?.[1]) {
    return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w1200`;
  }

  const driveOpen = url.match(/[?&]id=([^&]+)/);

  if (url.includes("drive.google.com") && driveOpen?.[1]) {
    return `https://drive.google.com/thumbnail?id=${driveOpen[1]}&sz=w1200`;
  }

  return url;
}

function migrarProdutosAntigos() {
  const produtos = getProdutos();
  let alterou = false;

  const migrados = produtos.map((produto) => {
    const valor =
      Number(produto.valor ?? produto.valorTotal) || 0;

    const arrecadado =
      Number(produto.arrecadado) ||
      (
        Number(produto.cotasCompradas) > 0 &&
        Number(produto.valorCota) > 0
          ? Number(produto.cotasCompradas) * Number(produto.valorCota)
          : 0
      );

    const normalizado = {
      id: produto.id ?? Date.now() + Math.floor(Math.random() * 1000),
      nome: produto.nome || "Presente",
      descricao: produto.descricao || "",
      categoria: produto.categoria || "",
      imagem: converterUrlImagem(produto.imagem || produto.img || ""),
      link: produto.link || "",
      valor,
      arrecadado: Math.min(arrecadado, valor || arrecadado),
      comprado: Boolean(produto.comprado) || (valor > 0 && arrecadado >= valor),
      historico: Array.isArray(produto.historico) ? produto.historico : [],
      criadoEm: produto.criadoEm || new Date().toISOString()
    };

    if (JSON.stringify(normalizado) !== JSON.stringify(produto)) {
      alterou = true;
    }

    return normalizado;
  });

  if (alterou) {
    saveProdutos(migrados);
  }
}

// ==================================================
// PRESENÇAS
// ==================================================

function carregarPresencasAdmin() {
  const lista = JSON.parse(localStorage.getItem("presencas")) || [];
  const container = document.getElementById("presencas");

  if (!container) return;

  const total = lista.reduce(
    (soma, pessoa) => soma + (Number(pessoa.quantidade) || 0),
    0
  );

  container.innerHTML = `
    <h3 class="tituloListaAdmin">
      Lista de Presença (${total} confirmados)
    </h3>

    ${
      lista.length === 0
        ? `<p class="listaVazia">Nenhuma presença confirmada.</p>`
        : lista.map((pessoa, index) => {

            const nomes =
              Array.isArray(pessoa.nomes) && pessoa.nomes.length
                ? pessoa.nomes
                : [pessoa.nome || "Convidado"];

            const titular = nomes[0] || pessoa.nome || "Convidado";
            const acompanhantes = nomes.slice(1);

            return `
              <div class="itemAdminLinha grupoPresenca">

                <div class="grupoPresencaInfo">

                  <div class="grupoPresencaTitular">
                    <strong>${escaparHtml(titular)}</strong>
                    <span>
                      ${Number(pessoa.quantidade) || nomes.length} pessoa(s)
                    </span>
                  </div>

                  ${
                    acompanhantes.length > 0
                      ? `
                        <div class="grupoPresencaAcompanhantes">

                          <small>Convidados junto com ${escaparHtml(titular)}:</small>

                          <ul>
                            ${acompanhantes
                              .map(nome => `
                                <li>${escaparHtml(nome)}</li>
                              `)
                              .join("")}
                          </ul>

                        </div>
                      `
                      : `
                        <div class="grupoPresencaAcompanhantes">
                          <small>Sem acompanhantes.</small>
                        </div>
                      `
                  }

                  ${
                    pessoa.mensagem
                      ? `
                        <p class="grupoPresencaMensagem">
                          ${escaparHtml(pessoa.mensagem)}
                        </p>
                      `
                      : ""
                  }

                </div>

                <button
                  type="button"
                  onclick="excluirPresenca(${index})">
                  Excluir
                </button>

              </div>
            `;
          }).join("")
    }
  `;
}

function excluirPresenca(index) {
  const lista = JSON.parse(localStorage.getItem("presencas")) || [];

  if (!lista[index]) return;
  if (!confirm("Deseja excluir esta confirmação?")) return;

  lista.splice(index, 1);
  localStorage.setItem("presencas", JSON.stringify(lista));

  carregarPresencasAdmin();

  if (typeof atualizarDashboard === "function") {
    atualizarDashboard();
  }
}

// ==================================================
// RECADOS
// ==================================================

function carregarRecadosAdmin() {
  const lista = JSON.parse(localStorage.getItem("recados")) || [];
  const container = document.getElementById("recados");

  if (!container) return;

  const invertida = lista.slice().reverse();

  container.innerHTML = `
    <h3 class="tituloListaAdmin">Recados (${lista.length})</h3>
    ${
      invertida.length === 0
        ? `<p class="listaVazia">Nenhum recado recebido.</p>`
        : invertida.map((recado, indexInvertido) => `
            <div class="recadoAdmin">
              <div>
                <strong>${escaparHtml(recado.nome || "Convidado")}</strong>
                <p>${escaparHtml(recado.mensagem || recado.msg || "")}</p>
              </div>

              <button type="button"
                      onclick="excluirRecadoAdmin(${indexInvertido})">
                Excluir
              </button>
            </div>
          `).join("")
    }
  `;
}

function excluirRecadoAdmin(indexInvertido) {
  const lista = JSON.parse(localStorage.getItem("recados")) || [];
  const indexOriginal = lista.length - 1 - indexInvertido;

  if (!lista[indexOriginal]) return;
  if (!confirm("Deseja excluir este recado?")) return;

  lista.splice(indexOriginal, 1);
  localStorage.setItem("recados", JSON.stringify(lista));

  carregarRecadosAdmin();

  if (typeof atualizarDashboard === "function") {
    atualizarDashboard();
  }
}

// ==================================================
// AUXILIARES
// ==================================================

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
