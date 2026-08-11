// ==========================================================
// LISTA DE PRESENÇA
// Gera os campos dos acompanhantes e envia todos os nomes.
// ==========================================================

function criarCamposConvidados() {
  const quantidade = Number(
    document.getElementById("quantidadePresenca")?.value
  );

  const container = document.getElementById("listaNomesConvidados");

  if (!container) return;

  container.innerHTML = "";

  if (!quantidade || quantidade <= 1) {
    return;
  }

  for (let i = 2; i <= quantidade; i++) {
    container.insertAdjacentHTML(
      "beforeend",
      `
        <input
          type="text"
          class="inputNome nomeConvidado"
          placeholder="Nome e sobrenome do convidado ${i}"
          required
        >
      `
    );
  }
}


// Atualiza automaticamente os campos quando a quantidade mudar
document.addEventListener("DOMContentLoaded", () => {
  const quantidadeInput = document.getElementById("quantidadePresenca");
  const botao = document.getElementById("btnConfirmarPresenca");

  if (quantidadeInput) {
    quantidadeInput.addEventListener("input", criarCamposConvidados);
    quantidadeInput.addEventListener("change", criarCamposConvidados);
  }

  if (botao) {
    botao.addEventListener("click", confirmarPresenca);
  }
});


async function confirmarPresenca(event) {
  if (event) {
    event.preventDefault();
  }

  const titularInput = document.getElementById("nomePresenca");
  const quantidadeInput = document.getElementById("quantidadePresenca");
  const mensagemInput = document.getElementById("mensagemPresenca");

  const titular = titularInput?.value.trim() || "";
  const quantidadeInformada = Number(quantidadeInput?.value) || 0;
  const mensagem = mensagemInput?.value.trim() || "";

  if (!titular) {
    alert("Informe seu nome e sobrenome.");
    titularInput?.focus();
    return;
  }

  if (!quantidadeInformada || quantidadeInformada < 1) {
    alert("Informe a quantidade de pessoas.");
    quantidadeInput?.focus();
    return;
  }

  const nomes = [titular];

  const camposConvidados = [
    ...document.querySelectorAll(".nomeConvidado")
  ];

  for (const input of camposConvidados) {
    const nome = input.value.trim();

    if (!nome) {
      alert("Preencha o nome e sobrenome de todos os convidados.");
      input.focus();
      return;
    }

    nomes.push(nome);
  }

  if (nomes.length !== quantidadeInformada) {
    alert(
      "A quantidade de nomes preenchidos deve ser igual à quantidade de pessoas."
    );
    return;
  }

  const presenca = {
    nome: titular,
    nomes: nomes,
    quantidade: nomes.length,
    mensagem: mensagem,
    dataConfirmacao: new Date().toISOString()
  };

  /*
    Mantém compatibilidade com o formato atual do site:
    salva a confirmação no localStorage.

    Se o seu projeto já usa a chave "presencas", ela será preservada.
  */
  let presencas = [];

  try {
    presencas = JSON.parse(localStorage.getItem("presencas")) || [];
  } catch (erro) {
    console.error("Erro ao carregar lista de presenças:", erro);
  }

  presencas.push(presenca);

  localStorage.setItem(
    "presencas",
    JSON.stringify(presencas)
  );

  // Limpa o formulário
  if (titularInput) titularInput.value = "";
  if (quantidadeInput) quantidadeInput.value = "";
  if (mensagemInput) mensagemInput.value = "";

  const container = document.getElementById("listaNomesConvidados");
  if (container) {
    container.innerHTML = "";
  }

  // Feedback
  if (typeof mostrarFeedback === "function") {
    mostrarFeedback("Presença confirmada com sucesso!");
  } else {
    alert("Presença confirmada com sucesso!");
  }

  // Atualiza a lista visível, caso exista uma função do projeto para isso
  if (typeof carregarPresencas === "function") {
    carregarPresencas();
  }

  console.log("Presença confirmada:", presenca);
}
