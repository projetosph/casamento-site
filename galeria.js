// ================= GALERIA ADMIN =================

function adicionarFoto(){

  const input = document.getElementById("fotoUrl")
  if(!input) return

  let url = input.value.trim()

  if(!url){
    alert("Cole a URL da imagem")
    return
  }

  let fotos = JSON.parse(localStorage.getItem("fotos")) || []

  fotos.push(url)

  localStorage.setItem("fotos", JSON.stringify(fotos))

  input.value = ""

  carregarFotosAdmin()
}

function carregarFotosAdmin(){

  const div = document.getElementById("listaFotos")
  if(!div) return

  const fotos = JSON.parse(localStorage.getItem("fotos")) || []

  div.innerHTML = ""

  fotos.forEach((url, i)=>{

    const el = document.createElement("div")

    el.innerHTML = `
      <img src="${url}" style="width:60px; border-radius:6px;">
      <button onclick="removerFoto(${i})">Excluir</button>
    `

    div.appendChild(el)
  })
}

function removerFoto(index){

  let fotos = JSON.parse(localStorage.getItem("fotos")) || []

  fotos.splice(index,1)

  localStorage.setItem("fotos", JSON.stringify(fotos))

  carregarFotosAdmin()
}


// ================= GALERIA HOME =================

function carregarGaleria(){

  const container = document.getElementById("galeriaFotos")
  if(!container) return

  const fotos = JSON.parse(localStorage.getItem("fotos")) || []

  container.innerHTML = ""

  fotos.forEach(url => {

    const div = document.createElement("div")
    div.className = "fotoItemHome"

    div.innerHTML = `<img src="${url}" onclick="abrirFoto('${url}')">`

    container.appendChild(div)
  })
}


// ================= MODAL =================

function abrirFoto(url){

  const modal = document.createElement("div")
  modal.className = "modalFoto"

  modal.innerHTML = `<img src="${url}">`

  modal.onclick = () => modal.remove()

  document.body.appendChild(modal)
}


// ================= INIT SEGURO =================

document.addEventListener("DOMContentLoaded", () => {
  carregarFotosAdmin()
  carregarGaleria()
})