// === CONFIGURE AQUI A URL DO SEU APPS SCRIPT ===
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxsIbUe4MIxPiVA828XDsoY4iwLBXv0qY66Bp7ka3e9TI6nfIq0GdzEBEn9Xi9r61K0/exec';

// === UTILITÁRIOS ===
function showMessage(message, type = 'success') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `${type}-message fade-in`;
  messageDiv.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    ${message}
  `;
  
  // Remove mensagens anteriores
  const existingMessages = document.querySelectorAll('.success-message, .error-message');
  existingMessages.forEach(msg => msg.remove());
  
  // Adiciona nova mensagem
  const container = document.querySelector('.container');
  container.insertBefore(messageDiv, container.firstChild);
  
  // Remove após 5 segundos
  setTimeout(() => {
    messageDiv.remove();
  }, 5000);
}

function setLoading(element, loading = true) {
  if (loading) {
    element.classList.add('loading');
    element.disabled = true;
  } else {
    element.classList.remove('loading');
    element.disabled = false;
  }
}

// === FORMULÁRIO DE CADASTRO ===
if (document.getElementById('vendaForm')) {
  const produtoValores = {
    'Oferta Principal Ticket 97': 97,
    'Oferta Principal Ticket 67': 67,
    'Oferta Principal Ticket 47': 47,
    'LTV 1 = Ticket 47': 47,
    'LTV 2 = Ticket 53': 53
  };

  // Atualizar valor automaticamente
  document.getElementById('produto').addEventListener('change', function() {
    const valor = produtoValores[this.value] || '';
    document.getElementById('valor').value = valor;
  });

  // Definir data atual por padrão
  document.getElementById('data').value = new Date().toISOString().slice(0, 10);

  // Submissão do formulário
  document.getElementById('vendaForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const quantidade = parseInt(document.getElementById('quantidade').value);
    const colaborador = document.getElementById('colaborador').value;
    const produto = document.getElementById('produto').value;
    const data = document.getElementById('data').value;
    
    // Validações
    if (!colaborador || !produto || !data) {
      showMessage('Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }
    
    // Pop-up de confirmação melhorado
    const msg = `Confirma o cadastro?\n\n📅 Data: ${data}\n👤 Colaborador: ${colaborador}\n📦 Produto: ${produto}\n🔢 Quantidade: ${quantidade}`;
    if (!confirm(msg)) {
      return;
    }

    // Feedback visual de carregamento
    setLoading(submitBtn, true);
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
    
    try {
      let successCount = 0;
      const totalVendas = quantidade;
      
      for (let i = 0; i < quantidade; i++) {
        const dados = {
          colaborador: colaborador,
          produto: produto,
          valor: document.getElementById('valor').value,
          data: data
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
      
      if (successCount === totalVendas) {
        showMessage(`✅ ${totalVendas} venda(s) cadastrada(s) com sucesso!`);
        document.getElementById('vendaForm').reset();
        document.getElementById('quantidade').value = 1;
        document.getElementById('data').value = new Date().toISOString().slice(0, 10);
      } else {
        showMessage(`⚠️ Erro ao cadastrar algumas vendas. ${successCount} de ${totalVendas} vendas foram cadastradas.`, 'error');
      }
    } catch (err) {
      showMessage('❌ Erro de conexão. Verifique sua internet e tente novamente.', 'error');
      console.error('Erro:', err);
    } finally {
      setLoading(submitBtn, false);
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Cadastrar Venda';
    }
  });
}

// === RELATÓRIO ===
if (document.getElementById('tabelaVendas')) {
  let vendas = [];
  let vendasFiltradas = [];

  function calcularRanking(vendasArray) {
    const ranking = {};
    vendasArray.forEach(v => {
      if (!ranking[v.colaborador]) ranking[v.colaborador] = 0;
      ranking[v.colaborador]++;
    });
    
    return Object.entries(ranking)
      .sort((a, b) => b[1] - a[1])
      .map(([colaborador, total], index) => ({ 
        colaborador, 
        total, 
        position: index + 1 
      }));
  }

  function exibirRanking() {
    // Separar vendas para o Ranking do Período
    const is97 = v => v.produto === 'Oferta Principal Ticket 97';
    const vendasPeriodo97 = vendasFiltradas.filter(is97);
    const vendasPeriodoOutros = vendasFiltradas.filter(v => !is97(v));
    
    // Calcular rankings
    const rankingPeriodo97 = calcularRanking(vendasPeriodo97);
    const rankingPeriodoOutros = calcularRanking(vendasPeriodoOutros);

    // Função para montar HTML do ranking moderno
    function htmlRanking(titulo, ranking, icon) {
      let html = `
        <div class="ranking-card">
          <h3 class="ranking-title">
            <i class="fas fa-${icon}"></i>
            ${titulo}
          </h3>
      `;
      
      if (ranking.length === 0) {
        html += `
          <div class="text-center text-muted">
            <i class="fas fa-inbox fa-2x mb-md"></i>
            <p>Nenhuma venda encontrada</p>
          </div>
        `;
      } else {
        html += '<ul class="ranking-list">';
        ranking.forEach(r => {
          const medalIcon = r.position === 1 ? 'fa-medal' : 
                           r.position === 2 ? 'fa-medal' : 
                           r.position === 3 ? 'fa-medal' : 'fa-user';
          const medalColor = r.position === 1 ? '#FFD700' : 
                           r.position === 2 ? '#C0C0C0' : 
                           r.position === 3 ? '#CD7F32' : 'var(--primary-color)';
          
          html += `
            <li class="ranking-item">
              <div class="ranking-position">
                <i class="fas ${medalIcon}" style="color: ${medalColor};"></i>
                ${r.position}º
              </div>
              <div class="ranking-name">${r.colaborador}</div>
              <div class="ranking-count">${r.total} venda(s)</div>
            </li>
          `;
        });
        html += '</ul>';
      }
      html += '</div>';
      return html;
    }

    // Preencher as divs
    document.getElementById('rankingPeriodo97').innerHTML = htmlRanking(
      'Ranking - Oferta 97', 
      rankingPeriodo97, 
      'trophy'
    );
    document.getElementById('rankingPeriodoOutros').innerHTML = htmlRanking(
      'Ranking - Demais Ofertas', 
      rankingPeriodoOutros, 
      'star'
    );
  }

  async function carregarVendas() {
    try {
      const resp = await fetch(GOOGLE_SCRIPT_URL);
      vendas = await resp.json();
      filtrarVendas();
    } catch (err) {
      showMessage('❌ Erro ao carregar dados. Verifique sua conexão.', 'error');
      document.getElementById('tabelaVendas').querySelector('tbody').innerHTML = 
        '<tr><td colspan="4" class="text-center text-muted">Erro ao carregar dados.</td></tr>';
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
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted">
            <i class="fas fa-search fa-2x mb-md"></i>
            <p>Nenhuma venda encontrada para os filtros aplicados.</p>
          </td>
        </tr>
      `;
      return;
    }
    
    // Agrupar vendas por data, colaborador e produto
    const agrupadas = {};
    vendasFiltradas.forEach(v => {
      const dataVenda = new Date(v.data).toISOString().slice(0, 10);
      const chave = `${dataVenda}|${v.colaborador}|${v.produto}`;
      if (!agrupadas[chave]) {
        agrupadas[chave] = { 
          data: dataVenda, 
          colaborador: v.colaborador, 
          produto: v.produto, 
          quantidade: 0 
        };
      }
      agrupadas[chave].quantidade++;
    });
    
    // Exibir linhas agrupadas
    Object.values(agrupadas).forEach(v => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><i class="fas fa-calendar-day"></i> ${v.data}</td>
        <td><i class="fas fa-user"></i> ${v.colaborador}</td>
        <td><i class="fas fa-box"></i> ${v.produto}</td>
        <td><span class="ranking-count">${v.quantidade}</span></td>
      `;
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
    let html = '<table class="calendar-table"><tbody>';
    for (let i = 0; i < dias.length; i += 7) {
      html += '<tr>';
      for (let j = 0; j < 7; j++) {
        const dia = dias[i + j];
        if (dia) {
          const dataFormatada = new Date(dia.data).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit'
          });
          
          html += `<td class="calendar-day">
            <div class="calendar-date">${dataFormatada}</div>`;
          
          if (dia.vendas.length > 0) {
            // Agrupar vendas por colaborador
            const vendasPorColaborador = {};
            dia.vendas.forEach(v => {
              if (!vendasPorColaborador[v.colaborador]) {
                vendasPorColaborador[v.colaborador] = [];
              }
              vendasPorColaborador[v.colaborador].push(v);
            });
            
            Object.entries(vendasPorColaborador).forEach(([colaborador, vendas]) => {
              const totalVendas = vendas.length;
              html += `<div class="calendar-sale">
                <strong>${colaborador}</strong><br>
                ${totalVendas} venda(s)
              </div>`;
            });
          } else {
            html += '<div class="calendar-empty">Sem vendas</div>';
          }
          html += '</td>';
        } else {
          html += '<td></td>';
        }
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    calendarioDiv.innerHTML = html;
  }

  // Carregar dados ao iniciar
  carregarVendas();
} 