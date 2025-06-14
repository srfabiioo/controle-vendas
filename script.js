// === CONFIGURE AQUI A URL DO SEU APPS SCRIPT ===
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxsIbUe4MIxPiVA828XDsoY4iwLBXv0qY66Bp7ka3e9TI6nfIq0GdzEBEn9Xi9r61K0/exec';

// --- Formulário de Cadastro ---
if (document.getElementById('vendaForm')) {
  const produtoValores = {
    'Oferta Principal Ticket 97': 97,
    'Oferta Principal Ticket 67': 67,
    'Oferta Principal Ticket 47': 47,
    'LTV 1 = Atualizaçao Cadastral Ticket 47': 47,
    'LTV 2 = Blindagem Ticket 53': 53
  };

  document.getElementById('produto').addEventListener('change', function() {
    const valor = produtoValores[this.value] || '';
    document.getElementById('valor').value = valor;
  });

  document.getElementById('vendaForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('button[type="submit"]');
    const dados = {
      colaborador: document.getElementById('colaborador').value,
      produto: document.getElementById('produto').value,
      valor: document.getElementById('valor').value,
      data: document.getElementById('data').value
    };
    // Pop-up de confirmação
    const msg = `Confirma o cadastro da venda?\n\nColaborador: ${dados.colaborador}\nProduto: ${dados.produto}\nValor: R$${dados.valor}\nData: ${dados.data}`;
    if (!confirm(msg)) {
      return;
    }
    // Evitar duplo clique
    submitBtn.disabled = true;
    try {
      const formBody = new URLSearchParams(dados).toString();
      const resp = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: formBody,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const result = await resp.json();
      if (result.result === 'success') {
        alert('Venda cadastrada com sucesso!');
        document.getElementById('vendaForm').reset();
      } else {
        alert('Erro ao cadastrar venda.');
      }
    } catch (err) {
      alert('Erro de conexão.');
    }
    submitBtn.disabled = false;
  });
}

// --- Relatório ---
if (document.getElementById('tabelaVendas')) {
  let vendas = [];
  let vendasFiltradas = [];
  let vendasDoDia = [];

  function calcularRanking(vendasArray) {
    const ranking = {};
    vendasArray.forEach(v => {
      if (!ranking[v.colaborador]) ranking[v.colaborador] = 0;
      ranking[v.colaborador]++;
    });
    // Ordena por mais vendas
    return Object.entries(ranking)
      .sort((a, b) => b[1] - a[1])
      .map(([colaborador, total]) => ({ colaborador, total }));
  }

  function exibirRanking() {
    const rankingDiv = document.getElementById('rankingVendas');
    if (!rankingDiv) return;
    // Ranking mensal
    const rankingMes = calcularRanking(vendasFiltradas);
    // Ranking do dia
    const hoje = new Date();
    const hojeStr = hoje.toISOString().slice(0, 10);
    vendasDoDia = vendasFiltradas.filter(v => {
      const dataVenda = new Date(v.data);
      return dataVenda.toISOString().slice(0, 10) === hojeStr;
    });
    const rankingDia = calcularRanking(vendasDoDia);
    let html = '<div class="ranking-bloco">';
    html += '<h2>Ranking Mensal</h2>';
    if (rankingMes.length === 0) {
      html += '<div class="ranking-vazio">Nenhuma venda no mês.</div>';
    } else {
      html += '<ol class="ranking-lista">';
      rankingMes.forEach(r => {
        html += `<li><b>${r.colaborador}</b>: ${r.total} venda(s)</li>`;
      });
      html += '</ol>';
    }
    html += '<h2>Ranking do Dia</h2>';
    if (rankingDia.length === 0) {
      html += '<div class="ranking-vazio">Nenhuma venda hoje.</div>';
    } else {
      html += '<ol class="ranking-lista">';
      rankingDia.forEach(r => {
        html += `<li><b>${r.colaborador}</b>: ${r.total} venda(s)</li>`;
      });
      html += '</ol>';
    }
    html += '</div>';
    rankingDiv.innerHTML = html;
  }

  async function carregarVendas() {
    try {
      const resp = await fetch(GOOGLE_SCRIPT_URL);
      vendas = await resp.json();
      filtrarVendas();
    } catch (err) {
      document.getElementById('tabelaVendas').querySelector('tbody').innerHTML = '<tr><td colspan="4">Erro ao carregar dados.</td></tr>';
    }
  }

  window.filtrarVendas = function() {
    const colaborador = document.getElementById('colaboradorFiltro').value;
    const produto = document.getElementById('produtoFiltro').value;
    const hoje = new Date();
    // Mostrar apenas o mês atual
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const primeiroDiaMesStr = primeiroDiaMes.toISOString().slice(0, 10);
    const ultimoDiaMesStr = ultimoDiaMes.toISOString().slice(0, 10);
    vendasFiltradas = vendas.filter(v => {
      const dataVenda = new Date(v.data);
      const dataVendaStr = dataVenda.toISOString().slice(0, 10);
      return (
        (!colaborador || v.colaborador === colaborador) &&
        (!produto || v.produto === produto) &&
        dataVendaStr >= primeiroDiaMesStr && dataVendaStr <= ultimoDiaMesStr
      );
    });
    atualizarTabela();
    atualizarCalendario(primeiroDiaMes, ultimoDiaMes);
    exibirRanking();
  }

  function atualizarTabela() {
    const tbody = document.getElementById('tabelaVendas').querySelector('tbody');
    tbody.innerHTML = '';
    if (vendasFiltradas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">Nenhuma venda encontrada.</td></tr>';
      return;
    }
    vendasFiltradas.sort((a, b) => new Date(b.data) - new Date(a.data));
    vendasFiltradas.forEach(v => {
      const dataVenda = new Date(v.data);
      const dataVendaStr = dataVenda.toISOString().slice(0, 10);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${dataVendaStr}</td><td>${v.colaborador}</td><td>${v.produto}</td><td>${v.valor}</td>`;
      tbody.appendChild(tr);
    });
  }

  function atualizarCalendario(primeiroDia, ultimoDia) {
    const calendarioDiv = document.getElementById('calendario');
    calendarioDiv.innerHTML = '';
    let dias = [];
    for (let d = new Date(primeiroDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
      const dataStr = d.toISOString().slice(0, 10);
      const vendasNoDia = vendasFiltradas.filter(v => {
        const dataVenda = new Date(v.data);
        return dataVenda.toISOString().slice(0, 10) === dataStr;
      });
      dias.push({ data: dataStr, vendas: vendasNoDia });
    }
    // Montar o calendário em semanas (7 dias por linha)
    let html = '<div class="calendario-scroll"><table border="1"><tbody>';
    for (let i = 0; i < dias.length; i += 7) {
      html += '<tr>';
      for (let j = 0; j < 7; j++) {
        const dia = dias[i + j];
        if (dia) {
          html += `<td class="calendario-dia"><div class="calendario-data">${dia.data}</div>`;
          if (dia.vendas.length > 0) {
            dia.vendas.forEach(v => {
              html += `<div class="calendario-venda">${v.colaborador}:<br>${v.produto}<br>(R$${v.valor})</div>`;
            });
          } else {
            html += '<div class="calendario-sem">Sem vendas</div>';
          }
          html += '</td>';
        } else {
          html += '<td></td>';
        }
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    calendarioDiv.innerHTML = html;
  }

  carregarVendas();
} 