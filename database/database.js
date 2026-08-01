const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const ARQUIVO = path.join(DATA_DIR, "pagamentos.json");

function garantirArquivo() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(ARQUIVO, "[]", "utf8");
  }
}

function listarPagamentos() {
  garantirArquivo();

  try {
    const conteudo = fs.readFileSync(ARQUIVO, "utf8");
    const lista = JSON.parse(conteudo || "[]");

    return Array.isArray(lista) ? lista : [];
  } catch (erro) {
    console.error("Erro ao ler pagamentos.json:", erro);
    return [];
  }
}

function gravarPagamentos(lista) {
  garantirArquivo();

  fs.writeFileSync(
    ARQUIVO,
    JSON.stringify(lista, null, 2),
    "utf8"
  );
}

function localizarPagamento(pagamentoId) {
  return listarPagamentos().find(
    pagamento =>
      String(pagamento.pagamentoId) === String(pagamentoId)
  );
}

function salvarOuAtualizarPagamento(registro) {
  const lista = listarPagamentos();

  const index = lista.findIndex(
    pagamento =>
      String(pagamento.pagamentoId) ===
      String(registro.pagamentoId)
  );

  if (index >= 0) {
    lista[index] = {
      ...lista[index],
      ...registro
    };
  } else {
    lista.push(registro);
  }

  gravarPagamentos(lista);

  return registro;
}

module.exports = {
  listarPagamentos,
  localizarPagamento,
  salvarOuAtualizarPagamento
};
