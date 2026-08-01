// ======================================
// DASHBOARD
// ======================================

document.addEventListener("DOMContentLoaded",()=>{

    if(!document.querySelector(".dashboard"))
        return;

    atualizarDashboard();

});

function atualizarDashboard(){

    const produtos =
        getProdutos();

    const recados =
        getRecados();

    const presencas =
        getPresencas();

    let valorTotal = 0;

    let arrecadado = 0;

    produtos.forEach(produto=>{

        valorTotal +=
            produto.valor || 0;

        arrecadado +=
            produto.arrecadado || 0;

    });

    document.getElementById("dashPresentes").innerHTML =
        produtos.length;

    document.getElementById("dashRecados").innerHTML =
        recados.length;

    document.getElementById("dashPresencas").innerHTML =
        presencas.length;

    document.getElementById("dashArrecadado").innerHTML =
        formatarMoeda(arrecadado);

    atualizarBarra(valorTotal,arrecadado);

}

function atualizarBarra(total,arrecadado){

    const porcentagem =
        total==0
        ?0
        :(arrecadado/total)*100;

    document.getElementById("barraDashboard").style.width =
        porcentagem+"%";

    document.getElementById("textoMeta").innerHTML =

        formatarMoeda(arrecadado)+
        " de "+
        formatarMoeda(total);

}