// ============================================================================
// MOTOR DE IMPORTAÇÃO/EXPORTAÇÃO EXCEL (.XLSX) & PDF + ASSINATURA DIGITAL
// ============================================================================

window.excelSerialToDateString = function (serial) {
  const num = Number(serial);
  if (!isNaN(num) && num > 35000 && num < 65000) {
    const utcDays = Math.floor(num - 25569);
    const dateInfo = new Date(utcDays * 86400 * 1000);
    return dateInfo.toISOString().split('T')[0];
  }
  if (typeof serial === 'string' && serial.trim()) {
    const ptMatch = serial.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ptMatch) {
      return ptMatch[3] + '-' + ptMatch[2].padStart(2, '0') + '-' + ptMatch[1].padStart(2, '0');
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(serial.trim())) {
      return serial.trim().substring(0, 10);
    }
  }
  return new Date().toISOString().split('T')[0];
};

window.autoDetectColumnTarget = function (colName) {
  const up = String(colName || '').trim().toUpperCase();
  if (up.includes('ATIVIDADE') || up.includes('DEMANDA') || up.includes('TAREFA') || up.includes('DESCRI') || up.includes('ITEM')) {
    return 'title';
  }
  if (up === 'COR' || up.includes('STATUS') || up.includes('SITUA')) {
    return 'statusId';
  }
  if (up.includes('INICIAD')) {
    return 'started';
  }
  if (up.includes('FINALIZAD') || (up.includes('CONCLUIDA') && !up.includes('%'))) {
    return 'finished';
  }
  if (up.includes('%') || up.includes('QUALIDADE') || up.includes('PROGRESSO')) {
    return 'progress';
  }
  if (up.includes('RESPONS') || up.includes('CHEFE') || up.includes('ENCARREGADO')) {
    return 'responsibleName';
  }
  if (up.includes('EQUIPE') || up.includes('TIME') || up.includes('SETOR')) {
    return 'teamName';
  }
  if (up.includes('DATA') || up.includes('EXECU')) {
    return 'executionDate';
  }
  if (up.includes('PRAZO') || up.includes('VENCIMENTO')) {
    return 'dueDate';
  }
  if (up.includes('PRIORIDADE')) {
    return 'priorityName';
  }
  if (up.includes('NOTA') || up.includes('OBRA')) {
    return 'serviceNote';
  }
  if (up.includes('OBS') || up.includes('COMENT')) {
    return 'observations';
  }
  return 'custom:' + String(colName || '').trim();
};

window.parseWorkbookToPreviews = function (workbook, existingState) {
  const previews = [];
  const sheetMetaList = (workbook.Workbook && workbook.Workbook.Sheets) || [];

  workbook.SheetNames.forEach((sheetName, idx) => {
    const ws = workbook.Sheets[sheetName];
    if (!ws) return;

    const isHidden = Boolean(sheetMetaList[idx] && sheetMetaList[idx].Hidden);
    const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    let headerRowIndex = 0;
    let bestScore = -1;

    for (let r = 0; r < Math.min(matrix.length, 15); r++) {
      const row = matrix[r] || [];
      const nonEmpty = row.map((c) => String(c || '').trim()).filter(Boolean);
      if (nonEmpty.length < 2) continue;

      let score = nonEmpty.length;
      const joined = nonEmpty.join(' ').toUpperCase();
      if (joined.includes('ATIVIDADE') || joined.includes('DEMANDAS')) score += 12;
      if (joined.includes('INICIADA') || joined.includes('FINALIZADA')) score += 12;
      if (joined.includes('CHEFE DE EQUIPE') || joined.includes('NOTAS')) score += 12;
      if (joined.includes('COR') || joined.includes('STATUS')) score += 6;

      if (score > bestScore) {
        bestScore = score;
        headerRowIndex = r;
      }
    }

    const rawHeaderRow = matrix[headerRowIndex] || [];
    const colIndices = [];

    rawHeaderRow.forEach((cellVal, colIdx) => {
      const cleanName = String(cellVal ?? '').trim();
      if (
        cleanName &&
        !['% FEITO', 'TOTAL', 'FEITO', 'A FAZER'].includes(cleanName.toUpperCase()) &&
        isNaN(Number(cleanName))
      ) {
        colIndices.push({ colIdx, name: cleanName });
      }
    });

    if (colIndices.length === 0) return;

    const detectedColumns = colIndices.map((c) => c.name);
    const columnMapping = {};
    detectedColumns.forEach((col) => {
      columnMapping[col] = window.autoDetectColumnTarget(col);
    });

    const titleCol = detectedColumns.find((c) => columnMapping[c] === 'title') || detectedColumns[0];

    const rows = [];
    for (let r = headerRowIndex + 1; r < matrix.length; r++) {
      const rowArr = matrix[r] || [];
      const rawValues = {};
      colIndices.forEach(({ colIdx, name }) => {
        const val = rowArr[colIdx];
        rawValues[name] = val !== undefined && val !== null ? val : '';
      });

      const candidateTitle = String(rawValues[titleCol] ?? '').trim();
      const upperTitle = candidateTitle.toUpperCase();

      if (
        !candidateTitle ||
        upperTitle.startsWith('TOTAL') ||
        upperTitle === 'MÉDIA' ||
        /^\d+$/.test(candidateTitle)
      ) {
        continue;
      }

      const duplicateTask = existingState.tasks.find((t) => {
        const listObj = existingState.lists.find((l) => l.id === t.listId);
        const sameSheet =
          listObj &&
          ((listObj.origSheetName || '').toUpperCase() === sheetName.trim().toUpperCase() ||
            listObj.name.toUpperCase().includes(sheetName.trim().toUpperCase()));
        return sameSheet && t.title.trim().toUpperCase() === upperTitle;
      });

      rows.push({
        rowNumber: r + 1,
        rawValues,
        mappedTitle: candidateTitle,
        isDuplicate: Boolean(duplicateTask),
        duplicateTaskId: duplicateTask ? duplicateTask.id : undefined,
        skipRow: false,
      });
    }

    previews.push({
      sheetName,
      isHidden,
      selected: rows.length > 0,
      headerRowIndex,
      detectedColumns,
      columnMapping,
      rows,
    });
  });

  return previews;
};

window.exportDatabaseToExcel = function (state, onlyListId) {
  if (typeof XLSX === 'undefined') {
    alert('Biblioteca XLSX ainda está carregando.');
    return;
  }
  const wb = XLSX.utils.book_new();
  const targetLists = onlyListId
    ? state.lists.filter((l) => l.id === onlyListId)
    : state.lists;

  targetLists.forEach((list) => {
    const listTasks = state.tasks.filter((t) => t.listId === list.id);
    const sheetRows = listTasks.map((t) => {
      const status = (state.statuses.find((s) => s.id === t.statusId) || {}).name || 'NÃO INICIADO';
      const priority = (state.priorities.find((p) => p.id === t.priorityId) || {}).name || 'Média';
      const responsible = (state.users.find((u) => u.id === t.responsibleId) || {}).name || '';
      const team = (state.teams.find((tm) => tm.id === t.teamId) || {}).name || '';
      const category = (state.categories.find((c) => c.id === t.categoryId) || {}).name || '';

      const rowObj = {
        ID: t.code,
        'STATUS (COR)': status,
        ATIVIDADE: t.title,
        INICIADA: t.started ? 'SIM' : 'NÃO',
        FINALIZADA: t.finished ? 'SIM' : 'NÃO',
        'CONCLUÍDA EM %': t.progress + '%',
        RESPONSÁVEL: responsible,
        EQUIPE: team,
        CATEGORIA: category,
        PRIORIDADE: priority,
        'DATA DE EXECUÇÃO': t.executionDate || '',
        PRAZO: t.dueDate || '',
        OBSERVAÇÕES: t.observations || '',
      };

      (list.fields || [])
        .filter((f) => !f.isSystemField)
        .forEach((f) => {
          const val = t.customValues ? t.customValues[f.key] : '';
          rowObj[f.name] = Array.isArray(val) ? val.join(', ') : val ?? '';
        });

      return rowObj;
    });

    const ws = XLSX.utils.json_to_sheet(
      sheetRows.length > 0
        ? sheetRows
        : [{ ID: '-', ATIVIDADE: 'Nenhuma tarefa cadastrada nesta lista' }]
    );
    const safeName = String(list.origSheetName || list.name)
      .replace(/[\\/?*[\]:]/g, '')
      .substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName || 'Checklist');
  });

  if (!onlyListId && state.auditLogs && state.auditLogs.length > 0) {
    const auditRows = state.auditLogs.slice(0, 300).map((log) => ({
      'DATA / HORA': new Date(log.timestamp).toLocaleString('pt-BR'),
      USUÁRIO: log.userName,
      AÇÃO: String(log.action || '').toUpperCase(),
      TAREFA: log.taskTitle || '-',
      'CAMPO ALTERADO': log.fieldChanged,
      'VALOR ANTERIOR': log.oldValue,
      'NOVO VALOR': log.newValue,
    }));
    const wsAudit = XLSX.utils.json_to_sheet(auditRows);
    XLSX.utils.book_append_sheet(wb, wsAudit, 'AUDITORIA');
  }

  const fileName = onlyListId
    ? 'Checklist_' + ((targetLists[0] && targetLists[0].origSheetName) || 'Lista') + '_' + new Date().toISOString().slice(0, 10) + '.xlsx'
    : 'CheckFlow_Planilha_Completa_' + new Date().toISOString().slice(0, 10) + '.xlsx';

  XLSX.writeFile(wb, fileName);
};

window.exportListToPdfReport = function (state, listId) {
  const targetList = listId ? state.lists.find((l) => l.id === listId) : null;
  const tasks = listId ? state.tasks.filter((t) => t.listId === listId) : state.tasks;
  const doneCount = tasks.filter((t) => t.finished || t.statusId === 'st_concluido').length;
  const partialCount = tasks.filter((t) => !t.finished && t.started).length;
  const avgPct = tasks.length ? Math.round(tasks.reduce((a, b) => a + (Number(b.progress) || 0), 0) / tasks.length) : 0;

  const printWin = window.open('', '_blank', 'width=1080,height=800');
  if (!printWin) {
    alert('Permita pop-ups para gerar o relatório PDF.');
    return;
  }

  const rowsHtml = tasks
    .map((t) => {
      const st = state.statuses.find((s) => s.id === t.statusId) || { name: 'NÃO INICIADO', color: '#ef4444' };
      const resp = (state.users.find((u) => u.id === t.responsibleId) || {}).name || '-';
      const team = (state.teams.find((tm) => tm.id === t.teamId) || {}).name || '-';
      const cat = (state.categories.find((c) => c.id === t.categoryId) || {}).name || '-';
      return `
        <tr>
          <td style="font-family:monospace;font-weight:600;">${t.code}</td>
          <td><span style="display:inline-block;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;color:#fff;background:${st.color};">${st.name}</span></td>
          <td style="font-weight:600;">${t.title}</td>
          <td style="text-align:center;">${t.started ? 'SIM' : 'NÃO'}</td>
          <td style="text-align:center;">${t.finished ? 'SIM' : 'NÃO'}</td>
          <td style="text-align:center;font-weight:700;">${t.progress}%</td>
          <td>${resp}</td>
          <td>${team}</td>
          <td>${cat}</td>
          <td>${t.dueDate || '-'}</td>
        </tr>
      `;
    })
    .join('');

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Relatório Executivo PDF — ${targetList ? targetList.name : 'Todas as Listas'}</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; color: #0f172a; margin: 28px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #10b981; padding-bottom: 14px; margin-bottom: 18px; }
        .title { font-size: 20px; font-weight: 800; color: #0f172a; }
        .subtitle { font-size: 12px; color: #475569; margin-top: 4px; }
        .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .kpi { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; background: #f8fafc; }
        .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; }
        .kpi-val { font-size: 22px; font-weight: 800; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #11141b; color: #fff; text-align: left; padding: 8px; text-transform: uppercase; font-size: 10px; }
        td { border-bottom: 1px solid #e2e8f0; padding: 7px 8px; }
        tr:nth-child(even) { background: #f8fafc; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom:16px;display:flex;gap:10px;">
        <button onclick="window.print()" style="background:#10b981;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:700;cursor:pointer;">🖨️ Salvar em PDF / Imprimir Agora</button>
        <button onclick="window.close()" style="background:#334155;color:#fff;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;">Fechar</button>
      </div>
      <div class="header">
        <div>
          <div class="title">${state.settings.systemName}</div>
          <div class="subtitle">Relatório: <strong>${targetList ? targetList.name : 'Consolidado Geral (Todas as Listas)'}</strong> • Emitido em ${new Date().toLocaleString('pt-BR')}</div>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="kpi-label">Total de Tarefas</div><div class="kpi-val">${tasks.length}</div></div>
        <div class="kpi"><div class="kpi-label">Concluídas</div><div class="kpi-val" style="color:#10b981;">${doneCount}</div></div>
        <div class="kpi"><div class="kpi-label">Em Andamento / Parciais</div><div class="kpi-val" style="color:#f97316;">${partialCount}</div></div>
        <div class="kpi"><div class="kpi-label">Média de Conclusão</div><div class="kpi-val" style="color:#2563eb;">${avgPct}%</div></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Status</th>
            <th>Atividade / Demanda</th>
            <th>Iniciada</th>
            <th>Finalizada</th>
            <th>% Concl.</th>
            <th>Responsável</th>
            <th>Equipe</th>
            <th>Categoria</th>
            <th>Prazo</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <script>setTimeout(() => { window.print(); }, 350);<\/script>
    </body>
    </html>
  `);
  printWin.document.close();
};

// Componente React de Assinatura Digital em Canvas HTML5
window.SignaturePadCanvas = function ({ value, onChange, disabled }) {
  const canvasRef = React.useRef(null);
  const [drawing, setDrawing] = React.useState(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [value]);

  const getCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleStart = (e) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  };

  const handleMove = (e) => {
    if (!drawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleEnd = () => {
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    onChange('');
  };

  if (value) {
    return React.createElement(
      'div',
      { className: 'rounded-xl border border-emerald-500/40 bg-[#0b0d11] p-3 flex flex-col items-center gap-2' },
      React.createElement('img', { src: value, alt: 'Assinatura Digital', className: 'max-h-24 object-contain' }),
      !disabled &&
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: handleClear,
            className: 'text-xs text-orange-400 hover:text-orange-300 underline font-medium',
          },
          'Limpar e assinar novamente'
        )
    );
  }

  return React.createElement(
    'div',
    { className: 'rounded-xl border border-slate-700/80 bg-[#0b0d11] p-2' },
    React.createElement('canvas', {
      ref: canvasRef,
      width: 440,
      height: 110,
      onMouseDown: handleStart,
      onMouseMove: handleMove,
      onMouseUp: handleEnd,
      onMouseLeave: handleEnd,
      onTouchStart: handleStart,
      onTouchMove: handleMove,
      onTouchEnd: handleEnd,
      className: 'w-full h-[110px] rounded-lg bg-[#0f131a] cursor-crosshair',
    }),
    React.createElement(
      'div',
      { className: 'flex justify-between items-center pt-1.5 px-1 text-[11px] text-slate-400' },
      React.createElement('span', null, 'Assine no quadro acima usando o mouse ou tela touch'),
      React.createElement(
        'button',
        { type: 'button', onClick: handleClear, className: 'text-orange-400 hover:text-orange-300 font-medium' },
        'Limpar quadro'
      )
    )
  );
};
