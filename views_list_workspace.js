// ============================================================================
// MÓDULO 2: VISUALIZAÇÃO DA LISTA (TABELA INLINE, KANBAN, CALENDÁRIO, CHECKLIST)
//           + EDIÇÃO EM MASSA + MODAL COMPLETO DE TAREFA COM ASSINATURA/ANEXOS
// ============================================================================

window.ListWorkspaceView = function ({
  db,
  activeList,
  viewMode,
  setViewMode,
  onUpdateTask,
  onCreateTask,
  onDuplicateTask,
  onDeleteTask,
  onBulkUpdateTasks,
  onBulkDeleteTasks,
  onUpdateList,
  onOpenTaskModal,
  onOpenBuilder,
  onExportExcel,
  onExportPdf,
  onAddStatusQuick,
  showToast,
}) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('ALL');
  const [filterPriority, setFilterPriority] = React.useState('ALL');
  const [filterResponsible, setFilterResponsible] = React.useState('ALL');
  const [filterCategory, setFilterCategory] = React.useState('ALL');
  const [filterTeam, setFilterTeam] = React.useState('ALL');
  const [onlyOverdue, setOnlyOverdue] = React.useState(false);

  // Ordenação da Tabela
  const [sortConfig, setSortConfig] = React.useState({ key: 'code', dir: 'asc' });

  // Seleção múltipla e Edição Simultânea em Massa
  const [selectedTaskIds, setSelectedTaskIds] = React.useState([]);
  const [bulkPatch, setBulkPatch] = React.useState({
    statusId: '',
    priorityId: '',
    responsibleId: '',
    teamId: '',
    categoryId: '',
    dueDate: '',
  });

  // Popover de Colunas Visíveis e Nova Coluna Rápida na Tabela
  const [showColumnMenu, setShowColumnMenu] = React.useState(false);
  const [showQuickAddCol, setShowQuickAddCol] = React.useState(false);
  const [quickColName, setQuickColName] = React.useState('');
  const [quickColType, setQuickColType] = React.useState('short_text');
  const [quickColOptions, setQuickColOptions] = React.useState('Opção A, Opção B');
  const [activeHeaderMenuId, setActiveHeaderMenuId] = React.useState(null);

  // Adição rápida de tarefa na linha inferior
  const [quickTaskTitle, setQuickTaskTitle] = React.useState('');

  // Kanban Drag & Drop e Agrupamento
  const [kanbanGroupBy, setKanbanGroupBy] = React.useState('status');
  const [draggedTaskId, setDraggedTaskId] = React.useState(null);

  // Calendário Mensal
  const [calendarMonthOffset, setCalendarMonthOffset] = React.useState(0);

  React.useEffect(() => {
    setSelectedTaskIds([]);
  }, [activeList?.id]);

  const todayStr = new Date().toISOString().split('T')[0];

  const allListFields = React.useMemo(
    () => [...(activeList?.fields || [])].sort((a, b) => a.order - b.order),
    [activeList?.fields]
  );

  const visibleFields = React.useMemo(
    () => allListFields.filter((f) => f.visible !== false),
    [allListFields]
  );

  const listTasks = React.useMemo(() => {
    if (!activeList) return [];
    let items = db.tasks.filter((t) => t.listId === activeList.id);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (t) =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.code || '').toLowerCase().includes(q) ||
          (t.observations || '').toLowerCase().includes(q) ||
          (t.serviceNote || '').toLowerCase().includes(q) ||
          JSON.stringify(t.customValues || {}).toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'ALL') items = items.filter((t) => t.statusId === filterStatus);
    if (filterPriority !== 'ALL') items = items.filter((t) => t.priorityId === filterPriority);
    if (filterResponsible !== 'ALL') items = items.filter((t) => t.responsibleId === filterResponsible);
    if (filterCategory !== 'ALL') items = items.filter((t) => t.categoryId === filterCategory);
    if (filterTeam !== 'ALL') items = items.filter((t) => t.teamId === filterTeam);
    if (onlyOverdue) {
      items = items.filter((t) => !t.finished && t.statusId !== 'st_concluido' && t.dueDate && t.dueDate < todayStr);
    }

    items.sort((a, b) => {
      const k = sortConfig.key;
      const valA = a[k] !== undefined ? a[k] : (a.customValues && a.customValues[k]) || '';
      const valB = b[k] !== undefined ? b[k] : (b.customValues && b.customValues[k]) || '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.dir === 'asc' ? valA - valB : valB - valA;
      }
      return sortConfig.dir === 'asc'
        ? String(valA).localeCompare(String(valB), 'pt-BR', { numeric: true })
        : String(valB).localeCompare(String(valA), 'pt-BR', { numeric: true });
    });

    return items;
  }, [
    db.tasks,
    activeList?.id,
    searchQuery,
    filterStatus,
    filterPriority,
    filterResponsible,
    filterCategory,
    filterTeam,
    onlyOverdue,
    sortConfig,
    todayStr,
  ]);

  // Estatísticas rápidas da Lista Atual (Estilo cabeçalho LIST 03: TOTAL, FEITO, A FAZER, % FEITO)
  const listStats = React.useMemo(() => {
    const total = listTasks.length;
    const done = listTasks.filter((t) => t.finished || t.statusId === 'st_concluido').length;
    const partial = listTasks.filter((t) => !t.finished && t.started).length;
    const todo = Math.max(0, total - done);
    const avgPct = total
      ? Math.round(listTasks.reduce((acc, t) => acc + (Number(t.progress) || 0), 0) / total)
      : 0;
    const startedPct = total ? Math.round((listTasks.filter((t) => t.started).length / total) * 100) : 0;
    const finishedPct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, partial, todo, avgPct, startedPct, finishedPct };
  }, [listTasks]);

  if (!activeList) return null;

  const toggleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.length === listTasks.length && listTasks.length > 0) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(listTasks.map((t) => t.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApplyBulkEdit = () => {
    const cleanPatch = {};
    Object.entries(bulkPatch).forEach(([k, v]) => {
      if (v !== '') cleanPatch[k] = v;
    });
    if (Object.keys(cleanPatch).length === 0) {
      showToast('Selecione ao menos um campo para aplicar na edição simultânea.', 'warning');
      return;
    }
    if (cleanPatch.statusId === 'st_concluido') {
      cleanPatch.started = true;
      cleanPatch.finished = true;
      cleanPatch.progress = 100;
    } else if (cleanPatch.statusId === 'st_parcial') {
      cleanPatch.started = true;
      cleanPatch.finished = false;
      cleanPatch.progress = 50;
    } else if (cleanPatch.statusId === 'st_nao_iniciado') {
      cleanPatch.started = false;
      cleanPatch.finished = false;
      cleanPatch.progress = 0;
    }
    onBulkUpdateTasks(selectedTaskIds, cleanPatch);
    setBulkPatch({ statusId: '', priorityId: '', responsibleId: '', teamId: '', categoryId: '', dueDate: '' });
    setSelectedTaskIds([]);
  };

  const handleAddQuickColumn = (e) => {
    e.preventDefault();
    if (!quickColName.trim()) return;
    const key =
      'cf_' +
      quickColName
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_') +
      '_' +
      Math.random().toString(36).substring(2, 5);

    const options =
      quickColType === 'select' || quickColType === 'multi_select'
        ? quickColOptions
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((label, idx) => ({
              id: 'opt_' + Date.now() + '_' + idx,
              label,
              color: ['#10b981', '#3b82f6', '#f97316', '#8b5cf6', '#eab308'][idx % 5],
            }))
        : undefined;

    const newCol = {
      id: 'fld_' + Date.now(),
      key,
      name: quickColName.trim(),
      type: quickColType,
      required: false,
      visible: true,
      width: 175,
      order: allListFields.length + 1,
      options,
      isSystemField: false,
    };

    onUpdateList(
      activeList.id,
      { fields: [...allListFields, newCol] },
      `Adicionou coluna "${newCol.name}" diretamente na tabela`
    );
    setQuickColName('');
    setShowQuickAddCol(false);
    showToast(`Coluna "${newCol.name}" adicionada à tabela!`);
  };

  const handleResizeColumn = (fieldId, delta) => {
    const updated = allListFields.map((f) =>
      f.id === fieldId ? { ...f, width: Math.max(95, (f.width || 160) + delta) } : f
    );
    onUpdateList(activeList.id, { fields: updated });
  };

  const handleReorderColumn = (fieldId, dir) => {
    const idx = allListFields.findIndex((f) => f.id === fieldId);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= allListFields.length) return;
    const copy = [...allListFields];
    const tmp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = tmp;
    const reordered = copy.map((f, i) => ({ ...f, order: i + 1 }));
    onUpdateList(activeList.id, { fields: reordered }, `Moveu a coluna "${tmp.name}"`);
  };

  const handleQuickAddRow = (e) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    onCreateTask({
      listId: activeList.id,
      title: quickTaskTitle.trim(),
    });
    setQuickTaskTitle('');
  };

  // Renderizador de Célula Editável Inline para os 14 Tipos de Campos
  const renderEditableCell = (task, field) => {
    const key = field.key;

    // 1. Campo Status (Cor)
    if (key === 'statusId') {
      const currentStatus = db.statuses.find((s) => s.id === task.statusId) || db.statuses[0];
      return (
        <select
          value={task.statusId || ''}
          onChange={(e) => {
            const newStId = e.target.value;
            const stObj = db.statuses.find((s) => s.id === newStId);
            const patch = { statusId: newStId };
            if (activeList.autoCalculateFormula !== false && stObj) {
              if (stObj.category === 'done' || newStId === 'st_concluido') {
                patch.started = true;
                patch.finished = true;
                patch.progress = 100;
              } else if (stObj.category === 'in_progress' || newStId === 'st_parcial') {
                patch.started = true;
                patch.finished = false;
                patch.progress = 50;
              } else if (stObj.category === 'todo' || newStId === 'st_nao_iniciado') {
                patch.started = false;
                patch.finished = false;
                patch.progress = 0;
              }
            }
            onUpdateTask(task.id, patch, field.name);
          }}
          style={{
            backgroundColor: (currentStatus?.color || '#334155') + '22',
            color: currentStatus?.color || '#fff',
            borderColor: (currentStatus?.color || '#334155') + '66',
          }}
          className="w-full rounded-lg border px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide focus:outline-none cursor-pointer"
        >
          {db.statuses.map((s) => (
            <option key={s.id} value={s.id} className="bg-[#0b0d11] text-white">
              {s.name}
            </option>
          ))}
        </select>
      );
    }

    // 2. Checkboxes Iniciada / Finalizada (com Fórmula Automática da Planilha Excel)
    if (key === 'started' || key === 'finished') {
      const checked = Boolean(task[key]);
      return (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => {
              const val = e.target.checked;
              const nextStarted = key === 'started' ? val : val ? true : task.started;
              const nextFinished = key === 'finished' ? val : !val ? false : task.finished;
              const patch = { started: nextStarted, finished: nextFinished };

              if (activeList.autoCalculateFormula !== false) {
                const countTrue = (nextStarted ? 1 : 0) + (nextFinished ? 1 : 0);
                patch.progress = countTrue * 50;
                patch.statusId =
                  patch.progress === 100
                    ? 'st_concluido'
                    : patch.progress === 50
                    ? 'st_parcial'
                    : 'st_nao_iniciado';
              }
              onUpdateTask(task.id, patch, field.name);
            }}
            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
          />
        </div>
      );
    }

    // 3. Progresso / Percentual (%)
    if (key === 'progress' || field.type === 'percentage') {
      const pctVal =
        key === 'progress'
          ? Number(task.progress ?? 0)
          : Number((task.customValues && task.customValues[key]) ?? 0);
      const barColor = pctVal >= 100 ? '#10b981' : pctVal > 0 ? '#f97316' : '#475569';

      return (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, pctVal))}%`, backgroundColor: barColor }}
            />
          </div>
          <input
            type="number"
            min={0}
            max={100}
            step={10}
            value={pctVal}
            onChange={(e) => {
              const num = Math.min(100, Math.max(0, Number(e.target.value) || 0));
              if (key === 'progress') {
                const patch = {
                  progress: num,
                  started: num > 0,
                  finished: num >= 100,
                  statusId: num >= 100 ? 'st_concluido' : num > 0 ? 'st_parcial' : 'st_nao_iniciado',
                };
                onUpdateTask(task.id, patch, field.name);
              } else {
                onUpdateTask(
                  task.id,
                  { customValues: { ...(task.customValues || {}), [key]: num } },
                  field.name
                );
              }
            }}
            className="w-12 bg-[#0b0d11] border border-slate-700/80 rounded px-1 py-0.5 text-[11px] font-mono font-bold text-right text-white"
          />
          <span className="text-[10px] text-slate-400 font-mono">%</span>
        </div>
      );
    }

    // 4. Responsável
    if (key === 'responsibleId') {
      return (
        <select
          value={task.responsibleId || ''}
          onChange={(e) => onUpdateTask(task.id, { responsibleId: e.target.value }, field.name)}
          className="w-full bg-[#0b0d11] border border-slate-800 hover:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">— Sem responsável —</option>
          {db.users.map((u) => (
            <option key={u.id} value={u.id}>
              👷 {u.name}
            </option>
          ))}
        </select>
      );
    }

    // 5. Equipe
    if (key === 'teamId') {
      return (
        <select
          value={task.teamId || ''}
          onChange={(e) => onUpdateTask(task.id, { teamId: e.target.value }, field.name)}
          className="w-full bg-[#0b0d11] border border-slate-800 hover:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">— Sem equipe —</option>
          {db.teams.map((tm) => (
            <option key={tm.id} value={tm.id}>
              🛡️ {tm.name}
            </option>
          ))}
        </select>
      );
    }

    // 6. Categoria
    if (key === 'categoryId') {
      return (
        <select
          value={task.categoryId || ''}
          onChange={(e) => onUpdateTask(task.id, { categoryId: e.target.value }, field.name)}
          className="w-full bg-[#0b0d11] border border-slate-800 hover:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">— Sem categoria —</option>
          {db.categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              🏷️ {cat.name}
            </option>
          ))}
        </select>
      );
    }

    // 7. Prioridade
    if (key === 'priorityId') {
      const pr = db.priorities.find((p) => p.id === task.priorityId);
      return (
        <select
          value={task.priorityId || ''}
          onChange={(e) => onUpdateTask(task.id, { priorityId: e.target.value }, field.name)}
          style={{ color: pr?.color || '#cbd5e1' }}
          className="w-full bg-[#0b0d11] border border-slate-800 hover:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold focus:border-emerald-500 focus:outline-none"
        >
          {db.priorities.map((p) => (
            <option key={p.id} value={p.id} className="bg-[#0b0d11] text-white">
              {p.name}
            </option>
          ))}
        </select>
      );
    }

    // 8. Campos padrão (title, executionDate, dueDate, observations, serviceNote) vs customValues
    const isDirectProp = ['title', 'executionDate', 'dueDate', 'observations', 'serviceNote'].includes(key);
    const currentValue = isDirectProp
      ? task[key] ?? ''
      : (task.customValues && task.customValues[key]) ?? '';

    const updateCellValue = (newVal) => {
      if (isDirectProp) {
        onUpdateTask(task.id, { [key]: newVal }, field.name);
      } else {
        onUpdateTask(
          task.id,
          { customValues: { ...(task.customValues || {}), [key]: newVal } },
          field.name
        );
      }
    };

    if (field.type === 'checkbox') {
      return (
        <div className="flex justify-center">
          <input
            type="checkbox"
            checked={Boolean(currentValue)}
            onChange={(e) => updateCellValue(e.target.checked)}
            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
          />
        </div>
      );
    }

    if (field.type === 'boolean') {
      return (
        <select
          value={currentValue === true || currentValue === 'SIM' ? 'SIM' : currentValue === false || currentValue === 'NÃO' ? 'NÃO' : ''}
          onChange={(e) => updateCellValue(e.target.value)}
          className="w-full bg-[#0b0d11] border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200"
        >
          <option value="">—</option>
          <option value="SIM">Sim</option>
          <option value="NÃO">Não</option>
        </select>
      );
    }

    if (field.type === 'select') {
      return (
        <select
          value={currentValue || ''}
          onChange={(e) => updateCellValue(e.target.value)}
          className="w-full bg-[#0b0d11] border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200"
        >
          <option value="">— Selecionar —</option>
          {(field.options || []).map((opt) => (
            <option key={opt.id} value={opt.label}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'multi_select') {
      const selectedArr = Array.isArray(currentValue)
        ? currentValue
        : typeof currentValue === 'string' && currentValue
        ? currentValue.split(',').map((s) => s.trim())
        : [];
      return (
        <div className="flex flex-wrap items-center gap-1">
          {(field.options || []).map((opt) => {
            const active = selectedArr.includes(opt.label);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  const next = active
                    ? selectedArr.filter((i) => i !== opt.label)
                    : [...selectedArr, opt.label];
                  updateCellValue(next);
                }}
                style={{
                  backgroundColor: active ? opt.color : '#141821',
                  color: active ? '#fff' : '#94a3b8',
                }}
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-slate-700 transition"
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }

    if (field.type === 'date') {
      const isOverdueCell =
        key === 'dueDate' && !task.finished && task.statusId !== 'st_concluido' && currentValue && currentValue < todayStr;
      return (
        <input
          type="date"
          value={currentValue || ''}
          onChange={(e) => updateCellValue(e.target.value)}
          className={`w-full bg-[#0b0d11] border rounded-lg px-2 py-1 text-xs focus:outline-none ${
            isOverdueCell
              ? 'border-red-500/60 text-red-400 font-bold'
              : 'border-slate-800 text-slate-200'
          }`}
        />
      );
    }

    if (field.type === 'time') {
      return (
        <input
          type="time"
          value={currentValue || ''}
          onChange={(e) => updateCellValue(e.target.value)}
          className="w-full bg-[#0b0d11] border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200"
        />
      );
    }

    if (field.type === 'datetime') {
      return (
        <input
          type="datetime-local"
          value={currentValue || ''}
          onChange={(e) => updateCellValue(e.target.value)}
          className="w-full bg-[#0b0d11] border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200"
        />
      );
    }

    if (field.type === 'number') {
      return (
        <input
          type="number"
          defaultValue={currentValue}
          onBlur={(e) => {
            if (String(e.target.value) !== String(currentValue)) {
              updateCellValue(e.target.value === '' ? '' : Number(e.target.value));
            }
          }}
          className="w-full bg-[#0b0d11] border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-white"
        />
      );
    }

    if (field.type === 'signature' || field.type === 'attachments' || field.type === 'images') {
      const hasContent =
        field.type === 'signature'
          ? Boolean(task.signatureDataUrl || currentValue)
          : field.type === 'attachments'
          ? (task.attachments && task.attachments.length > 0)
          : (task.images && task.images.length > 0);
      return (
        <button
          type="button"
          onClick={() => onOpenTaskModal(task)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
            hasContent
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          {field.type === 'signature'
            ? hasContent
              ? '✍️ Assinado'
              : '✍️ Assinar'
            : field.type === 'attachments'
            ? `📎 Anexos (${(task.attachments || []).length})`
            : `🖼️ Fotos (${(task.images || []).length})`}
        </button>
      );
    }

    // Texto curto / Texto longo (Edição Inline ao sair do foco ou pressionar Enter)
    return (
      <input
        type="text"
        key={task.id + '_' + key + '_' + currentValue}
        defaultValue={currentValue}
        onBlur={(e) => {
          if (e.target.value !== String(currentValue)) {
            updateCellValue(e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className={`w-full bg-transparent hover:bg-[#0b0d11] focus:bg-[#0b0d11] border border-transparent hover:border-slate-700 focus:border-emerald-500 rounded-lg px-2 py-1 text-xs focus:outline-none transition ${
          key === 'title'
            ? task.finished
              ? 'font-semibold text-emerald-300 line-through decoration-emerald-500/60'
              : 'font-bold text-white'
            : 'text-slate-200'
        }`}
      />
    );
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Cabeçalho da Lista com KPIs Estilo Planilha (TOTAL, FEITO, A FAZER, % FEITO) */}
      <div className="bg-[#141821] border border-slate-800/90 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full inline-block"
                style={{ backgroundColor: activeList.color || '#10b981' }}
              />
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {activeList.category || 'Checklist'}
              </span>
              {activeList.origSheetName && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Aba Original: {activeList.origSheetName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                key={activeList.id + '_' + activeList.name}
                defaultValue={activeList.name}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== activeList.name) {
                    onUpdateList(activeList.id, { name: e.target.value.trim() }, 'Renomeou a lista pelo cabeçalho');
                    showToast('Nome da lista atualizado!');
                  }
                }}
                className="text-xl md:text-2xl font-extrabold text-white bg-transparent hover:bg-[#0b0d11] focus:bg-[#0b0d11] border border-transparent hover:border-slate-700 focus:border-emerald-500 rounded-xl px-2 py-0.5 -ml-2 focus:outline-none"
                title="Clique para renomear a lista diretamente"
              />
            </div>
            <p className="text-xs text-slate-400">{activeList.description}</p>
          </div>

          {/* Bloco KPI Idêntico ao Topo da Aba LIST 03 (TOTAL, FEITO, A FAZER, % FEITO) */}
          <div className="grid grid-cols-4 gap-2.5 bg-[#0b0d11] border border-slate-800 rounded-xl p-2.5 shrink-0">
            <div className="px-3 py-1 text-center border-r border-slate-800">
              <div className="text-[10px] font-bold uppercase text-slate-400">Total</div>
              <div className="text-lg font-extrabold text-white">{listStats.total}</div>
            </div>
            <div className="px-3 py-1 text-center border-r border-slate-800">
              <div className="text-[10px] font-bold uppercase text-emerald-400">Feito</div>
              <div className="text-lg font-extrabold text-emerald-400">{listStats.done}</div>
            </div>
            <div className="px-3 py-1 text-center border-r border-slate-800">
              <div className="text-[10px] font-bold uppercase text-orange-400">A Fazer</div>
              <div className="text-lg font-extrabold text-orange-400">{listStats.todo}</div>
            </div>
            <div className="px-3 py-1 text-center">
              <div className="text-[10px] font-bold uppercase text-blue-400">% Conclusão</div>
              <div className="text-lg font-extrabold text-blue-400">{listStats.avgPct}%</div>
            </div>
          </div>
        </div>

        {/* Barra de Modos de Visualização (Tabela, Kanban, Calendário, Checklist) + Ações */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 bg-[#0b0d11] p-1 rounded-xl border border-slate-800">
            {[
              { id: 'table', label: '📊 Tabela Editável' },
              { id: 'kanban', label: '🗂️ Kanban' },
              { id: 'calendar', label: '📅 Calendário' },
              { id: 'checklist', label: '☑️ Modo Checklist' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setViewMode(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === m.id
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenTaskModal(null)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition"
            >
              ＋ Nova Tarefa
            </button>

            <button
              onClick={() => setShowQuickAddCol(!showQuickAddCol)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-emerald-500/30 transition"
            >
              ＋ Adicionar Coluna
            </button>

            <div className="relative">
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
              >
                👁️ Colunas ({visibleFields.length}/{allListFields.length})
              </button>
              {showColumnMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-[#141821] border border-slate-700 rounded-2xl shadow-2xl p-3 z-40 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-xs font-bold text-white">Exibir / Ocultar Colunas</span>
                    <button
                      onClick={() => setShowColumnMenu(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {allListFields.map((f) => (
                      <label
                        key={f.id}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer text-xs"
                      >
                        <span className="text-slate-200 truncate">{f.name}</span>
                        <input
                          type="checkbox"
                          checked={f.visible !== false}
                          onChange={(e) => {
                            const updated = allListFields.map((col) =>
                              col.id === f.id ? { ...col, visible: e.target.checked } : col
                            );
                            onUpdateList(activeList.id, { fields: updated });
                          }}
                          className="accent-emerald-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onOpenBuilder}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
            >
              🛠️ Construtor de Campos
            </button>

            <button
              onClick={() => onExportExcel(activeList.id)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-slate-700 transition"
            >
              📥 Excel
            </button>

            <button
              onClick={() => onExportPdf(activeList.id)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 font-semibold text-xs border border-slate-700 transition"
            >
              🖨️ PDF
            </button>
          </div>
        </div>

        {/* Formulário Rápido de Nova Coluna Direto na Tabela */}
        {showQuickAddCol && (
          <form
            onSubmit={handleAddQuickColumn}
            className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-end gap-3 bg-[#0e1218] p-3.5 rounded-xl"
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                Nome da Nova Coluna / Campo *
              </label>
              <input
                type="text"
                required
                value={quickColName}
                onChange={(e) => setQuickColName(e.target.value)}
                placeholder="Ex: Custo R$, Medição, Assinatura Campo..."
                className="w-full bg-[#141821] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Tipo de Campo</label>
              <select
                value={quickColType}
                onChange={(e) => setQuickColType(e.target.value)}
                className="bg-[#141821] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                {Object.entries(window.FIELD_TYPE_META).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            {(quickColType === 'select' || quickColType === 'multi_select') && (
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] font-bold text-orange-400 mb-1">
                  Opções (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={quickColOptions}
                  onChange={(e) => setQuickColOptions(e.target.value)}
                  className="w-full bg-[#141821] border border-orange-500/40 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
            )}
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              ✓ Criar Coluna
            </button>
            <button
              type="button"
              onClick={() => setShowQuickAddCol(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs"
            >
              Cancelar
            </button>
          </form>
        )}

        {/* Barra de Pesquisa e Filtros Dinâmicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5 mt-4">
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Pesquisar tarefa, código, nota ou observação..."
              className="w-full bg-[#0b0d11] border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#0b0d11] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200"
          >
            <option value="ALL">Status: Todos</option>
            {db.statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-[#0b0d11] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200"
          >
            <option value="ALL">Prioridade: Todas</option>
            {db.priorities.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={filterResponsible}
            onChange={(e) => setFilterResponsible(e.target.value)}
            className="bg-[#0b0d11] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200"
          >
            <option value="ALL">Responsável: Todos</option>
            {db.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#0b0d11] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200"
          >
            <option value="ALL">Categoria: Todas</option>
            {db.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <label className="flex items-center justify-center gap-2 bg-[#0b0d11] border border-slate-800 rounded-xl px-3 py-2 text-xs text-orange-400 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={onlyOverdue}
              onChange={(e) => setOnlyOverdue(e.target.checked)}
              className="accent-orange-500"
            />
            <span>⚠️ Só Atrasadas</span>
          </label>
        </div>
      </div>

      {/* BARRA FLUTUANTE DE EDIÇÃO SIMULTÂNEA EM MASSA (REQUISITO 5) */}
      {selectedTaskIds.length > 0 && (
        <div className="bg-emerald-950/90 border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-extrabold text-xs">
              {selectedTaskIds.length} selecionada(s)
            </span>
            <span className="text-xs font-bold text-emerald-200">
              Edição Simultânea em Massa:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkPatch.statusId}
              onChange={(e) => setBulkPatch({ ...bulkPatch, statusId: e.target.value })}
              className="bg-[#0b0d11] border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">Mudar Status...</option>
              {db.statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={bulkPatch.priorityId}
              onChange={(e) => setBulkPatch({ ...bulkPatch, priorityId: e.target.value })}
              className="bg-[#0b0d11] border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">Mudar Prioridade...</option>
              {db.priorities.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={bulkPatch.responsibleId}
              onChange={(e) => setBulkPatch({ ...bulkPatch, responsibleId: e.target.value })}
              className="bg-[#0b0d11] border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">Mudar Responsável...</option>
              {db.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            <select
              value={bulkPatch.categoryId}
              onChange={(e) => setBulkPatch({ ...bulkPatch, categoryId: e.target.value })}
              className="bg-[#0b0d11] border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">Mudar Categoria...</option>
              {db.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={bulkPatch.dueDate}
              onChange={(e) => setBulkPatch({ ...bulkPatch, dueDate: e.target.value })}
              className="bg-[#0b0d11] border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white"
              title="Definir novo prazo em massa"
            />

            <button
              onClick={handleApplyBulkEdit}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition"
            >
              ✓ Aplicar a Todas
            </button>

            <button
              onClick={() => {
                onBulkUpdateTasks(selectedTaskIds, {
                  started: true,
                  finished: true,
                  progress: 100,
                  statusId: 'st_concluido',
                });
                setSelectedTaskIds([]);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs"
            >
              ☑️ Concluir Selecionadas
            </button>

            <button
              onClick={() => {
                onBulkDeleteTasks(selectedTaskIds);
                setSelectedTaskIds([]);
              }}
              className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs"
            >
              🗑️ Excluir
            </button>

            <button
              onClick={() => setSelectedTaskIds([])}
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODO 1: TABELA PROFISSIONAL EDITÁVEL INLINE
         ===================================================================== */}
      {viewMode === 'table' && (
        <div className="bg-[#141821] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#0e1218] border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={listTasks.length > 0 && selectedTaskIds.length === listTasks.length}
                      onChange={toggleSelectAll}
                      className="rounded accent-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th
                    onClick={() => toggleSort('code')}
                    className="py-3 px-2.5 w-24 cursor-pointer hover:text-white select-none"
                  >
                    ID {sortConfig.key === 'code' ? (sortConfig.dir === 'asc' ? '↑' : '↓') : ''}
                  </th>

                  {visibleFields.map((field) => (
                    <th
                      key={field.id}
                      style={{ minWidth: `${field.width || 160}px`, width: `${field.width || 160}px` }}
                      className="py-2.5 px-2.5 border-l border-slate-800/70 relative group select-none"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          onClick={() => toggleSort(field.key)}
                          className="cursor-pointer hover:text-emerald-400 truncate flex items-center gap-1"
                        >
                          {field.name}
                          {field.required && <span className="text-orange-400">*</span>}
                          {sortConfig.key === field.key && (
                            <span className="text-emerald-400">{sortConfig.dir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </span>

                        {/* Controles Rápidos da Coluna (Mover, Redimensionar, Menu) */}
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition bg-[#141821] rounded px-1 border border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleReorderColumn(field.id, -1)}
                            className="px-1 text-[10px] hover:text-white"
                            title="Mover coluna para esquerda"
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorderColumn(field.id, 1)}
                            className="px-1 text-[10px] hover:text-white"
                            title="Mover coluna para direita"
                          >
                            →
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResizeColumn(field.id, -25)}
                            className="px-1 text-[10px] hover:text-white"
                            title="Estreitar coluna"
                          >
                            −
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResizeColumn(field.id, 35)}
                            className="px-1 text-[10px] hover:text-white"
                            title="Alargar coluna"
                          >
                            ＋
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveHeaderMenuId(activeHeaderMenuId === field.id ? null : field.id)
                            }
                            className="px-1 text-[10px] text-emerald-400 hover:text-white"
                            title="Editar ou excluir coluna"
                          >
                            ⚙️
                          </button>
                        </div>
                      </div>

                      {/* Popover de Edição Direta do Cabeçalho da Coluna */}
                      {activeHeaderMenuId === field.id && (
                        <div className="absolute left-2 top-10 w-56 bg-[#181f2c] border border-slate-700 rounded-xl shadow-2xl p-3 z-50 space-y-2 normal-case font-normal text-slate-200">
                          <div className="text-[11px] font-bold text-emerald-400">Configurar Coluna</div>
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => {
                              const updated = allListFields.map((col) =>
                                col.id === field.id ? { ...col, name: e.target.value } : col
                              );
                              onUpdateList(activeList.id, { fields: updated });
                            }}
                            className="w-full bg-[#0b0d11] border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                          <div className="flex justify-between gap-1 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = allListFields.map((col) =>
                                  col.id === field.id ? { ...col, visible: false } : col
                                );
                                onUpdateList(activeList.id, { fields: updated });
                                setActiveHeaderMenuId(null);
                              }}
                              className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-300 hover:text-white"
                            >
                              Ocultar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Remover a coluna "${field.name}" desta lista?`)) {
                                  const updated = allListFields.filter((col) => col.id !== field.id);
                                  onUpdateList(activeList.id, { fields: updated }, `Removeu coluna "${field.name}"`);
                                  setActiveHeaderMenuId(null);
                                }
                              }}
                              className="px-2 py-1 rounded bg-red-500/20 text-[11px] text-red-400 hover:bg-red-500/30"
                            >
                              Excluir
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveHeaderMenuId(null)}
                              className="px-2 py-1 rounded bg-emerald-600 text-[11px] text-white"
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      )}
                    </th>
                  ))}

                  <th className="py-3 px-3 w-36 text-center border-l border-slate-800/70">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 text-xs">
                {listTasks.map((task) => {
                  const isSelected = selectedTaskIds.includes(task.id);
                  return (
                    <tr
                      key={task.id}
                      className={`transition ${
                        isSelected
                          ? 'bg-emerald-950/25'
                          : task.finished
                          ? 'bg-emerald-950/5 hover:bg-[#19202d]'
                          : 'hover:bg-[#19202d]'
                      }`}
                    >
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(task.id)}
                          className="rounded accent-emerald-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-2 px-2.5 font-mono text-[11px] font-bold text-slate-400 whitespace-nowrap">
                        <button
                          onClick={() => onOpenTaskModal(task)}
                          className="hover:text-emerald-400 underline decoration-dotted"
                          title="Abrir detalhes e histórico da tarefa"
                        >
                          {task.code}
                        </button>
                      </td>

                      {visibleFields.map((field) => (
                        <td
                          key={field.id}
                          style={{ minWidth: `${field.width || 160}px`, maxWidth: `${(field.width || 160) + 120}px` }}
                          className="py-1.5 px-2 border-l border-slate-800/40 align-middle"
                        >
                          {renderEditableCell(task, field)}
                        </td>
                      ))}

                      <td className="py-1.5 px-2.5 border-l border-slate-800/40 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const nextDone = !task.finished;
                              onUpdateTask(
                                task.id,
                                {
                                  started: true,
                                  finished: nextDone,
                                  progress: nextDone ? 100 : 50,
                                  statusId: nextDone ? 'st_concluido' : 'st_parcial',
                                },
                                'Conclusão Rápida'
                              );
                            }}
                            className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                              task.finished
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-300 hover:bg-emerald-600 hover:text-white'
                            }`}
                            title={task.finished ? 'Tarefa concluída (clique para reabrir)' : 'Concluir tarefa agora'}
                          >
                            ✓
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenTaskModal(task)}
                            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]"
                            title="Editar todos os campos, anexos, assinatura e ver histórico"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            onClick={() => onDuplicateTask(task.id)}
                            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                            title="Duplicar tarefa"
                          >
                            📑
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            className="px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/25 text-red-400 text-[11px]"
                            title="Excluir tarefa"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Linha de Adição Rápida + Rodapé TOTAL EM % Idêntico à Planilha Original */}
              <tfoot>
                <tr className="bg-[#0e1218]/90 border-t border-slate-800">
                  <td colSpan={visibleFields.length + 3} className="py-2 px-3">
                    <form onSubmit={handleQuickAddRow} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={quickTaskTitle}
                        onChange={(e) => setQuickTaskTitle(e.target.value)}
                        placeholder="＋ Digite uma nova atividade e pressione Enter para adicionar rapidamente nesta lista..."
                        className="flex-1 bg-[#141821] border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        Adicionar Linha
                      </button>
                    </form>
                  </td>
                </tr>

                <tr className="bg-[#0b0d11] border-t-2 border-slate-800 text-xs font-bold text-slate-300">
                  <td colSpan={3} className="py-3 px-4 text-right uppercase tracking-wider text-emerald-400">
                    TOTAL EM % (Fórmula Planilha Original):
                  </td>
                  <td colSpan={visibleFields.length} className="py-3 px-4">
                    <div className="flex flex-wrap items-center gap-6">
                      <span>
                        Iniciadas: <strong className="text-orange-400 font-mono">{listStats.startedPct}%</strong>
                      </span>
                      <span>
                        Finalizadas: <strong className="text-emerald-400 font-mono">{listStats.finishedPct}%</strong>
                      </span>
                      <span>
                        Média Geral de Qualidade / Conclusão:{' '}
                        <strong className="text-white font-mono">{listStats.avgPct}%</strong>
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODO 2: KANBAN INTERATIVO COM DRAG & DROP
         ===================================================================== */}
      {viewMode === 'kanban' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-[#141821] border border-slate-800 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>Agrupar quadro Kanban por:</span>
              <select
                value={kanbanGroupBy}
                onChange={(e) => setKanbanGroupBy(e.target.value)}
                className="bg-[#0b0d11] border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-400"
              >
                <option value="status">Status (Cor)</option>
                <option value="priority">Prioridade</option>
                <option value="category">Categoria</option>
              </select>
            </div>
            {kanbanGroupBy === 'status' && (
              <button
                onClick={onAddStatusQuick}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-emerald-500/30"
              >
                ＋ Criar Nova Coluna de Status
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {(kanbanGroupBy === 'status'
              ? db.statuses
              : kanbanGroupBy === 'priority'
              ? db.priorities
              : db.categories
            ).map((groupCol) => {
              const colTasks = listTasks.filter((t) =>
                kanbanGroupBy === 'status'
                  ? t.statusId === groupCol.id
                  : kanbanGroupBy === 'priority'
                  ? t.priorityId === groupCol.id
                  : t.categoryId === groupCol.id
              );

              return (
                <div
                  key={groupCol.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!draggedTaskId) return;
                    if (kanbanGroupBy === 'status') {
                      const patch = { statusId: groupCol.id };
                      if (groupCol.category === 'done' || groupCol.id === 'st_concluido') {
                        patch.started = true;
                        patch.finished = true;
                        patch.progress = 100;
                      } else if (groupCol.category === 'in_progress' || groupCol.id === 'st_parcial') {
                        patch.started = true;
                        patch.finished = false;
                        patch.progress = 50;
                      } else if (groupCol.category === 'todo' || groupCol.id === 'st_nao_iniciado') {
                        patch.started = false;
                        patch.finished = false;
                        patch.progress = 0;
                      }
                      onUpdateTask(draggedTaskId, patch, 'Status (Kanban Drag & Drop)');
                    } else if (kanbanGroupBy === 'priority') {
                      onUpdateTask(draggedTaskId, { priorityId: groupCol.id }, 'Prioridade (Kanban)');
                    } else {
                      onUpdateTask(draggedTaskId, { categoryId: groupCol.id }, 'Categoria (Kanban)');
                    }
                    setDraggedTaskId(null);
                  }}
                  className="bg-[#141821] border border-slate-800/90 rounded-2xl p-3.5 flex flex-col min-h-[420px]"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: groupCol.color || '#10b981' }}
                      />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                        {groupCol.name}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono font-bold text-slate-300">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {colTasks.map((task) => {
                      const resp = db.users.find((u) => u.id === task.responsibleId);
                      const pr = db.priorities.find((p) => p.id === task.priorityId);
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => setDraggedTaskId(task.id)}
                          onClick={() => onOpenTaskModal(task)}
                          className="cursor-grab active:cursor-grabbing bg-[#0e1218] hover:bg-[#19202e] border border-slate-800/90 hover:border-emerald-500/40 rounded-xl p-3 space-y-2 shadow transition"
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span>{task.code}</span>
                            {pr && (
                              <span
                                style={{ color: pr.color }}
                                className="font-bold uppercase"
                              >
                                ● {pr.name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-white leading-snug">{task.title}</div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${task.progress || 0}%`,
                                backgroundColor: task.progress >= 100 ? '#10b981' : '#f97316',
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                            <span>👷 {resp ? resp.name : 'Sem resp.'}</span>
                            <span className="font-mono font-bold text-slate-300">{task.progress}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODO 3: CALENDÁRIO OPERACIONAL INTERATIVO
         ===================================================================== */}
      {viewMode === 'calendar' && (() => {
        const baseDate = new Date(2026, 0 + calendarMonthOffset, 1);
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        const firstDayWeek = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthLabel = baseDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        const cells = [];
        for (let i = 0; i < firstDayWeek; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);

        return (
          <div className="bg-[#141821] border border-slate-800/90 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white capitalize">📅 {monthLabel}</h3>
                <p className="text-xs text-slate-400">
                  Clique em uma tarefa para editar ou clique no botão ＋ de qualquer dia para agendar uma nova atividade.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalendarMonthOffset((m) => m - 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
                >
                  ← Mês Anterior
                </button>
                <button
                  onClick={() => setCalendarMonthOffset(0)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold"
                >
                  Janeiro/Fevereiro 2026
                </button>
                <button
                  onClick={() => setCalendarMonthOffset((m) => m + 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
                >
                  Próximo Mês →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase text-slate-400">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div key={d} className="py-1.5 bg-[#0e1218] rounded-lg">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {cells.map((day, idx) => {
                if (!day) {
                  return <div key={'empty_' + idx} className="min-h-[110px] rounded-xl bg-[#0b0d11]/40" />;
                }
                const dateIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayTasks = listTasks.filter(
                  (t) => t.dueDate === dateIso || t.executionDate === dateIso
                );
                return (
                  <div
                    key={dateIso}
                    className="min-h-[115px] rounded-xl bg-[#0e1218] border border-slate-800/80 p-2 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">{day}</span>
                      <button
                        onClick={() => {
                          const title = window.prompt(`Nova tarefa para ${dateIso}:`);
                          if (title && title.trim()) {
                            onCreateTask({
                              listId: activeList.id,
                              title: title.trim(),
                              executionDate: dateIso,
                              dueDate: dateIso,
                            });
                          }
                        }}
                        className="text-[11px] text-slate-500 hover:text-emerald-400 font-bold"
                        title="Criar tarefa neste dia"
                      >
                        ＋
                      </button>
                    </div>
                    <div className="space-y-1 mt-1 max-h-24 overflow-y-auto">
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => onOpenTaskModal(t)}
                          className={`cursor-pointer px-1.5 py-1 rounded text-[10px] font-semibold truncate ${
                            t.finished
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : t.started
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {t.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* =====================================================================
          MODO 4: CHECKLIST OPERACIONAL (ESTILO PLANILHA ORIGINAL COM DUPLO CHECK)
         ===================================================================== */}
      {viewMode === 'checklist' && (
        <div className="bg-[#141821] border border-slate-800/90 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">
                ☑️ Modo Checklist de Campo — {activeList.name}
              </h3>
              <p className="text-xs text-slate-400">
                Marque <strong>Iniciada (50% Parcial)</strong> e <strong>Finalizada (100% Concluído)</strong> com atualização instantânea de indicadores.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {listTasks.map((task) => {
              const st = db.statuses.find((s) => s.id === task.statusId) || db.statuses[0];
              const resp = db.users.find((u) => u.id === task.responsibleId);
              return (
                <div
                  key={task.id}
                  className={`rounded-xl border p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition ${
                    task.finished
                      ? 'bg-emerald-950/15 border-emerald-500/30'
                      : task.started
                      ? 'bg-orange-950/10 border-orange-500/30'
                      : 'bg-[#0e1218] border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-mono text-xs font-bold text-slate-400">{task.code}</span>
                    <span
                      style={{ backgroundColor: st.color + '25', color: st.color, borderColor: st.color + '55' }}
                      className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border shrink-0"
                    >
                      {st.name}
                    </span>
                    <input
                      type="text"
                      defaultValue={task.title}
                      onBlur={(e) => {
                        if (e.target.value !== task.title) {
                          onUpdateTask(task.id, { title: e.target.value }, 'Título (Modo Checklist)');
                        }
                      }}
                      className={`flex-1 bg-transparent border-b border-transparent focus:border-emerald-500 text-sm font-bold focus:outline-none ${
                        task.finished ? 'text-emerald-300 line-through' : 'text-white'
                      }`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-orange-300 bg-[#141821] px-3 py-1.5 rounded-lg border border-slate-800">
                      <input
                        type="checkbox"
                        checked={Boolean(task.started)}
                        onChange={(e) => {
                          const started = e.target.checked;
                          const finished = started ? task.finished : false;
                          const progress = finished ? 100 : started ? 50 : 0;
                          onUpdateTask(
                            task.id,
                            {
                              started,
                              finished,
                              progress,
                              statusId: progress === 100 ? 'st_concluido' : progress === 50 ? 'st_parcial' : 'st_nao_iniciado',
                            },
                            'Iniciada'
                          );
                        }}
                        className="w-4 h-4 accent-orange-500"
                      />
                      <span>1. Iniciada</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-300 bg-[#141821] px-3 py-1.5 rounded-lg border border-slate-800">
                      <input
                        type="checkbox"
                        checked={Boolean(task.finished)}
                        onChange={(e) => {
                          const finished = e.target.checked;
                          const started = finished ? true : task.started;
                          const progress = finished ? 100 : started ? 50 : 0;
                          onUpdateTask(
                            task.id,
                            {
                              started,
                              finished,
                              progress,
                              statusId: progress === 100 ? 'st_concluido' : progress === 50 ? 'st_parcial' : 'st_nao_iniciado',
                            },
                            'Finalizada'
                          );
                        }}
                        className="w-4 h-4 accent-emerald-500"
                      />
                      <span>2. Finalizada</span>
                    </label>

                    <span className="font-mono text-xs font-extrabold w-12 text-right text-white">
                      {task.progress}%
                    </span>

                    <span className="text-xs text-slate-400 min-w-[110px] truncate">
                      👷 {resp ? resp.name : 'Sem resp.'}
                    </span>

                    <button
                      onClick={() => onOpenTaskModal(task)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                    >
                      Detalhes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODAL COMPLETO DE TAREFA (TODOS OS CAMPOS + ASSINATURA + ANEXOS + AUDITORIA)
// ============================================================================
window.TaskDetailModal = function ({
  db,
  activeList,
  task,
  onClose,
  onSaveTask,
  onDuplicateTask,
  onDeleteTask,
}) {
  const isNew = !task || !task.id;
  const [activeTab, setActiveTab] = React.useState('details');

  const [form, setForm] = React.useState(() => {
    if (task && task.id) {
      return JSON.parse(JSON.stringify(task));
    }
    return {
      listId: activeList.id,
      title: '',
      description: '',
      categoryId: db.categories[0]?.id || '',
      statusId: 'st_nao_iniciado',
      priorityId: 'pr_alta',
      responsibleId: db.users[0]?.id || '',
      teamId: db.teams[0]?.id || '',
      started: false,
      finished: false,
      progress: 0,
      executionDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      executionTime: '08:00',
      observations: '',
      serviceNote: '',
      attachments: [],
      images: [],
      signatureDataUrl: '',
      customValues: {},
    };
  });

  const taskAuditLogs = React.useMemo(() => {
    if (isNew) return [];
    return (db.auditLogs || []).filter((log) => log.taskId === task.id);
  }, [db.auditLogs, task, isNew]);

  const customFields = React.useMemo(
    () => (activeList.fields || []).filter((f) => !f.isSystemField),
    [activeList.fields]
  );

  const handleFileUpload = (e, targetArrayKey) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const item = {
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: String(reader.result || ''),
          uploadedAt: new Date().toISOString(),
          uploadedBy: (db.users.find((u) => u.id === db.currentUserId) || {}).name || 'Admin',
        };
        setForm((prev) => ({
          ...prev,
          [targetArrayKey]: [...(prev[targetArrayKey] || []), item],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.title.trim()) {
      alert('O título / atividade da tarefa é obrigatório.');
      return;
    }
    onSaveTask(form, isNew);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#141821] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0e1218] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-bold">
              {isNew ? 'NOVA TAREFA' : form.code}
            </span>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {isNew ? `Criar Tarefa em "${activeList.name}"` : form.title}
              </h2>
              {!isNew && form.completedAt && (
                <p className="text-[11px] text-emerald-400">
                  ✓ Concluída em {new Date(form.completedAt).toLocaleString('pt-BR')} por{' '}
                  <strong>{form.completedBy || 'Administrador'}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isNew && (
              <div className="flex bg-[#141821] p-1 rounded-xl border border-slate-800 mr-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    activeTab === 'details' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  📋 Campos & Dados
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    activeTab === 'history' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  🛡️ Histórico ({taskAuditLogs.length})
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'details' ? (
            <form id="task-modal-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Título da Atividade / Demanda *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ex: AJUSTAR A PLANILHA DE AVANÇO DE OBRAS"
                    className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nº da Nota / Obra (Opcional)
                  </label>
                  <input
                    type="text"
                    value={form.serviceNote || ''}
                    onChange={(e) => setForm({ ...form, serviceNote: e.target.value })}
                    placeholder="Ex: 440113684"
                    className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white"
                  />
                </div>
              </div>

              {/* Status, Checkboxes Iniciada/Finalizada e Percentual */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#0e1218] p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Status (Cor)</label>
                  <select
                    value={form.statusId}
                    onChange={(e) => {
                      const stId = e.target.value;
                      const patch = { statusId: stId };
                      if (stId === 'st_concluido') {
                        patch.started = true;
                        patch.finished = true;
                        patch.progress = 100;
                      } else if (stId === 'st_parcial') {
                        patch.started = true;
                        patch.finished = false;
                        patch.progress = 50;
                      } else if (stId === 'st_nao_iniciado') {
                        patch.started = false;
                        patch.finished = false;
                        patch.progress = 0;
                      }
                      setForm({ ...form, ...patch });
                    }}
                    className="w-full bg-[#141821] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                  >
                    {db.statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-orange-400">
                    <input
                      type="checkbox"
                      checked={Boolean(form.started)}
                      onChange={(e) => {
                        const started = e.target.checked;
                        const finished = started ? form.finished : false;
                        const progress = finished ? 100 : started ? 50 : 0;
                        setForm({
                          ...form,
                          started,
                          finished,
                          progress,
                          statusId: progress === 100 ? 'st_concluido' : progress === 50 ? 'st_parcial' : 'st_nao_iniciado',
                        });
                      }}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span>Etapa 1: Iniciada</span>
                  </label>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-400">
                    <input
                      type="checkbox"
                      checked={Boolean(form.finished)}
                      onChange={(e) => {
                        const finished = e.target.checked;
                        const started = finished ? true : form.started;
                        const progress = finished ? 100 : started ? 50 : 0;
                        setForm({
                          ...form,
                          started,
                          finished,
                          progress,
                          statusId: progress === 100 ? 'st_concluido' : progress === 50 ? 'st_parcial' : 'st_nao_iniciado',
                        });
                      }}
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <span>Etapa 2: Finalizada</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Concluída em % ({form.progress}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={10}
                    value={form.progress || 0}
                    onChange={(e) => {
                      const p = Number(e.target.value);
                      setForm({
                        ...form,
                        progress: p,
                        started: p > 0,
                        finished: p >= 100,
                        statusId: p >= 100 ? 'st_concluido' : p > 0 ? 'st_parcial' : 'st_nao_iniciado',
                      });
                    }}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Responsável, Equipe, Categoria, Prioridade, Datas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Responsável</label>
                  <select
                    value={form.responsibleId || ''}
                    onChange={(e) => setForm({ ...form, responsibleId: e.target.value })}
                    className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">— Selecionar —</option>
                    {db.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.jobTitle})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Equipe</label>
                  <select
                    value={form.teamId || ''}
                    onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                    className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">— Selecionar —</option>
                    {db.teams.map((tm) => (
                      <option key={tm.id} value={tm.id}>
                        {tm.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
                  <select
                    value={form.categoryId || ''}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">— Selecionar —</option>
                    {db.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Prioridade</label>
                  <select
                    value={form.priorityId || ''}
                    onChange={(e) => setForm({ ...form, priorityId: e.target.value })}
                    className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {db.priorities.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Data de Execução</label>
                  <input
                    type="date"
                    value={form.executionDate || ''}
                    onChange={(e) => setForm({ ...form, executionDate: e.target.value })}
                    className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Prazo Limite</label>
                  <input
                    type="date"
                    value={form.dueDate || ''}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Descrição e Observações Personalizadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Descrição Detalhada da Tarefa
                  </label>
                  <textarea
                    rows={3}
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Observações de Campo / Apontamentos
                  </label>
                  <textarea
                    rows={3}
                    value={form.observations || ''}
                    onChange={(e) => setForm({ ...form, observations: e.target.value })}
                    className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Campos Personalizados Criados pelo Administrador nesta Lista */}
              {customFields.length > 0 && (
                <div className="bg-[#0e1218] border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Campos Personalizados desta Lista ({customFields.length})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFields.map((cf) => {
                      const val = (form.customValues && form.customValues[cf.key]) ?? '';
                      const setVal = (v) =>
                        setForm({
                          ...form,
                          customValues: { ...(form.customValues || {}), [cf.key]: v },
                        });

                      return (
                        <div key={cf.id}>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            {cf.name} {cf.required && <span className="text-orange-400">*</span>}
                          </label>
                          {cf.type === 'long_text' ? (
                            <textarea
                              rows={2}
                              required={cf.required}
                              value={val}
                              onChange={(e) => setVal(e.target.value)}
                              className="w-full bg-[#141821] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            />
                          ) : cf.type === 'select' ? (
                            <select
                              required={cf.required}
                              value={val}
                              onChange={(e) => setVal(e.target.value)}
                              className="w-full bg-[#141821] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            >
                              <option value="">— Selecionar —</option>
                              {(cf.options || []).map((o) => (
                                <option key={o.id} value={o.label}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          ) : cf.type === 'checkbox' ? (
                            <input
                              type="checkbox"
                              checked={Boolean(val)}
                              onChange={(e) => setVal(e.target.checked)}
                              className="w-4 h-4 accent-emerald-500"
                            />
                          ) : (
                            <input
                              type={
                                cf.type === 'number' || cf.type === 'percentage'
                                  ? 'number'
                                  : cf.type === 'date'
                                  ? 'date'
                                  : cf.type === 'time'
                                  ? 'time'
                                  : cf.type === 'datetime'
                                  ? 'datetime-local'
                                  : 'text'
                              }
                              required={cf.required}
                              value={val}
                              onChange={(e) => setVal(e.target.value)}
                              className="w-full bg-[#141821] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Anexos, Fotos e Assinatura Digital em Canvas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0e1218] border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">📎 Anexos & Fotos de Campo</span>
                    <label className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold cursor-pointer border border-slate-700">
                      ＋ Enviar Arquivo / Foto
                      <input
                        type="file"
                        multiple
                        onChange={(e) => handleFileUpload(e, 'attachments')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {(form.attachments || []).length === 0 ? (
                    <p className="text-[11px] text-slate-500">Nenhum anexo ou imagem adicionado ainda.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {(form.attachments || []).map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between bg-[#141821] px-2.5 py-1.5 rounded-lg text-xs"
                        >
                          <a
                            href={att.dataUrl}
                            download={att.name}
                            className="text-emerald-400 hover:underline truncate max-w-[220px]"
                          >
                            📄 {att.name}
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                attachments: form.attachments.filter((a) => a.id !== att.id),
                              })
                            }
                            className="text-red-400 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#0e1218] border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-slate-200 block">
                    ✍️ Assinatura Digital de Validação
                  </span>
                  {React.createElement(window.SignaturePadCanvas, {
                    value: form.signatureDataUrl,
                    onChange: (dataUrl) => setForm({ ...form, signatureDataUrl: dataUrl }),
                  })}
                </div>
              </div>
            </form>
          ) : (
            /* Aba de Histórico e Auditoria Imutável da Tarefa */
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Histórico completo e imutável de todas as modificações realizadas nesta tarefa:
              </div>
              {taskAuditLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-[#0e1218] rounded-xl">
                  Nenhuma alteração posterior registrada para esta tarefa.
                </div>
              ) : (
                <div className="space-y-2">
                  {taskAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-[#0e1218] border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-bold text-emerald-400">{log.userName}</span> alterou{' '}
                        <strong className="text-white">{log.fieldChanged}</strong>:
                        <div className="mt-1 font-mono text-[11px]">
                          <span className="text-red-400 line-through mr-2">{log.oldValue || 'Vazio'}</span>
                          <span className="text-slate-400 mr-2">→</span>
                          <span className="text-emerald-400 font-bold">{log.newValue}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-4 bg-[#0e1218] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {!isNew ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onDuplicateTask(task.id);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                📑 Duplicar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTask(task.id);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold"
              >
                🗑️ Excluir
              </button>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="task-modal-form"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50"
            >
              ✓ Salvar Tarefa no Banco
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
