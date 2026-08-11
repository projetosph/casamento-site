// ======================================
// DASHBOARD - POSTGRESQL
// ======================================

const API_DASHBOARD = "https://casamento-backend-f7e4.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector(".dashboard")) {
    return;
  }

  atualizarDashboard();
});

async function atualizarDashboard() {
  try {
    const [
      respostaProdutos,
      respostaRecados,
      respostaPresencas
    ] = await Promise.all([
      fetch(`${API_DASHBOARD}/presentes`),
      fetch(`${API_DASHBOARD}/recados`),
      fetch(`${API_DASHBOARD}/presencas`)
    ]);

    const [
      produtos,
      recados,
      presencas
    ] = await Promise.all([
      respostaProdutos.json(),
      respostaRecados.json(),
      respostaPresencas.json()
    ]);

    if (
      !respostaProdutos.ok ||
      !respostaRecados.ok ||
      !respostaPresencas.ok
    ) {
      throw new Error(
        "Não foi possível atualizar o painel."
      );
    }

    let valorTotal = 0;
    let arrecadado = 0;

    produtos.forEach(produto => {
      valorTotal +=
        Number(produto.valor) || 0;

      arrecadado +=
        Number(produto.arrecadado) || 0;
    });

    const totalConfirmados =
      presencas.reduce(
        (soma, pessoa) =>
          soma + (Number(pessoa.quantidade) || 0),
        0
      );

    const dashPresentes =
      document.getElementById("dashPresentes");

    const dashRecados =
      document.getElementById("dashRecados");

    const dashPresencas =
      document.getElementById("dashPresencas");

    const dashArrecadado =
      document.getElementById("dashArrecadado");

    if (dashPresentes) {
      dashPresentes.textContent =
        produtos.length;
    }

    if (dashRecados) {
      dashRecados.textContent =
        recados.length;
    }

    if (dashPresencas) {
      dashPresencas.textContent =
        totalConfirmados;
    }

    if (dashArrecadado) {
      dashArrecadado.textContent =
        formatarMoeda(arrecadado);
    }

    atualizarBarra(
      valorTotal,
      arrecadado
    );
  } catch (erro) {
    console.error(
      "Erro ao atualizar dashboard:",
      erro
    );
  }
}

function atualizarBarra(total, arrecadado) {
  const porcentagem =
    total === 0
      ? 0
      : Math.min(
          (arrecadado / total) * 100,
          100
        );

  const barra =
    document.getElementById("barraDashboard");

  const texto =
    document.getElementById("textoMeta");

  if (barra) {
    barra.style.width =
      porcentagem + "%";
  }

  if (texto) {
    texto.textContent =
      formatarMoeda(arrecadado) +
      " de " +
      formatarMoeda(total);
  }
}
