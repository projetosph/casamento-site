// ==================================================
// UTILITÁRIOS E LOCALSTORAGE
// ==================================================

function lerLista(chave) {
  try {
    const valor = JSON.parse(localStorage.getItem(chave));
    return Array.isArray(valor) ? valor : [];
  } catch (erro) {
    console.error(`Erro ao ler ${chave}:`, erro);
    return [];
  }
}

function salvarLista(chave, lista) {
  localStorage.setItem(chave, JSON.stringify(lista));
}

function getProdutos() {
  return lerLista("produtos");
}

function saveProdutos(produtos) {
  salvarLista("produtos", produtos);
}

function getRecados() {
  return lerLista("recados");
}

function saveRecados(recados) {
  salvarLista("recados", recados);
}

function getPresencas() {
  return lerLista("presencas");
}

function savePresencas(presencas) {
  salvarLista("presencas", presencas);
}

function getGaleria() {
  // Compatibilidade com o nome antigo usado no projeto.
  const fotos = lerLista("fotos");
  return fotos.length ? fotos : lerLista("galeria");
}

function saveGaleria(fotos) {
  salvarLista("fotos", fotos);
}

function formatarMoeda(valor) {
  const numero = Number(valor) || 0;

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function converterUrlImagem(url) {
  if (!url) return "";

  const link = String(url).trim();
  const driveArquivo = link.match(/drive\.google\.com\/file\/d\/([^/]+)/);

  if (driveArquivo?.[1]) {
    return `https://drive.google.com/thumbnail?id=${driveArquivo[1]}&sz=w1200`;
  }

  const driveId = link.match(/[?&]id=([^&]+)/);

  if (link.includes("drive.google.com") && driveId?.[1]) {
    return `https://drive.google.com/thumbnail?id=${driveId[1]}&sz=w1200`;
  }

  return link;
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mostrarFeedback(texto) {
  const aviso = document.createElement("div");

  aviso.textContent = texto;
  aviso.className = "feedbackSite";

  document.body.appendChild(aviso);

  window.setTimeout(() => {
    aviso.remove();
  }, 2500);
}

function toggleBloco(elemento) {
  const conteudo = elemento?.nextElementSibling;

  if (!conteudo) return;

  conteudo.style.display =
    conteudo.style.display === "block" ? "none" : "block";
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    mostrarFeedback("Copiado!");
  } catch (erro) {
    console.error("Não foi possível copiar:", erro);
    alert("Não foi possível copiar automaticamente.");
  }
}
