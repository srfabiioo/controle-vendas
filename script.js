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
    const quantidade = parseInt(document.getElementById('quantidade').value);
    
    // Pop-up de confirmação
    const msg = `Confirma o cadastro?\n\nData: ${document.getElementById('data').value}\nColaborador: ${document.getElementById('colaborador').value}\nProduto: ${document.getElementById('produto').value}\nQuantidade: ${quantidade}`;
    if (!confirm(msg)) {
      return;
    }

    // Evitar duplo clique
    submitBtn.disabled = true;
    try {
      let successCount = 0;
      for (let i = 0; i < quantidade; i++) {
        const dados = {
          colaborador: document.getElementById('colaborador').value,
          produto: document.getElementById('produto').value,
          valor: document.getElementById('valor').value,
          data: document.getElementById('data').value
        };
        
        const formBody = new URLSearchParams(dados).toString();
        const resp = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          body: formBody,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const result = await resp.json();
        if (result.result === 'success') {
          successCount++;
        }
      }
      
      if (successCount === quantidade) {
        alert(`${quantidade} venda(s) cadastrada(s) com sucesso!`);
        document.getElementById('vendaForm').reset();
        document.getElementById('quantidade').value = 1;
      } else {
        alert(`Erro ao cadastrar algumas vendas. ${successCount} de ${quantidade} vendas foram cadastradas.`);
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
    // Ranking mensal e diário separados
    let dataSelecionada = document.getElementById('dataRanking')?.value;
    if (!dataSelecionada) {
      const hoje = new Date();
      dataSelecionada = hoje.toISOString().slice(0, 10);
      if(document.getElementById('dataRanking')) document.getElementById('dataRanking').value = dataSelecionada;
    }

    // Separar vendas
    const is97 = v => v.produto === 'Oferta Principal Ticket 97';
    const vendasPeriodo97 = vendasFiltradas.filter(is97);
    const vendasPeriodoOutros = vendasFiltradas.filter(v => !is97(v));
    const vendasDiario97 = vendasFiltradas.filter(v => new Date(v.data).toISOString().slice(0, 10) === dataSelecionada);
    const vendasDiarioOutros = vendasFiltradas.filter(v => new Date(v.data).toISOString().slice(0, 10) === dataSelecionada);

    // Calcular rankings
    const rankingPeriodo97 = calcularRanking(vendasPeriodo97);
    const rankingPeriodoOutros = calcularRanking(vendasPeriodoOutros);
    const rankingDiario97 = calcularRanking(vendasDiario97);
    const rankingDiarioOutros = calcularRanking(vendasDiarioOutros);

    // Função para montar HTML do ranking
    function htmlRanking(titulo, ranking, data = null) {
      let html = `<div class='ranking-bloco'><h2>${titulo}${data ? ' ('+data+')' : ''}</h2>`;
      if (ranking.length === 0) {
        html += '<div class="ranking-vazio">Nenhuma venda.</div>';
      } else {
        html += '<ol class="ranking-lista">';
        ranking.forEach(r => {
          html += `<li><b>${r.colaborador}</b>: ${r.total} venda(s)</li>`;
        });
        html += '</ol>';
      }
      html += '</div>';
      return html;
    }

    // Preencher as divs
    document.getElementById('rankingPeriodo97').innerHTML = htmlRanking('Ranking do Período (Oferta de 97)', rankingPeriodo97);
    document.getElementById('rankingPeriodoOutros').innerHTML = htmlRanking('Ranking do Período (Demais Ofertas)', rankingPeriodoOutros);
    document.getElementById('rankingDiario97').innerHTML = htmlRanking('Ranking Diário da Oferta de 97', rankingDiario97, dataSelecionada);
    document.getElementById('rankingDiarioOutros').innerHTML = htmlRanking('Ranking Diário das Demais Ofertas', rankingDiarioOutros, dataSelecionada);
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
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;

    vendasFiltradas = vendas.filter(v => {
      const dataVendaStr = new Date(v.data).toISOString().slice(0, 10);
      
      let noPeriodo = true;
      if (dataInicio && dataFim) {
        noPeriodo = dataVendaStr >= dataInicio && dataVendaStr <= dataFim;
      } else if (dataInicio) {
        noPeriodo = dataVendaStr >= dataInicio;
      } else if (dataFim) {
        noPeriodo = dataVendaStr <= dataFim;
      } else {
        // Padrão: ano atual
        const hoje = new Date();
        const primeiroDiaAno = new Date(hoje.getFullYear(), 0, 1).toISOString().slice(0, 10);
        const ultimoDiaAno = new Date(hoje.getFullYear(), 11, 31).toISOString().slice(0, 10);
        noPeriodo = dataVendaStr >= primeiroDiaAno && dataVendaStr <= ultimoDiaAno;
      }

      return (
        (!colaborador || v.colaborador === colaborador) &&
        (!produto || v.produto === produto) &&
        noPeriodo
      );
    });
    
    let primeiroDiaParaCalendario, ultimoDiaParaCalendario;
    if (dataInicio && dataFim) {
      // Adiciona 'T00:00:00' para evitar problemas de fuso horário
      primeiroDiaParaCalendario = new Date(dataInicio + 'T00:00:00');
      ultimoDiaParaCalendario = new Date(dataFim + 'T00:00:00');
    } else {
      // Se não houver intervalo, exibe o mês atual no calendário
      const hoje = new Date();
      primeiroDiaParaCalendario = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      ultimoDiaParaCalendario = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    }

    atualizarTabela();
    atualizarCalendario(primeiroDiaParaCalendario, ultimoDiaParaCalendario);
    exibirRanking();
  }

  function atualizarTabela() {
    const tbody = document.getElementById('tabelaVendas').querySelector('tbody');
    tbody.innerHTML = '';
    if (vendasFiltradas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">Nenhuma venda encontrada.</td></tr>';
      return;
    }
    // Agrupar vendas por data, colaborador e produto
    const agrupadas = {};
    vendasFiltradas.forEach(v => {
      const dataVenda = new Date(v.data).toISOString().slice(0, 10);
      const chave = `${dataVenda}|${v.colaborador}|${v.produto}`;
      if (!agrupadas[chave]) {
        agrupadas[chave] = { data: dataVenda, colaborador: v.colaborador, produto: v.produto, quantidade: 0 };
      }
      agrupadas[chave].quantidade++;
    });
    // Exibir linhas agrupadas
    Object.values(agrupadas).forEach(v => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${v.data}</td><td>${v.colaborador}</td><td>${v.produto}</td><td>${v.quantidade}</td>`;
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