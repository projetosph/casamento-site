// ==========================================================
// LISTA DE PRESENÇA - POSTGRESQL
// ==========================================================

const API_PRESENCA = "https://casamento-backend-f7e4.onrender.com";

function criarCamposConvidados() {
  const quantidade = Number(
    document.getElementById("quantidadePresenca")?.value
  );

  const container =
    document.getElementById("listaNomesConvidados");

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

document.addEventListener("DOMContentLoaded", () => {
  const quantidadeInput =
    document.getElementById("quantidadePresenca");

  const botao =
    document.getElementById("btnConfirmarPresenca");

  if (quantidadeInput) {
    quantidadeInput.addEventListener(
      "input",
      criarCamposConvidados
    );

    quantidadeInput.addEventListener(
      "change",
      criarCamposConvidados
    );
  }

  if (botao) {
    botao.addEventListener(
      "click",
      confirmarPresenca
    );
  }
});

async function confirmarPresenca(event) {
  event?.preventDefault();

  const titularInput =
    document.getElementById("nomePresenca");

  const quantidadeInput =
    document.getElementById("quantidadePresenca");

  const mensagemInput =
    document.getElementById("mensagemPresenca");

  const titular =
    titularInput?.value.trim() || "";

  const quantidadeInformada =
    Number(quantidadeInput?.value) || 0;

  const mensagem =
    mensagemInput?.value.trim() || "";

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
      alert(
        "Preencha o nome e sobrenome de todos os convidados."
      );
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

  const botao =
    document.getElementById("btnConfirmarPresenca");

  if (botao) {
    botao.disabled = true;
    botao.textContent = "ENVIANDO...";
  }

  try {
    const resposta = await fetch(
      `${API_PRESENCA}/presencas`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nome: titular,
          nomes,
          quantidade: nomes.length,
          mensagem
        })
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        dados.erro ||
        "Não foi possível confirmar a presença."
      );
    }

    if (titularInput) titularInput.value = "";
    if (quantidadeInput) quantidadeInput.value = "";
    if (mensagemInput) mensagemInput.value = "";

    const container =
      document.getElementById("listaNomesConvidados");

    if (container) {
      container.innerHTML = "";
    }

    if (typeof mostrarFeedback === "function") {
      mostrarFeedback(
        "Presença confirmada com sucesso!"
      );
    } else {
      alert("Presença confirmada com sucesso!");
    }

    console.log(
      "Presença salva no PostgreSQL:",
      dados
    );
  } catch (erro) {
    console.error(
      "Erro ao confirmar presença:",
      erro
    );

    alert(erro.message);
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.textContent = "CONFIRMAR PRESENÇA";
    }
  }
}
