import * as XLSX from 'xlsx';
import {
  DatabaseState,
  DynamicList,
  TaskItem,
  CustomFieldDefinition,
} from '../types/schema';

export interface ParsedSheetPreview {
  sheetName: string;
  isHidden: boolean;
  selected: boolean;
  headerRowIndex: number;
  detectedColumns: string[];
  columnMapping: Record<string, string>; // nomeColunaExcel -> keyCampoSistema ('title' | 'status' | 'started' | 'finished' | 'progress' | 'responsible' | 'date' | 'serviceNote' | 'custom:...')
  rows: Array<{
    rowNumber: number;
    rawValues: Record<string, any>;
    mappedTitle: string;
    isDuplicate: boolean;
    duplicateTaskId?: string;
    skipRow: boolean;
  }>;
}

// Converte serial de data do Excel (ex: 46031 -> 2026-01-09) para YYYY-MM-DD
export function excelSerialToDateString(serial: any): string {
  const num = Number(serial);
  if (!isNaN(num) && num > 35000 && num < 65000) {
    const utcDays = Math.floor(num - 25569);
    const dateInfo = new Date(utcDays * 86400 * 1000);
    return dateInfo.toISOString().split('T')[0];
  }
  if (typeof serial === 'string' && serial.trim()) {
    const ptMatch = serial.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ptMatch) {
      return `${ptMatch[3]}-${ptMatch[2].padStart(2, '0')}-${ptMatch[1].padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(serial.trim())) {
      return serial.trim().substring(0, 10);
    }
  }
  return new Date().toISOString().split('T')[0];
}

// Auto-detecta para qual campo do sistema uma coluna do Excel aponta
export function autoDetectColumnTarget(colName: string): string {
  const up = colName.trim().toUpperCase();
  if (up.includes('ATIVIDADE') || up.includes('DEMANDA') || up.includes('TAREFA') || up.includes('DESCRI') || up.includes('ITEM')) {
    return 'title';
  }
  if (up === 'COR' || up.includes('STATUS') || up.includes('SITUA')) {
    return 'statusId';
  }
  if (up.includes('INICIAD')) {
    return 'started';
  }
  if (up.includes('FINALIZAD') || up.includes('CONCLUIDA') && !up.includes('%')) {
    return 'finished';
  }
  if (up.includes('%') || up.includes('QUALIDADE') || up.includes('CONCLUIDA EM %') || up.includes('PROGRESSO')) {
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
  if (up.includes('NOTA') || up.includes('OBRA') || up.includes('OS')) {
    return 'serviceNote';
  }
  if (up.includes('OBS') || up.includes('COMENT')) {
    return 'observations';
  }
  return `custom:${colName.trim()}`;
}

export function parseWorkbookToPreviews(
  workbook: XLSX.WorkBook,
  existingState: DatabaseState
): ParsedSheetPreview[] {
  const previews: ParsedSheetPreview[] = [];
  const sheetMetaList = workbook.Workbook?.Sheets || [];

  workbook.SheetNames.forEach((sheetName, idx) => {
    const ws = workbook.Sheets[sheetName];
    if (!ws) return;

    const isHidden = Boolean(sheetMetaList[idx]?.Hidden);
    const matrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Localiza a linha de cabeçalho principal (procura por palavras-chave como ATIVIDADE, DEMANDAS, COR, INICIADA, NOTAS, etc.)
    let headerRowIndex = 0;
    let bestScore = -1;

    for (let r = 0; r < Math.min(matrix.length, 15); r++) {
      const row = matrix[r] || [];
      const nonEmpty = row.map((c) => String(c || '').trim()).filter(Boolean);
      if (nonEmpty.length < 2) continue;

      let score = nonEmpty.length;
      const joined = nonEmpty.join(' ').toUpperCase();
      if (joined.includes('ATIVIDADE') || joined.includes('DEMANDAS')) score += 10;
      if (joined.includes('INICIADA') || joined.includes('FINALIZADA')) score += 10;
      if (joined.includes('CHEFE DE EQUIPE') || joined.includes('NOTAS')) score += 10;
      if (joined.includes('COR') || joined.includes('STATUS')) score += 5;

      if (score > bestScore) {
        bestScore = score;
        headerRowIndex = r;
      }
    }

    const rawHeaderRow = matrix[headerRowIndex] || [];
    const colIndices: Array<{ colIdx: number; name: string }> = [];

    rawHeaderRow.forEach((cellVal, colIdx) => {
      const cleanName = String(cellVal ?? '').trim();
      // Ignora KPIs laterais (ex: H5 "% FEITO", I5 "0.5" na aba LIST 03)
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
    const columnMapping: Record<string, string> = {};
    detectedColumns.forEach((col) => {
      columnMapping[col] = autoDetectColumnTarget(col);
    });

    const titleCol =
      detectedColumns.find((c) => columnMapping[c] === 'title') || detectedColumns[0];

    const rows: ParsedSheetPreview['rows'] = [];
    for (let r = headerRowIndex + 1; r < matrix.length; r++) {
      const rowArr = matrix[r] || [];
      const rawValues: Record<string, any> = {};
      let hasMeaningfulText = false;

      colIndices.forEach(({ colIdx, name }) => {
        const val = rowArr[colIdx];
        rawValues[name] = val !== undefined && val !== null ? val : '';
      });

      const candidateTitle = String(rawValues[titleCol] ?? '').trim();
      const upperTitle = candidateTitle.toUpperCase();

      // Filtra linhas de rodapé de fórmula ("TOTAL EM %", "TOTAL =") ou linhas vazias de template (onde não há título de atividade)
      if (
        !candidateTitle ||
        upperTitle.startsWith('TOTAL') ||
        upperTitle === 'MÉDIA' ||
        /^\d+$/.test(candidateTitle)
      ) {
        continue;
      }

      hasMeaningfulText = true;
      if (!hasMeaningfulText) continue;

      // Verifica se já existe tarefa com mesmo título na mesma aba/lista
      const duplicateTask = existingState.tasks.find(
        (t) =>
          t.title.trim().toUpperCase() === upperTitle &&
          existingState.lists.find((l) => l.id === t.listId)?.origSheetName?.toUpperCase() ===
            sheetName.trim().toUpperCase()
      );

      rows.push({
        rowNumber: r + 1,
        rawValues,
        mappedTitle: candidateTitle,
        isDuplicate: Boolean(duplicateTask),
        duplicateTaskId: duplicateTask?.id,
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
}

export function exportDatabaseToExcel(state: DatabaseState, onlyListId?: string) {
  const wb = XLSX.utils.book_new();
  const targetLists = onlyListId
    ? state.lists.filter((l) => l.id === onlyListId)
    : state.lists;

  targetLists.forEach((list) => {
    const listTasks = state.tasks.filter((t) => t.listId === list.id);
    const sheetRows = listTasks.map((t) => {
      const status = state.statuses.find((s) => s.id === t.statusId)?.name || 'NÃO INICIADO';
      const priority = state.priorities.find((p) => p.id === t.priorityId)?.name || 'Média';
      const responsible = state.users.find((u) => u.id === t.responsibleId)?.name || '';
      const team = state.teams.find((tm) => tm.id === t.teamId)?.name || '';
      const category = state.categories.find((c) => c.id === t.categoryId)?.name || '';

      const baseObj: Record<string, any> = {
        ID: t.code,
        'STATUS (COR)': status,
        ATIVIDADE: t.title,
        INICIADA: t.started ? 'SIM' : 'NÃO',
        FINALIZADA: t.finished ? 'SIM' : 'NÃO',
        'CONCLUÍDA EM %': `${t.progress}%`,
        RESPONSÁVEL: responsible,
        EQUIPE: team,
        CATEGORIA: category,
        PRIORIDADE: priority,
        'DATA DE EXECUÇÃO': t.executionDate || '',
        PRAZO: t.dueDate || '',
        OBSERVAÇÕES: t.observations || '',
      };

      // Inclui também todos os campos personalizados da lista
      list.fields
        .filter((f) => !f.isSystemField)
        .forEach((f) => {
          const val = t.customValues?.[f.key];
          baseObj[f.name] = Array.isArray(val) ? val.join(', ') : val ?? '';
        });

      return baseObj;
    });

    const ws = XLSX.utils.json_to_sheet(
      sheetRows.length > 0
        ? sheetRows
        : [{ ID: '-', ATIVIDADE: 'Nenhuma tarefa cadastrada nesta lista' }]
    );
    const safeName = (list.origSheetName || list.name)
      .replace(/[\\/?*[\]:]/g, '')
      .substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName || 'Checklist');
  });

  // Aba extra de Auditoria se estiver exportando banco completo
  if (!onlyListId && state.auditLogs.length > 0) {
    const auditRows = state.auditLogs.slice(0, 250).map((log) => ({
      'DATA / HORA': new Date(log.timestamp).toLocaleString('pt-BR'),
      USUÁRIO: log.userName,
      AÇÃO: log.action.toUpperCase(),
      TAREFA: log.taskTitle || '-',
      'CAMPO ALTERADO': log.fieldChanged,
      'VALOR ANTERIOR': log.oldValue,
      'NOVO VALOR': log.newValue,
    }));
    const wsAudit = XLSX.utils.json_to_sheet(auditRows);
    XLSX.utils.book_append_sheet(wb, wsAudit, 'AUDITORIA');
  }

  const fileName = onlyListId
    ? `Checklist_${targetLists[0]?.origSheetName || 'Lista'}_${new Date().toISOString().slice(0, 10)}.xlsx`
    : `CheckFlow_Planilha_Completa_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
