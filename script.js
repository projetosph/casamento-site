const API = "https://casamento-backend-f7e4.onrender.com";

// ================= DATA LAYER =================

function getProdutos(){
return JSON.parse(localStorage.getItem("produtos")) || [];
}

function saveProdutos(produtos){
localStorage.setItem("produtos", JSON.stringify(produtos));
}


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

// ================= PAGAMENTO =================
function finalizarPagamento(){

  let nome = document.getElementById("nome").value;
  let tipo = document.querySelector('input[name="pag"]:checked');

  if(!nome){
    alert("Digite seu nome");
    return;
  }

  if(!tipo){
    alert("Escolha forma de pagamento");
    return;
  }

  let compra = JSON.parse(localStorage.getItem("compra"));

  let area = document.getElementById("areaPagamento");

  if(tipo.value === "pix"){

    area.innerHTML = `
      <h3>Pagamento via Pix</h3>

      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=VALOR_${compra.total}">

      <p>Copie a chave:</p>
      <strong>PAULOALANA@PIX</strong>

      <p>Aguardando pagamento...</p>
    `;

  } else {

    fetch("https://casamento-backend-f7e4.onrender.com/criar-pagamento", {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        nome: nome,
        valor: compra.total
      })
    })
    .then(res => res.json())
    .then(data => {

      window.open(data.link, "_blank");

      area.innerHTML = `
        <p>Pagamento aberto...</p>
        <p>Após pagar, seu nome aparecerá automaticamente 💜</p>
      `;

    })
    .catch(() => {
      alert("Erro ao conectar com servidor");
    });

  }
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

// ================= SALVAR (CRIAR OU EDITAR) =================
function salvarProduto(){

  const nome = document.getElementById("nomeProduto").value
  const valorTotal = parseFloat(document.getElementById("valorProduto").value)
  const valorCota = parseFloat(document.getElementById("cotaProduto").value)
  const imagem = document.getElementById("imagemProduto").value
  const editIndex = document.getElementById("editIndex").value

  if(!nome || !valorTotal || !valorCota){
  alert("Preencha tudo")
  return
  }

  if(valorCota > valorTotal){
  alert("Cota maior que valor total")
  return
  }

  const totalCotas = Math.ceil(valorTotal / valorCota)

  let produtos = getProdutos()

  const novoProduto = {
  id: Date.now(),
  nome,
  valorTotal,
  valorCota,
  totalCotas,
  cotasCompradas: 0,
  imagem,
  presentes: []
  }

  if(editIndex === ""){
    produtos.push(novoProduto)
    } else {
    produtos[editIndex] = {
    ...produtos[editIndex],
    nome,
    valorTotal,
    valorCota,
    totalCotas,
    imagem
  }
}

saveProdutos(produtos)

limparFormulario()
carregarProdutosAdmin()
}


// ================= EDITAR =================
function editarProduto(index){
  let produtos = JSON.parse(localStorage.getItem("produtos"))

  const p = produtos[index]

  document.getElementById("nomeProduto").value = p.nome
  document.getElementById("valorProduto").value = p.valor
  document.getElementById("cotaProduto").value = p.cota
  document.getElementById("imagemProduto").value = p.imagem || ""

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
  const lista = JSON.parse(localStorage.getItem("produtos")) || []
  const div = document.getElementById("listaProdutos")

  if(!div) return

  div.innerHTML = "<h3 style='margin-top:20px'>Presentes cadastrados</h3>"

  lista.forEach((p, index)=>{

    div.innerHTML += `
      <div style="
        margin-top:15px;
        padding:10px;
        border:1px solid #eee;
        border-radius:8px;
      ">

        ${p.imagem ? `<img src="${p.imagem}" style="width:60px; border-radius:6px;">` : ""}

        <div><strong>${p.nome}</strong></div>
        <div>R$ ${p.valor}</div>

        <button onclick="editarProduto(${index})">Editar</button>
        <button onclick="excluirProduto(${index})">Excluir</button>

      </div>
    `
  })
}

// ================= LIMPAR =================
function limparFormulario(){
  document.getElementById("nomeProduto").value = ""
  document.getElementById("valorProduto").value = ""
  document.getElementById("cotaProduto").value = ""
  document.getElementById("imagemProduto").value = ""
  document.getElementById("editIndex").value = ""
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

  const lista = getProdutos()
  const container = document.getElementById("listaPresentes")

  if(!container) return

  container.innerHTML = ""

  lista.forEach((p, index)=>{

  
  const progresso = (p.cotasCompradas / p.totalCotas) * 100
  const esgotado = p.cotasCompradas >= p.totalCotas

  container.innerHTML += `
    <div class="card">

      ${p.imagem ? `<img src="${p.imagem}">` : ""}

      <h3>${p.nome}</h3>

      <div class="progress">
        <div style="width:${progresso}%"></div>
      </div>

      <small>${p.cotasCompradas} de ${p.totalCotas} cotas</small>

      <p>R$ ${p.valorCota} por cota</p>

      <button 
        onclick="comprarCota(${index})"
        ${esgotado ? "disabled" : ""}
      >
        ${esgotado ? "ESGOTADO" : "PRESENTEAR"}
      </button>

    </div>
    `

  })
}

function comprarCota(index){

  let produtos = getProdutos()

  const qtd = parseInt(prompt("Quantas cotas deseja?"))
  if(!qtd || qtd <= 0) return

  const p = produtos[index]

  if(p.cotasCompradas + qtd > p.totalCotas){
  alert("Quantidade excede disponível")
  return
  }

  const total = qtd * p.valorCota

  localStorage.setItem("compra", JSON.stringify({
  index,
  nome: p.nome,
  qtd,
  total
  }))

  window.location = "pagamento.html"
}

carregarPresentes()

// ================= RECADO =================
function enviarRecado(){

  const nomeInput = document.getElementById("nomeRecado")
  const msgInput = document.getElementById("mensagemRecado")

  if(!nomeInput || !msgInput){
    alert("Erro interno: campos não encontrados")
    return
  }

  const nome = nomeInput.value.trim()
  const mensagem = msgInput.value.trim()

  if(!nome || !mensagem){
    alert("Preencha nome e mensagem")
    return
  }

  // pega lista existente
  const recados = JSON.parse(localStorage.getItem("recados")) || []

  // adiciona novo recado
  recados.push({
    nome,
    mensagem,
    data: new Date().toLocaleString()
  })

  // salva
  localStorage.setItem("recados", JSON.stringify(recados))

  // 🔥 FEEDBACK BONITO (sem alert)
  mostrarFeedback("Sua mensagem foi enviada!")

  // 🔥 LIMPA CAMPOS
  nomeInput.value = ""
  msgInput.value = ""
}

function carregarRecadosAdmin(){

  const lista = JSON.parse(localStorage.getItem("recados")) || []
  const div = document.getElementById("recados")

  if(!div) return

  div.innerHTML = ""

  lista.reverse().forEach((r, index) => {

    div.innerHTML += `
      <div style="
        margin-top:10px;
        padding:10px;
        border:1px solid #eee;
        border-radius:8px;
        display:flex;
        justify-content:space-between;
        align-items:center;
      ">

        <div>
          <strong>${r.nome}</strong>
          <p style="font-size:13px;">${r.mensagem}</p>
        </div>

        <button onclick="excluirRecado(${index})" style="
          background:none;
          border:none;
          cursor:pointer;
          font-size:16px;
        ">
          🗑️
        </button>

      </div>
    `
  })
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

function toggleBloco(elemento){

  const conteudo = elemento.nextElementSibling

  if(conteudo.style.display === "block"){
    conteudo.style.display = "none"
  } else {
    conteudo.style.display = "block"
  }

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