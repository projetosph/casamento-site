// ==================================================
// PAINEL DOS NOIVOS - PRESENTES NO POSTGRESQL
// ==================================================

const API_PAINEL = "https://casamento-backend-f7e4.onrender.com";
let produtosAdmin = [];

document.addEventListener("DOMContentLoaded", async () => {
  await migrarProdutosLocaisParaBanco();
  await carregarProdutosAdmin();

  carregarPresencasAdmin();
  carregarRecadosAdmin();
  previewImagemProduto();
});

// ==================================================
// PRODUTOS
// ==================================================

async function salvarProduto() {
  const nome =
    document.getElementById("nomeProduto").value.trim();

  const descricao =
    document.getElementById("descricaoProduto").value.trim();

  const categoria =
    document.getElementById("categoriaProduto").value;

  const valor =
    Number(document.getElementById("valorProduto").value);

  const imagemDigitada =
    document.getElementById("imagemProduto").value.trim();

  const link =
    document.getElementById("linkProduto").value.trim();

  const editIndex =
    document.getElementById("editIndex").value;

  if (!nome || !Number.isFinite(valor) || valor <= 0) {
    alert("Preencha o nome e um valor válido.");
    return;
  }

  const imagem = converterUrlImagem(imagemDigitada);
  const editando = editIndex !== "";
  const anterior = editando
    ? produtosAdmin[Number(editIndex)]
    : null;

  const produto = {
    nome,
    descricao,
    categoria,
    imagem,
    link,
    valor
  };

  try {
    const url = editando
      ? `${API_PAINEL}/presentes/${anterior.id}`
      : `${API_PAINEL}/presentes`;

    const resposta = await fetch(url, {
      method: editando ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(produto)
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        dados.erro || "Não foi possível salvar o presente."
      );
    }

    limparFormulario();
    await carregarProdutosAdmin();

    if (typeof atualizarDashboard === "function") {
      atualizarDashboard();
    }

    alert(
      editando
        ? "Presente atualizado!"
        : "Presente cadastrado!"
    );
  } catch (erro) {
    console.error("Erro ao salvar presente:", erro);
    alert(erro.message);
  }
}

function editarProduto(index) {
  const produto = produtosAdmin[index];
  if (!produto) return;

  document.getElementById("nomeProduto").value =
    produto.nome || "";

  document.getElementById("descricaoProduto").value =
    produto.descricao || "";

  document.getElementById("categoriaProduto").value =
    produto.categoria || "";

  document.getElementById("valorProduto").value =
    produto.valor || "";

  document.getElementById("imagemProduto").value =
    produto.imagem || "";

  document.getElementById("linkProduto").value =
    produto.link || "";

  document.getElementById("editIndex").value = index;

  previewImagemProduto();

  const formulario =
    document.getElementById("nomeProduto");

  formulario?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  formulario?.focus();
}

async function excluirProduto(index) {
  const produto = produtosAdmin[index];

  if (!produto) return;
  if (!confirm("Deseja excluir este produto?")) return;

  try {
    const resposta = await fetch(
      `${API_PAINEL}/presentes/${produto.id}`,
      { method: "DELETE" }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        dados.erro || "Não foi possível excluir o presente."
      );
    }

    await carregarProdutosAdmin();

    if (typeof atualizarDashboard === "function") {
      atualizarDashboard();
    }
  } catch (erro) {
    console.error("Erro ao excluir presente:", erro);
    alert(erro.message);
  }
}

async function carregarProdutosAdmin() {
  const container =
    document.getElementById("listaProdutos");

  if (!container) return;

  container.innerHTML = `
    <h3 class="tituloListaAdmin">Presentes cadastrados</h3>
    <p class="listaVazia">Carregando...</p>
  `;

  try {
    const resposta =
      await fetch(`${API_PAINEL}/presentes`);

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        dados.erro || "Não foi possível carregar os presentes."
      );
    }

    produtosAdmin = Array.isArray(dados) ? dados : [];

    if (produtosAdmin.length === 0) {
      container.innerHTML = `
        <h3 class="tituloListaAdmin">Presentes cadastrados</h3>
        <p class="listaVazia">Nenhum presente cadastrado.</p>
      `;
      return;
    }

    container.innerHTML = `
      <h3 class="tituloListaAdmin">Presentes cadastrados</h3>
      <div class="gridProdutosAdmin">
        ${produtosAdmin
          .map(
            (produto, index) =>
              criarCardProdutoAdmin(produto, index)
          )
          .join("")}
      </div>
    `;
  } catch (erro) {
    console.error("Erro ao carregar presentes:", erro);

    container.innerHTML = `
      <h3 class="tituloListaAdmin">Presentes cadastrados</h3>
      <p class="listaVazia">
        Não foi possível carregar os presentes.
      </p>
    `;
  }
}

function criarCardProdutoAdmin(produto, index) {
  const imagem = produto.imagem
    ? `<img src="${produto.imagem}" class="produtoAdminFoto"
             alt="${escaparHtml(produto.nome)}"
             onerror="this.style.display='none'">`
    : `<div class="produtoAdminSemFoto">Sem imagem</div>`;

  const linkLoja = produto.link
    ? `<a href="${produto.link}" target="_blank"
          rel="noopener noreferrer"
          class="btnVerProduto">Ver produto</a>`
    : "";

  return `
    <article class="produtoAdmin">
      ${imagem}

      <div class="produtoAdminInfo">
        <h3>${escaparHtml(produto.nome || "Sem nome")}</h3>

        ${
          produto.descricao
            ? `<p>${escaparHtml(produto.descricao)}</p>`
            : ""
        }

        ${
          produto.categoria
            ? `<small>${escaparHtml(produto.categoria)}</small>`
            : ""
        }

        ${mostrarPreco(produto)}
        ${linkLoja}
      </div>

      <div class="acoesProduto">
        <button type="button"
                onclick="editarProduto(${index})">
          Editar
        </button>

        <button type="button"
                onclick="excluirProduto(${index})">
          Excluir
        </button>
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
    texto.textContent =
      "A prévia da imagem aparecerá aqui.";
    return;
  }

  texto.style.display = "none";
  preview.style.display = "block";
  preview.src = url;

  preview.onerror = () => {
    preview.style.display = "none";
    texto.style.display = "block";
    texto.textContent =
      "Não foi possível carregar essa URL como imagem.";
  };

  preview.onload = () => {
    preview.style.display = "block";
    texto.style.display = "none";
  };
}

function converterUrlImagem(url) {
  if (!url) return "";

  const drive =
    url.match(/drive\.google\.com\/file\/d\/([^/]+)/);

  if (drive?.[1]) {
    return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w1200`;
  }

  const driveOpen = url.match(/[?&]id=([^&]+)/);

  if (
    url.includes("drive.google.com") &&
    driveOpen?.[1]
  ) {
    return `https://drive.google.com/thumbnail?id=${driveOpen[1]}&sz=w1200`;
  }

  return url;
}

/*
  Migração única:
  se o PostgreSQL ainda estiver vazio e este navegador tiver
  os presentes antigos no localStorage, envia esses presentes
  para o banco automaticamente.
*/
async function migrarProdutosLocaisParaBanco() {
  try {
    const resposta = await fetch(`${API_PAINEL}/presentes`);
    const banco = await resposta.json();

    if (!resposta.ok || !Array.isArray(banco)) return;
    if (banco.length > 0) return;

    if (typeof getProdutos !== "function") return;

    const locais = getProdutos();

    if (!Array.isArray(locais) || locais.length === 0) return;

    console.log(
      `Migrando ${locais.length} presente(s) antigo(s) para o PostgreSQL...`
    );

    for (const produto of locais) {
      const valor =
        Number(produto.valor ?? produto.valorTotal) || 0;

      if (!produto.nome || valor <= 0) continue;

      const respostaImportacao = await fetch(
        `${API_PAINEL}/presentes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            nome: produto.nome,
            descricao: produto.descricao || "",
            categoria: produto.categoria || "",
            valor,
            arrecadado: Number(produto.arrecadado) || 0,
            imagem: converterUrlImagem(
              produto.imagem || produto.img || ""
            ),
            link: produto.link || "",
            comprado: Boolean(produto.comprado)
          })
        }
      );

      if (!respostaImportacao.ok) {
        console.error(
          "Falha ao migrar presente:",
          produto.nome
        );
      }
    }

    console.log("Migração de presentes concluída.");
  } catch (erro) {
    console.error(
      "Não foi possível migrar os presentes antigos:",
      erro
    );
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

