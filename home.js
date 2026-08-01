// ==================================================
// HOME
// ==================================================

document.addEventListener("DOMContentLoaded", () => {
  iniciarContador();
  prepararFormularioRecado();

  if (typeof carregarGaleria === "function") {
    carregarGaleria();
  }
});

function iniciarContador() {
  const contador = document.getElementById("contador");

  if (!contador) return;

  function atualizar() {
    const casamento = new Date("2026-09-07T15:30:00-03:00").getTime();
    const agora = Date.now();
    const diferenca = casamento - agora;

    if (diferenca <= 0) {
      contador.textContent = "CHEGOU O GRANDE DIA";
      return;
    }

    const dias = Math.floor(diferenca / 86400000);
    const horas = Math.floor((diferenca % 86400000) / 3600000);
    const minutos = Math.floor((diferenca % 3600000) / 60000);

    contador.textContent =
      `${dias} DIAS | ${horas} HORAS | ${minutos} MIN`;
  }

  atualizar();
  window.setInterval(atualizar, 1000);
}

function prepararFormularioRecado() {
  const nome = document.getElementById("nomeRecado");
  const mensagem = document.getElementById("mensagemRecado");
  const botao = document.getElementById("btnEnviarRecado");

  if (!nome || !mensagem) return;

  botao?.addEventListener("click", enviarRecado);

  nome.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      mensagem.focus();
    }
  });

  mensagem.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      enviarRecado();
    }
  });
}

function enviarRecado() {
  const campoNome = document.getElementById("nomeRecado");
  const campoMensagem = document.getElementById("mensagemRecado");

  if (!campoNome || !campoMensagem) return;

  const nome = campoNome.value.trim();
  const mensagem = campoMensagem.value.trim();

  if (!nome || !mensagem) {
    alert("Digite seu nome e a mensagem.");
    return;
  }

  const recados = getRecados();

  recados.push({
    id: Date.now(),
    nome,
    mensagem,
    criadoEm: new Date().toISOString()
  });

  saveRecados(recados);

  campoNome.value = "";
  campoMensagem.value = "";
  campoNome.focus();

  mostrarFeedback("Sua mensagem foi enviada!");
}
