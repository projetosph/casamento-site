const express = require("express");
const cors = require("cors");
const { criarPix, criarPagamentoCartao, consultarPagamento } = require("./services/mercadoPago");
const { salvarOuAtualizarPagamento, localizarPagamento, listarPagamentos } = require("./database/database");
const { pool, iniciarBanco } = require("./database");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || "https://casamento-backend-f7e4.onrender.com";

app.get("/", (req, res) => {
  res.json({ ok: true, servico: "casamento-backend", mensagem: "Backend funcionando" });
});



// ==========================================================
// PRESENÇAS - POSTGRESQL
// ==========================================================

function normalizarPresenca(row) {
  return {
    id: row.id,
    nome: row.nome,
    nomes: Array.isArray(row.nomes) ? row.nomes : [],
    quantidade: Number(row.quantidade) || 1,
    mensagem: row.mensagem || "",
    criadoEm: row.criado_em
  };
}

app.get("/presencas", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT id, nome, nomes, quantidade, mensagem, criado_em
      FROM presencas
      ORDER BY id ASC
    `);

    res.json(resultado.rows.map(normalizarPresenca));
  } catch (erro) {
    console.error("Erro ao listar presenças:", erro);
    res.status(500).json({
      erro: "Não foi possível carregar as presenças."
    });
  }
});

app.post("/presencas", async (req, res) => {
  try {
    const {
      nome,
      nomes = [],
      quantidade,
      mensagem = ""
    } = req.body;

    const listaNomes =
      Array.isArray(nomes)
        ? nomes
            .map(item => String(item || "").trim())
            .filter(Boolean)
        : [];

    const titular =
      String(nome || listaNomes[0] || "").trim();

    const quantidadeNumerica =
      Number(quantidade) || listaNomes.length || 1;

    if (!titular) {
      return res.status(400).json({
        erro: "O nome do convidado é obrigatório."
      });
    }

    if (
      listaNomes.length > 0 &&
      listaNomes.length !== quantidadeNumerica
    ) {
      return res.status(400).json({
        erro: "A quantidade de nomes não corresponde à quantidade informada."
      });
    }

    const nomesFinais =
      listaNomes.length > 0
        ? listaNomes
        : [titular];

    const resultado = await pool.query(
      `
        INSERT INTO presencas
          (nome, nomes, quantidade, mensagem)
        VALUES
          ($1, $2::jsonb, $3, $4)
        RETURNING *
      `,
      [
        titular,
        JSON.stringify(nomesFinais),
        quantidadeNumerica,
        String(mensagem || "").trim()
      ]
    );

    res.status(201).json(
      normalizarPresenca(resultado.rows[0])
    );
  } catch (erro) {
    console.error("Erro ao cadastrar presença:", erro);
    res.status(500).json({
      erro: "Não foi possível confirmar a presença."
    });
  }
});

app.delete("/presencas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        erro: "ID da presença inválido."
      });
    }

    const resultado = await pool.query(
      "DELETE FROM presencas WHERE id = $1 RETURNING id",
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        erro: "Confirmação não encontrada."
      });
    }

    res.json({ ok: true, id });
  } catch (erro) {
    console.error("Erro ao excluir presença:", erro);
    res.status(500).json({
      erro: "Não foi possível excluir a presença."
    });
  }
});

// ==========================================================
// RECADOS - POSTGRESQL
// ==========================================================

function normalizarRecado(row) {
  return {
    id: row.id,
    nome: row.nome,
    mensagem: row.mensagem,
    criadoEm: row.criado_em
  };
}

app.get("/recados", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT id, nome, mensagem, criado_em
      FROM recados
      ORDER BY id ASC
    `);

    res.json(resultado.rows.map(normalizarRecado));
  } catch (erro) {
    console.error("Erro ao listar recados:", erro);
    res.status(500).json({
      erro: "Não foi possível carregar os recados."
    });
  }
});

app.post("/recados", async (req, res) => {
  try {
    const nome = String(req.body?.nome || "").trim();
    const mensagem = String(req.body?.mensagem || "").trim();

    if (!nome || !mensagem) {
      return res.status(400).json({
        erro: "Nome e mensagem são obrigatórios."
      });
    }

    const resultado = await pool.query(
      `
        INSERT INTO recados
          (nome, mensagem)
        VALUES
          ($1, $2)
        RETURNING *
      `,
      [nome, mensagem]
    );

    res.status(201).json(
      normalizarRecado(resultado.rows[0])
    );
  } catch (erro) {
    console.error("Erro ao cadastrar recado:", erro);
    res.status(500).json({
      erro: "Não foi possível enviar o recado."
    });
  }
});

app.delete("/recados/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        erro: "ID do recado inválido."
      });
    }

    const resultado = await pool.query(
      "DELETE FROM recados WHERE id = $1 RETURNING id",
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        erro: "Recado não encontrado."
      });
    }

    res.json({ ok: true, id });
  } catch (erro) {
    console.error("Erro ao excluir recado:", erro);
    res.status(500).json({
      erro: "Não foi possível excluir o recado."
    });
  }
});

// ==========================================================
// PRESENTES - POSTGRESQL
// ==========================================================

function normalizarPresente(row) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao || "",
    categoria: row.categoria || "",
    valor: Number(row.valor) || 0,
    arrecadado: Number(row.arrecadado) || 0,
    imagem: row.imagem || "",
    link: row.link || "",
    comprado: Boolean(row.comprado),
    ordem: Number(row.ordem) || 0,
    criadoEm: row.criado_em
  };
}

app.get("/presentes", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        id, nome, descricao, categoria, valor,
        arrecadado, imagem, link, comprado, ordem, criado_em
      FROM presentes
      ORDER BY ordem ASC NULLS LAST, id ASC
    `);

    res.json(resultado.rows.map(normalizarPresente));
  } catch (erro) {
    console.error("Erro ao listar presentes:", erro);
    res.status(500).json({
      erro: "Não foi possível carregar os presentes."
    });
  }
});

app.post("/presentes", async (req, res) => {
  try {
    const {
      nome,
      descricao = "",
      categoria = "",
      valor,
      arrecadado = 0,
      imagem = "",
      link = "",
      comprado = false
    } = req.body;

    const valorNumerico = Number(valor);
    const arrecadadoNumerico = Number(arrecadado) || 0;

    if (!nome || !Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      return res.status(400).json({
        erro: "Nome e valor válido são obrigatórios."
      });
    }

    const resultado = await pool.query(
      `
        INSERT INTO presentes
          (
            nome, descricao, categoria, valor,
            arrecadado, imagem, link, comprado, ordem
          )
        VALUES
          (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            (SELECT COALESCE(MAX(ordem), 0) + 1 FROM presentes)
          )
        RETURNING *
      `,
      [
        String(nome).trim(),
        String(descricao || "").trim(),
        String(categoria || "").trim(),
        valorNumerico,
        Math.max(arrecadadoNumerico, 0),
        String(imagem || "").trim(),
        String(link || "").trim(),
        Boolean(comprado)
      ]
    );

    res.status(201).json(
      normalizarPresente(resultado.rows[0])
    );
  } catch (erro) {
    console.error("Erro ao cadastrar presente:", erro);
    res.status(500).json({
      erro: "Não foi possível cadastrar o presente."
    });
  }
});

app.put("/presentes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      nome,
      descricao = "",
      categoria = "",
      valor,
      imagem = "",
      link = ""
    } = req.body;

    const valorNumerico = Number(valor);

    if (
      !Number.isInteger(id) ||
      !nome ||
      !Number.isFinite(valorNumerico) ||
      valorNumerico <= 0
    ) {
      return res.status(400).json({
        erro: "Dados do presente inválidos."
      });
    }

    const resultado = await pool.query(
      `
        UPDATE presentes
        SET
          nome = $1,
          descricao = $2,
          categoria = $3,
          valor = $4,
          imagem = $5,
          link = $6,
          comprado =
            CASE
              WHEN arrecadado >= $4 THEN TRUE
              ELSE FALSE
            END
        WHERE id = $7
        RETURNING *
      `,
      [
        String(nome).trim(),
        String(descricao || "").trim(),
        String(categoria || "").trim(),
        valorNumerico,
        String(imagem || "").trim(),
        String(link || "").trim(),
        id
      ]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        erro: "Presente não encontrado."
      });
    }

    res.json(normalizarPresente(resultado.rows[0]));
  } catch (erro) {
    console.error("Erro ao atualizar presente:", erro);
    res.status(500).json({
      erro: "Não foi possível atualizar o presente."
    });
  }
});

app.delete("/presentes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        erro: "ID do presente inválido."
      });
    }

    const resultado = await pool.query(
      "DELETE FROM presentes WHERE id = $1 RETURNING id",
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        erro: "Presente não encontrado."
      });
    }

    res.json({ ok: true, id });
  } catch (erro) {
    console.error("Erro ao excluir presente:", erro);
    res.status(500).json({
      erro: "Não foi possível excluir o presente."
    });
  }
});


// Reordena presentes sem excluir ou recriar nenhum item.
app.put("/reordenar-presentes", async (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map(Number)
    : [];

  if (
    ids.length === 0 ||
    ids.some(id => !Number.isInteger(id))
  ) {
    return res.status(400).json({
      erro: "Lista de IDs inválida."
    });
  }

  const idsUnicos = [...new Set(ids)];

  if (idsUnicos.length !== ids.length) {
    return res.status(400).json({
      erro: "A lista contém IDs duplicados."
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const existentes = await cliente.query(
      "SELECT id FROM presentes ORDER BY ordem ASC NULLS LAST, id ASC"
    );

    const todosIds = existentes.rows.map(row => Number(row.id));

    if (
      todosIds.length !== ids.length ||
      todosIds.some(id => !idsUnicos.includes(id))
    ) {
      await cliente.query("ROLLBACK");

      return res.status(409).json({
        erro: "A lista de presentes mudou. Atualize o painel e tente novamente."
      });
    }

    for (let i = 0; i < ids.length; i++) {
      await cliente.query(
        "UPDATE presentes SET ordem = $1 WHERE id = $2",
        [i + 1, ids[i]]
      );
    }

    await cliente.query("COMMIT");
    res.json({ ok: true });
  } catch (erro) {
    await cliente.query("ROLLBACK");

    console.error("Erro ao reordenar presentes:", erro);

    res.status(500).json({
      erro: "Não foi possível salvar a nova ordem."
    });
  } finally {
    cliente.release();
  }
});


// ==========================================================
// PAGAMENTOS + ATUALIZAÇÃO DOS PRESENTES - POSTGRESQL
// ==========================================================

async function registrarPagamentoBanco(registro) {
  const pagamentoId =
    String(registro.pagamentoId || "").trim();

  if (!pagamentoId) {
    throw new Error("Pagamento sem ID do Mercado Pago.");
  }

  const produtoId =
    Number(registro.produtoId);

  const valor =
    Number(registro.valor) || 0;

  const parcelas =
    Number(registro.installments || registro.parcelas) || null;

  const resultado = await pool.query(
    `
      INSERT INTO pagamentos (
        mercado_pago_id,
        status,
        status_detail,
        valor,
        nome,
        email,
        produto_id,
        produto_nome,
        tipo_contribuicao,
        metodo_pagamento,
        parcelas,
        atualizado_em
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (mercado_pago_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        status_detail = EXCLUDED.status_detail,
        valor = CASE
          WHEN EXCLUDED.valor > 0
          THEN EXCLUDED.valor
          ELSE pagamentos.valor
        END,
        nome = COALESCE(
          NULLIF(EXCLUDED.nome, ''),
          pagamentos.nome
        ),
        email = COALESCE(
          NULLIF(EXCLUDED.email, ''),
          pagamentos.email
        ),
        produto_id = COALESCE(
          EXCLUDED.produto_id,
          pagamentos.produto_id
        ),
        produto_nome = COALESCE(
          NULLIF(EXCLUDED.produto_nome, ''),
          pagamentos.produto_nome
        ),
        tipo_contribuicao = COALESCE(
          NULLIF(EXCLUDED.tipo_contribuicao, ''),
          pagamentos.tipo_contribuicao
        ),
        metodo_pagamento = COALESCE(
          NULLIF(EXCLUDED.metodo_pagamento, ''),
          pagamentos.metodo_pagamento
        ),
        parcelas = COALESCE(
          EXCLUDED.parcelas,
          pagamentos.parcelas
        ),
        atualizado_em = CURRENT_TIMESTAMP
      RETURNING *
    `,
    [
      pagamentoId,
      registro.status || "",
      registro.statusDetail || "",
      valor,
      registro.nome || "",
      registro.email || "",
      Number.isInteger(produtoId) ? produtoId : null,
      registro.produtoNome || "",
      registro.tipoContribuicao || "",
      registro.metodoPagamento || "",
      parcelas
    ]
  );

  return resultado.rows[0];
}

async function aplicarPagamentoAprovadoBanco(pagamentoId) {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const consultaPagamento = await cliente.query(
      `
        SELECT *
        FROM pagamentos
        WHERE mercado_pago_id = $1
        FOR UPDATE
      `,
      [String(pagamentoId)]
    );

    if (consultaPagamento.rowCount === 0) {
      await cliente.query("ROLLBACK");
      return false;
    }

    const pagamento = consultaPagamento.rows[0];

    if (
      pagamento.status !== "approved" ||
      pagamento.aplicado
    ) {
      await cliente.query("COMMIT");
      return false;
    }

    const produtoId = Number(pagamento.produto_id);
    const valorPago = Number(pagamento.valor) || 0;

    if (
      !Number.isInteger(produtoId) ||
      valorPago <= 0
    ) {
      await cliente.query("ROLLBACK");

      console.error(
        "Pagamento aprovado sem produto/valor válido:",
        pagamento.mercado_pago_id
      );

      return false;
    }

    const produto = await cliente.query(
      `
        SELECT id, valor, arrecadado
        FROM presentes
        WHERE id = $1
        FOR UPDATE
      `,
      [produtoId]
    );

    if (produto.rowCount === 0) {
      await cliente.query("ROLLBACK");

      console.error(
        "Produto do pagamento não encontrado:",
        produtoId
      );

      return false;
    }

    const valorTotal =
      Number(produto.rows[0].valor) || 0;

    const arrecadadoAtual =
      Number(produto.rows[0].arrecadado) || 0;

    const novoArrecadado =
      Math.min(
        valorTotal,
        arrecadadoAtual + valorPago
      );

    await cliente.query(
      `
        UPDATE presentes
        SET
          arrecadado = $1,
          comprado = ($1 >= valor)
        WHERE id = $2
      `,
      [novoArrecadado, produtoId]
    );

    await cliente.query(
      `
        UPDATE pagamentos
        SET
          aplicado = TRUE,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE mercado_pago_id = $1
      `,
      [String(pagamentoId)]
    );

    await cliente.query("COMMIT");

    console.log(
      `Pagamento ${pagamentoId} aplicado ao presente ${produtoId}: +${valorPago}`
    );

    return true;
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

async function atualizarPagamentoCompleto(registro) {
  const salvo =
    await registrarPagamentoBanco(registro);

  if (salvo.status === "approved") {
    await aplicarPagamentoAprovadoBanco(
      salvo.mercado_pago_id
    );
  }

  return salvo;
}

function normalizarPagamentoBanco(row) {
  return {
    id: row.id,
    pagamentoId: row.mercado_pago_id,
    status: row.status || "",
    statusDetail: row.status_detail || "",
    valor: Number(row.valor) || 0,
    nome: row.nome || "",
    email: row.email || "",
    produtoId: row.produto_id,
    produtoNome: row.produto_nome || "",
    tipoContribuicao:
      row.tipo_contribuicao || "",
    metodoPagamento:
      row.metodo_pagamento || "",
    installments:
      Number(row.parcelas) || null,
    aplicado: Boolean(row.aplicado),
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

app.get("/config/mercadopago", (req, res) => {
  const publicKey = process.env.MERCADO_PAGO_PUBLIC_KEY;
  if (!publicKey) return res.status(500).json({ erro: "MERCADO_PAGO_PUBLIC_KEY não configurada." });
  res.json({ publicKey });
});

app.post("/criar-pix", async (req, res) => {
  try {
    const { nome, email, valor, produtoId, produtoIndex, produtoNome, produtoImagem, tipoContribuicao } = req.body;
    const valorNumerico = Number(valor);

    if (!nome || !email || !produtoNome) return res.status(400).json({ erro: "Nome, e-mail e produto são obrigatórios." });
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) return res.status(400).json({ erro: "O valor informado é inválido." });

    const referencia = `${produtoId ?? produtoIndex ?? "produto"}:${Date.now()}`;

    const pagamento = await criarPix({
      nome, email, valor: valorNumerico, produtoId, produtoIndex, produtoNome, tipoContribuicao,
      externalReference: referencia, notificationUrl: `${PUBLIC_URL}/webhook`
    });

    const dadosPix = pagamento.point_of_interaction?.transaction_data || {};

    const registroPix = {
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor:
        Number(pagamento.transaction_amount) ||
        valorNumerico,
      nome,
      email,
      produtoId,
      produtoIndex,
      produtoNome,
      produtoImagem: produtoImagem || "",
      tipoContribuicao,
      metodoPagamento: "pix",
      externalReference:
        pagamento.external_reference || referencia,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    salvarOuAtualizarPagamento(registroPix);
    await atualizarPagamentoCompleto(registroPix);

    res.status(201).json({
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor: Number(pagamento.transaction_amount) || valorNumerico,
      qrCode: dadosPix.qr_code || "",
      qrCodeBase64: dadosPix.qr_code_base64 || "",
      ticketUrl: dadosPix.ticket_url || ""
    });
  } catch (erro) {
    console.error("Erro ao criar PIX:", erro);
    res.status(500).json({ erro: "Não foi possível gerar o PIX.", detalhe: erro?.detalhes?.message || erro?.message || "Erro interno." });
  }
});

app.post("/criar-cartao", async (req, res) => {
  try {
    const {
      nome, email, valor, produtoId, produtoIndex, produtoNome, produtoImagem, tipoContribuicao,
      token, installments, payment_method_id, issuer_id, payer
    } = req.body;

    const valorNumerico = Number(valor);
    const parcelas = Number(installments);

    if (!nome || !email || !produtoNome) return res.status(400).json({ erro: "Nome, e-mail e produto são obrigatórios." });
    if (!token || !payment_method_id || !parcelas) return res.status(400).json({ erro: "Os dados do cartão estão incompletos." });
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) return res.status(400).json({ erro: "O valor informado é inválido." });

    const referencia = `${produtoId ?? produtoIndex ?? "produto"}:${Date.now()}`;

    const pagamento = await criarPagamentoCartao({
      nome, email, valor: valorNumerico, produtoId, produtoIndex, produtoNome, tipoContribuicao,
      externalReference: referencia, notificationUrl: `${PUBLIC_URL}/webhook`,
      token, installments: parcelas, paymentMethodId: payment_method_id, issuerId: issuer_id, payer
    });

    const registroCartao = {
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor:
        Number(pagamento.transaction_amount) ||
        valorNumerico,
      nome,
      email,
      produtoId,
      produtoIndex,
      produtoNome,
      produtoImagem: produtoImagem || "",
      tipoContribuicao,
      metodoPagamento: "cartao",
      paymentMethodId:
        pagamento.payment_method_id ||
        payment_method_id,
      installments:
        pagamento.installments || parcelas,
      externalReference:
        pagamento.external_reference || referencia,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    salvarOuAtualizarPagamento(registroCartao);
    await atualizarPagamentoCompleto(registroCartao);

    res.status(201).json({
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor: Number(pagamento.transaction_amount) || valorNumerico
    });
  } catch (erro) {
    console.error("Erro ao criar pagamento com cartão:", erro);
    const status = erro?.status && Number(erro.status) >= 400 ? Number(erro.status) : 500;
    res.status(status).json({
      erro: "Não foi possível processar o cartão.",
      detalhe: erro?.detalhes?.message || erro?.message || "Erro interno.",
      causa: erro?.detalhes?.cause || []
    });
  }
});

app.get("/pagamentos/:id/status", async (req, res) => {
  try {
    const pagamento = await consultarPagamento(req.params.id);
    const anterior = localizarPagamento(req.params.id) || {};
    const registro = {
      ...anterior,
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor: Number(pagamento.transaction_amount) || Number(anterior.valor) || 0,
      atualizadoEm: new Date().toISOString()
    };
    salvarOuAtualizarPagamento(registro);
    await atualizarPagamentoCompleto(registro);

    res.json({
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor: registro.valor,
      aprovado: pagamento.status === "approved"
    });
  } catch (erro) {
    console.error("Erro ao consultar pagamento:", erro);
    res.status(500).json({ erro: "Não foi possível consultar o pagamento." });
  }
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  const pagamentoId = req.body?.data?.id || req.query?.["data.id"] || req.query?.id;
  if (!pagamentoId) return;

  try {
    const pagamento = await consultarPagamento(pagamentoId);
    const anterior = localizarPagamento(pagamentoId) || {};
    const registroWebhook = {
      ...anterior,
      pagamentoId: String(pagamento.id),
      status: pagamento.status,
      statusDetail: pagamento.status_detail,
      valor:
        Number(pagamento.transaction_amount) ||
        Number(anterior.valor) ||
        0,
      atualizadoEm: new Date().toISOString()
    };

    salvarOuAtualizarPagamento(registroWebhook);
    await atualizarPagamentoCompleto(
      registroWebhook
    );

    console.log(
      `Webhook: pagamento ${pagamento.id} = ${pagamento.status}`
    );
  } catch (erro) {
    console.error("Erro no webhook:", erro);
  }
});

app.get("/pagamentos", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT *
      FROM pagamentos
      ORDER BY criado_em DESC, id DESC
    `);

    res.json(
      resultado.rows.map(normalizarPagamentoBanco)
    );
  } catch (erro) {
    console.error(
      "Erro ao listar pagamentos:",
      erro
    );

    res.status(500).json({
      erro: "Não foi possível carregar os pagamentos."
    });
  }
});

async function iniciarServidor() {
  try {
    await iniciarBanco();

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (erro) {
    console.error("Erro ao iniciar o banco PostgreSQL:", erro);
    process.exit(1);
  }
}

iniciarServidor();
