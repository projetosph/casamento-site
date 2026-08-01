const API = "https://casamento-backend-f7e4.onrender.com";


// ================= RESUMO =================
function resumo(){

  let r = document.getElementById("resumo");
  if(!r) return;

  let compra = JSON.parse(localStorage.getItem("compra"));

  if(!compra) return;

  r.innerHTML = `
    <p>${compra.nome}</p>
    <p>${compra.qtd} cotas</p>
    <p>Total: R$ ${compra.total}</p>
  `;
}

// ================= INIT =================
resumo();

// ============ PRESENÇA =============
function confirmarPresenca() {
  const nome = document.getElementById("nome").value
  const quantidade = document.getElementById("quantidade").value
  const mensagem = document.getElementById("mensagem").value

  if (!nome || !quantidade) {
    alert("Preencha nome e quantidade")
    return
  }

  const lista = JSON.parse(localStorage.getItem("presencas")) || []

  lista.push({
    nome,
    quantidade,
    mensagem
  })

  localStorage.setItem("presencas", JSON.stringify(lista))

  alert("Presença confirmada!")

  document.getElementById("nome").value = ""
  document.getElementById("quantidade").value = ""
  document.getElementById("mensagem").value = ""

  carregarPresencas()
}

function carregarPresencas() {
  const lista = JSON.parse(localStorage.getItem("presencas")) || []
  const container = document.getElementById("listaPresenca")

  if (!container) return

  container.innerHTML = "<h3 style='margin-top:30px'>Confirmados</h3>"

  lista.forEach(p => {
    container.innerHTML += `
      <div style="margin-top:10px; font-size:13px;">
        <strong>${p.nome}</strong> - ${p.quantidade} pessoa(s)
      </div>
    `
  })
}

carregarPresencas()

// ================= EDITAR =================
function editarProduto(index){
  let produtos = JSON.parse(localStorage.getItem("produtos"))

  const p = produtos[index]

  document.getElementById("nomeProduto").value = p.nome
  document.getElementById("valorProduto").value = p.valor
  document.getElementById("imagemProduto").value = p.imagem || ""
  document.getElementById("linkProduto").value =
    produto.link || "";
  document.getElementById("editIndex").value = index
}

// ================= EXCLUIR =================
function excluirProduto(index){
  if(!confirm("Deseja excluir este produto?")) return

  let produtos = JSON.parse(localStorage.getItem("produtos"))

  produtos.splice(index, 1)

  localStorage.setItem("produtos", JSON.stringify(produtos))

  carregarProdutosAdmin()
}

// ================= LISTAR =================
function carregarProdutosAdmin(){

    const lista = getProdutos();

    const div = document.getElementById("listaProdutos");

    if(!div) return;

    div.innerHTML = "<h3 style='margin-top:20px'>Presentes cadastrados</h3>";

    lista.forEach((produto,index)=>{

        div.innerHTML += `

        <div class="produtoAdmin">

            ${
                produto.imagem
                ? `<img src="${produto.imagem}" class="produtoAdminFoto">`
                : ""
            }

            <div class="produtoAdminInfo">

                <h3>${produto.nome}</h3>

                <p>${produto.descricao || ""}</p>

                <small>${produto.categoria || ""}</small>

                ${mostrarPreco(produto)}

            </div>

            <div class="acoesProduto">

                <button onclick="editarProduto(${index})">
                    Editar
                </button>

                <button onclick="excluirProduto(${index})">
                    Excluir
                </button>

            </div>

        </div>

        `;

    });

}
function mostrarPreco(produto){

    const restante = produto.valor - (produto.arrecadado || 0);

    if((produto.arrecadado || 0) <= 0){

        return `
            <p class="valorAtual">
                ${formatarMoeda(produto.valor)}
            </p>
        `;

    }

    if(restante <= 0){

        return `

            <p class="valorAntigo">

                ${formatarMoeda(produto.valor)}

            </p>

            <p class="presenteado">

                ❤️ PRESENTEADO

            </p>

        `;

    }

    return `

        <p class="valorAntigo">

            ${formatarMoeda(produto.valor)}

        </p>

        <p class="valorAtual">

            ${formatarMoeda(restante)}

        </p>

    `;

}

// ================= LIMPAR =================
function limparFormulario(){

    document.getElementById("linkProduto").value="";

    document.getElementById("nomeProduto").value="";

    document.getElementById("descricaoProduto").value="";

    document.getElementById("categoriaProduto").value="";

    document.getElementById("valorProduto").value="";

    document.getElementById("imagemProduto").value="";

    document.getElementById("editIndex").value="";

}

carregarProdutosAdmin()

// ================= PRESENÇAS =================
function carregarPresencasAdmin(){
  const lista = JSON.parse(localStorage.getItem("presencas")) || []
  const div = document.getElementById("presencas")

  if(!div) return

  // soma total de pessoas
  let total = 0
  lista.forEach(p => {
    total += Number(p.quantidade)
  })

  div.innerHTML = `
    <h3 style="margin-bottom:15px;">
      Lista de Presença (${total} confirmados)
    </h3>
  `

  lista.forEach((p, index)=>{
    div.innerHTML += `
      <div style="margin-top:10px; display:flex; justify-content:space-between;">
        <span>${p.nome} - ${p.quantidade} pessoa(s)</span>
        <button onclick="excluirPresenca(${index})">🗑️</button>
      </div>
    `
  })
}

function excluirPresenca(index){
  let lista = JSON.parse(localStorage.getItem("presencas")) || []

  lista.splice(index, 1)

  localStorage.setItem("presencas", JSON.stringify(lista))

  carregarPresencasAdmin()
}

carregarProdutosAdmin()
carregarPresencasAdmin()

function carregarPresentes(){

    const container =
        document.getElementById("listaPresentes");

    if(!container) return;

    container.innerHTML="";

    produtos.forEach((produto,index)=>{

        const restante =
            Math.max(
                produto.valor - produto.arrecadado,
                0
            );  

        const porcentagem =
            Math.min(
                (produto.arrecadado/produto.valor)*100,
                100
            );
            

        container.innerHTML += `

        <div class="cardPresente">

            <img src="${produto.imagem}">

            <h3>${produto.nome}</h3>

            <div class="barraProgresso">

                <div
                    class="barraValor"
                    style="width:${porcentagem}%">
                </div>

            </div>

            ${
                produto.arrecadado > 0

                ?

                `<p class="valorAntigo">

                    <s>

                        R$ ${produto.valor.toFixed(2).replace(".",",")}

                    </s>

                </p>

                <p class="valorAtual">

                    R$ ${restante.toFixed(2).replace(".",",")}

                </p>`

                :

                `<p class="valorAtual">

                    R$ ${produto.valor.toFixed(2).replace(".",",")}

                </p>`
            }
                          ${produto.link ? `
              <a href="${produto.link}"
                target="_blank"
                class="btnVerProduto">
                  Ver produto
              </a>
              ` : ""}

            <button
                onclick="abrirCheckout(${index})">

                PRESENTEAR

            </button>

        </div>

        `;

    });

}

function excluirRecado(index){

  if(!confirm("Excluir este recado?")) return

  let lista = JSON.parse(localStorage.getItem("recados")) || []

  // ⚠️ como usamos reverse, precisa ajustar índice
  lista.splice(lista.length - 1 - index, 1)

  localStorage.setItem("recados", JSON.stringify(lista))

  carregarRecadosAdmin()
}

function mostrarFeedback(texto){

  const div = document.createElement("div")

  div.innerText = texto

  div.style.position = "fixed"
  div.style.bottom = "20px"
  div.style.left = "50%"
  div.style.transform = "translateX(-50%)"
  div.style.background = "#2f3e3a"
  div.style.color = "white"
  div.style.padding = "12px 20px"
  div.style.borderRadius = "8px"
  div.style.fontSize = "13px"
  div.style.zIndex = "9999"

  document.body.appendChild(div)

  setTimeout(() => {
    div.remove()
  }, 2500)
}


// ================= GALERIA ADMIN =================

function adicionarFoto(){

  let url = document.getElementById("fotoUrl").value

  if(!url){
    alert("Cole a URL da imagem")
    return
  }

  let fotos = JSON.parse(localStorage.getItem("fotos")) || []

  fotos.push(url)

  localStorage.setItem("fotos", JSON.stringify(fotos))

  document.getElementById("fotoUrl").value = ""

  carregarFotosAdmin()
}

function carregarFotosAdmin(){

  const fotos = JSON.parse(localStorage.getItem("fotos")) || []
  const div = document.getElementById("listaFotos")

  if(!div) return

  div.innerHTML = ""

  fotos.forEach((f, i)=>{

    const item = document.createElement("div")

    item.innerHTML = `
      <img src="${f}" style="width:60px; border-radius:6px;">
      <button onclick="removerFoto(${i})">Excluir</button>
    `

    div.appendChild(item)
  })
}

function removerFoto(i){

  let fotos = JSON.parse(localStorage.getItem("fotos"))

  fotos.splice(i,1)

  localStorage.setItem("fotos", JSON.stringify(fotos))

  carregarFotosAdmin()
}

carregarFotosAdmin()

// ================= GALERIA HOME =================

function carregarGaleria(){

  const container = document.getElementById("galeriaFotos")
  if(!container) return

  const fotos = JSON.parse(localStorage.getItem("fotos")) || []

  container.innerHTML = ""

  fotos.forEach(url => {

    container.innerHTML += `
      <div class="fotoItemHome">
        <img src="${url}" onclick="abrirFoto('${url}')">
      </div>
    `

  })

}

function abrirFoto(url){

  const modal = document.createElement("div")
  modal.className = "modalFoto"

  modal.innerHTML = `<img src="${url}">`

  modal.onclick = () => modal.remove()

  document.body.appendChild(modal)
}

document.addEventListener("DOMContentLoaded", () => {
  

  carregarGaleria()
  carregarFotosAdmin()

})

// ================= CONTADOR =================

carregarPresentes()
carregarPresencas()
carregarProdutosAdmin()
carregarPresencasAdmin()
carregarGaleria()

// ================= CONTADOR =================

document.addEventListener("DOMContentLoaded", () => {

  function atualizarContador(){

    const dataCasamento = new Date("2026-09-07T00:00:00").getTime()

    const agora = new Date().getTime()

    const diferenca = dataCasamento - agora

    const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24))

    const horas = Math.floor(
      (diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    )

    const minutos = Math.floor(
      (diferenca % (1000 * 60 * 60)) / (1000 * 60)
    )

    const contador = document.getElementById("contador")

    if(contador){

      contador.innerHTML =
      `${dias} DIAS | ${horas} HORAS | ${minutos} MIN`

    }

  }

  atualizarContador()

  setInterval(atualizarContador, 1000)

})


let produtoCheckout = null;

document.addEventListener("DOMContentLoaded",()=>{
      document.getElementById("valorCompletoTexto").innerHTML =
    "R$ " +
    (produtoCheckout.valor - produtoCheckout.arrecadado)
    .toFixed(2)
    .replace(".",",");

    if(!location.pathname.includes("pagamento"))
        return;

    produtoCheckout =
        JSON.parse(
            localStorage.getItem("produtoCheckout")
        );

    if(!produtoCheckout)
        return;

    document.getElementById("fotoProduto").src =
        produtoCheckout.imagem;

    document.getElementById("nomeProdutoCheckout").innerHTML =
        produtoCheckout.nome;

    if(produtoCheckout.arrecadado>0){

        document.getElementById("valorOriginal").innerHTML=
            "R$ "+produtoCheckout.valor.toFixed(2);

        document.getElementById("valorRestante").innerHTML=
            "R$ "+(produtoCheckout.valor-produtoCheckout.arrecadado).toFixed(2);

    }else{

        document.getElementById("valorOriginal").style.display="none";

        document.getElementById("valorRestante").innerHTML=
            "R$ "+produtoCheckout.valor.toFixed(2);

    }

});

