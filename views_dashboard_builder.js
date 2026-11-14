// ============================================================================
// MÓDULO 1: DASHBOARD EXECUTIVO EM TEMPO REAL + CONSTRUTOR DE LISTAS (NO-CODE)
// ============================================================================

window.DashboardView = function ({
  db,
  onSelectList,
  onOpenNewListModal,
  onOpenNewTaskModal,
  onExportExcel,
  onExportPdf,
}) {
  const [filterListId, setFilterListId] = React.useState('ALL');
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = React.useMemo(() => {
    if (filterListId === 'ALL') return db.tasks;
    return db.tasks.filter((t) => t.listId === filterListId);
  }, [db.tasks, filterListId]);

  const metrics = React.useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter((t) => t.finished || t.statusId === 'st_concluido' || Number(t.progress) >= 100).length;
    const inProgress = filteredTasks.filter(
      (t) => !t.finished && t.statusId !== 'st_concluido' && (t.started || t.statusId === 'st_parcial' || (Number(t.progress) > 0 && Number(t.progress) < 100))
    ).length;
    const pending = Math.max(0, total - completed - inProgress);
    const overdue = filteredTasks.filter(
      (t) => !t.finished && t.statusId !== 'st_concluido' && t.dueDate && t.dueDate < todayStr
    ).length;
    const avgCompletion = total > 0
      ? Math.round(filteredTasks.reduce((acc, t) => acc + (Number(t.progress) || (t.finished ? 100 : t.started ? 50 : 0)), 0) / total)
      : 0;

    return { total, completed, inProgress, pending, overdue, avgCompletion };
  }, [filteredTasks, todayStr]);

  // Tarefas por Responsável
  const byResponsible = React.useMemo(() => {
    return db.users
      .map((u) => {
        const uTasks = filteredTasks.filter((t) => t.responsibleId === u.id);
        const done = uTasks.filter((t) => t.finished || t.statusId === 'st_concluido').length;
        const partial = uTasks.filter((t) => !t.finished && t.started).length;
        const pct = uTasks.length ? Math.round((done / uTasks.length) * 100) : 0;
        return { user: u, total: uTasks.length, done, partial, pending: uTasks.length - done - partial, pct };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [db.users, filteredTasks]);

  // Tarefas por Categoria
  const byCategory = React.useMemo(() => {
    return db.categories
      .map((c) => {
        const cTasks = filteredTasks.filter((t) => t.categoryId === c.id);
        const done = cTasks.filter((t) => t.finished || t.statusId === 'st_concluido').length;
        const pct = cTasks.length ? Math.round((done / cTasks.length) * 100) : 0;
        return { category: c, total: cTasks.length, done, pct };
      })
      .sort((a, b) => b.total - a.total);
  }, [db.categories, filteredTasks]);

  // Evolução Diária e Semanal por Lista / Aba
  const listEvolution = React.useMemo(() => {
    return db.lists.map((lst) => {
      const lTasks = db.tasks.filter((t) => t.listId === lst.id);
      const done = lTasks.filter((t) => t.finished || t.statusId === 'st_concluido').length;
      const partial = lTasks.filter((t) => !t.finished && t.started).length;
      const avg = lTasks.length
        ? Math.round(lTasks.reduce((a, b) => a + (Number(b.progress) || 0), 0) / lTasks.length)
        : 0;
      return {
        list: lst,
        total: lTasks.length,
        done,
        partial,
        pending: Math.max(0, lTasks.length - done - partial),
        avg,
      };
    });
  }, [db.lists, db.tasks]);

  return (
    <div className="space-y-6 pb-10">
      {/* Cabeçalho e Filtro Rápido do Dashboard */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#141821] border border-slate-800/90 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Indicadores em Tempo Real
            </span>
            <span className="text-xs text-slate-400">
              {db.lists.length} Listas Ativas • {db.tasks.length} Tarefas Sincronizadas
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1 tracking-tight">
            Painel de Controle Operacional & Checklists
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Todos os cálculos refletem automaticamente as edições feitas nas listas, células, status e campos personalizados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={filterListId}
            onChange={(e) => setFilterListId(e.target.value)}
            className="bg-[#0b0d11] border border-slate-700/80 text-slate-100 text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">📊 Todas as Listas ({db.tasks.length} tarefas)</option>
            {db.lists.map((l) => (
              <option key={l.id} value={l.id}>
                📋 {l.name} ({db.tasks.filter((t) => t.listId === l.id).length})
              </option>
            ))}
          </select>

          <button
            onClick={() => onOpenNewTaskModal(filterListId === 'ALL' ? db.lists[0]?.id : filterListId)}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition"
          >
            <span>＋ Nova Tarefa</span>
          </button>

          <button
            onClick={onOpenNewListModal}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition"
          >
            🛠️ Construir Nova Lista
          </button>

          <button
            onClick={() => onExportExcel(filterListId === 'ALL' ? undefined : filterListId)}
            className="px-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-emerald-500/30 transition"
          >
            📥 Exportar Excel
          </button>

          <button
            onClick={() => onExportPdf(filterListId === 'ALL' ? undefined : filterListId)}
            className="px-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-orange-400 font-semibold text-xs border border-orange-500/30 transition"
          >
            🖨️ PDF
          </button>
        </div>
      </div>

      {/* 6 Cards Principais de Indicadores (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-[#141821] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total de Tarefas</span>
            <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm">📋</span>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">{metrics.total}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Em {filterListId === 'ALL' ? `${db.lists.length} listas` : '1 lista selecionada'}
          </div>
        </div>

        <div className="bg-[#141821] border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Concluídas</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-sm font-bold">✓</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">{metrics.completed}</div>
          <div className="text-[11px] text-emerald-300/80 mt-1">
            {metrics.total ? Math.round((metrics.completed / metrics.total) * 100) : 0}% finalizadas (100%)
          </div>
        </div>

        <div className="bg-[#141821] border border-orange-500/30 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">Em Andamento</span>
            <span className="w-8 h-8 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center text-sm font-bold">⚡</span>
          </div>
          <div className="text-3xl font-extrabold text-orange-400 mt-2">{metrics.inProgress}</div>
          <div className="text-[11px] text-orange-300/80 mt-1">Status Parcial (Iniciadas 50%)</div>
        </div>

        <div className="bg-[#141821] border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Pendentes</span>
            <span className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-sm">⏳</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-200 mt-2">{metrics.pending}</div>
          <div className="text-[11px] text-slate-400 mt-1">Não iniciadas (0%)</div>
        </div>

        <div className="bg-[#141821] border border-red-500/30 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">Atrasadas</span>
            <span className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center text-sm">⚠️</span>
          </div>
          <div className="text-3xl font-extrabold text-red-400 mt-2">{metrics.overdue}</div>
          <div className="text-[11px] text-red-300/80 mt-1">Prazo vencido e não concluídas</div>
        </div>

        <div className="bg-[#141821] border border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">% de Conclusão</span>
            <span className="text-xs font-mono font-bold text-emerald-400">{metrics.avgCompletion}%</span>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">{metrics.avgCompletion}%</div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${metrics.avgCompletion}%`,
                backgroundColor: metrics.avgCompletion >= 80 ? '#10b981' : metrics.avgCompletion >= 40 ? '#f97316' : '#ef4444',
              }}
            />
          </div>
        </div>
      </div>

      {/* Evolução Diária e Semanal das Listas (Todas as 12 Abas da Planilha + Novas) */}
      <div className="bg-[#141821] border border-slate-800/90 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>📈 Evolução Diária e Semanal por Lista / Aba Operacional</span>
            </h2>
            <p className="text-xs text-slate-400">
              Clique em qualquer lista abaixo para abrir seus registros, editar células ou personalizar colunas.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Concluído (100%)
            </span>
            <span className="flex items-center gap-1.5 text-orange-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span> Parcial / Iniciada (50%)
            </span>
            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block"></span> Não Iniciado (0%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {listEvolution.map(({ list, total, done, partial, pending, avg }) => (
            <div
              key={list.id}
              onClick={() => onSelectList(list.id)}
              className="group cursor-pointer rounded-xl bg-[#0e1218] hover:bg-[#181f2c] border border-slate-800/90 hover:border-emerald-500/50 p-4 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: list.color || '#10b981' }}
                    />
                    <span className="font-bold text-sm text-white truncate group-hover:text-emerald-400 transition">
                      {list.name}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold ${
                      avg >= 80
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : avg >= 40
                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {avg}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{list.description}</p>
              </div>

              <div className="mt-3">
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden flex">
                  {total > 0 && (
                    <>
                      <div
                        style={{ width: `${(done / total) * 100}%` }}
                        className="bg-emerald-500 h-full transition-all"
                        title={`Concluídas: ${done}`}
                      />
                      <div
                        style={{ width: `${(partial / total) * 100}%` }}
                        className="bg-orange-500 h-full transition-all"
                        title={`Parciais: ${partial}`}
                      />
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>Total: <strong className="text-slate-200">{total}</strong></span>
                  <span className="text-emerald-400">✓ {done} feitas</span>
                  <span className="text-orange-400">⚡ {partial} parciais</span>
                  <span>⏳ {pending} pend.</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráficos Lado a Lado: Tarefas por Responsável & Tarefas por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarefas por Responsável */}
        <div className="bg-[#141821] border border-slate-800/90 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">👷 Tarefas por Responsável</h3>
              <p className="text-xs text-slate-400">Carga de trabalho e taxa de entrega de cada membro da equipe</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{byResponsible.length} responsáveis ativos</span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {byResponsible.map(({ user, total, done, partial, pending, pct }) => (
              <div key={user.id} className="bg-[#0e1218] border border-slate-800/70 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: user.avatarColor || '#10b981' }}
                    >
                      {user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{user.name}</div>
                      <div className="text-[10px] text-slate-400">{user.jobTitle}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-400">{done}/{total} concluídas</span>
                    <div className="text-[10px] text-slate-400">
                      {partial} em andamento • {pending} pendentes
                    </div>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                  <div style={{ width: `${(done / total) * 100}%` }} className="bg-emerald-500 h-full" />
                  <div style={{ width: `${(partial / total) * 100}%` }} className="bg-orange-500 h-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tarefas por Categoria */}
        <div className="bg-[#141821] border border-slate-800/90 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">🏷️ Tarefas por Categoria</h3>
              <p className="text-xs text-slate-400">Distribuição operacional por frente de trabalho</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{byCategory.length} categorias</span>
          </div>

          <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
            {byCategory.map(({ category, total, done, pct }) => (
              <div key={category.id} className="bg-[#0e1218] border border-slate-800/70 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-xs font-bold text-white">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-semibold">{total} tarefas</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-emerald-400 font-bold">
                      {pct}% concluído
                    </span>
                  </div>
                </div>
                {category.description && (
                  <p className="text-[11px] text-slate-400 mb-2">{category.description}</p>
                )}
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: category.color || '#10b981' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CONSTRUTOR DE LISTAS PERSONALIZADAS (REQUISITO 2 - 100% EDITÁVEL E NO-CODE)
// ============================================================================
window.ListBuilderView = function ({
  db,
  selectedListId,
  onSelectList,
  onUpdateList,
  onCreateList,
  onDuplicateList,
  onDeleteList,
  onOpenListTasks,
  showToast,
}) {
  const activeList = db.lists.find((l) => l.id === selectedListId) || db.lists[0];
  const [newFieldName, setNewFieldName] = React.useState('');
  const [newFieldType, setNewFieldType] = React.useState('short_text');
  const [newFieldRequired, setNewFieldRequired] = React.useState(false);
  const [newFieldOptionsText, setNewFieldOptionsText] = React.useState('Opção 1, Opção 2, Opção 3');
  const [draggedFieldIdx, setDraggedFieldIdx] = React.useState(null);
  const [editingFieldId, setEditingFieldId] = React.useState(null);

  // Criação rápida de Nova Lista pelo Construtor
  const [creatingNewList, setCreatingNewList] = React.useState(false);
  const [newListName, setNewListName] = React.useState('CHECKLIST OPERACIONAL');
  const [newListCategory, setNewListCategory] = React.useState('Operacional Diário');
  const [newListColor, setNewListColor] = React.useState('#10b981');
  const [newListDesc, setNewListDesc] = React.useState('Lista personalizada criada no Construtor de Listas.');

  if (!activeList) return null;

  const sortedFields = [...(activeList.fields || [])].sort((a, b) => a.order - b.order);

  const handleCreateCustomList = (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const created = onCreateList({
      name: newListName.trim(),
      category: newListCategory.trim() || 'Personalizada',
      color: newListColor,
      description: newListDesc.trim(),
    });
    setCreatingNewList(false);
    if (created) {
      onSelectList(created.id);
      showToast(`Lista "${created.name}" criada com sucesso!`);
    }
  };

  const handleAddField = (e) => {
    e.preventDefault();
    if (!newFieldName.trim()) {
      showToast('Informe um nome para o novo campo.', 'warning');
      return;
    }
    const cleanKey =
      'cf_' +
      newFieldName
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_') +
      '_' +
      Math.random().toString(36).substring(2, 5);

    const options =
      newFieldType === 'select' || newFieldType === 'multi_select'
        ? newFieldOptionsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((label, i) => ({
              id: 'opt_' + Date.now() + '_' + i,
              label,
              color: ['#10b981', '#3b82f6', '#f97316', '#8b5cf6', '#eab308', '#ec4899'][i % 6],
            }))
        : undefined;

    const newField = {
      id: 'fld_' + Date.now(),
      key: cleanKey,
      name: newFieldName.trim(),
      type: newFieldType,
      required: newFieldRequired,
      visible: true,
      width: 180,
      order: sortedFields.length + 1,
      options,
      isSystemField: false,
    };

    onUpdateList(
      activeList.id,
      { fields: [...sortedFields, newField] },
      `Adicionou campo personalizado "${newField.name}" (${window.FIELD_TYPE_META[newFieldType]?.label || newFieldType})`
    );
    setNewFieldName('');
    setNewFieldRequired(false);
    showToast(`Campo "${newField.name}" adicionado à lista!`);
  };

  const handleMoveField = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= sortedFields.length) return;
    const copy = [...sortedFields];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    const reordered = copy.map((f, i) => ({ ...f, order: i + 1 }));
    onUpdateList(activeList.id, { fields: reordered }, `Reordenou o campo "${temp.name}"`);
  };

  const handleDropField = (targetIdx) => {
    if (draggedFieldIdx === null || draggedFieldIdx === targetIdx) return;
    const copy = [...sortedFields];
    const [moved] = copy.splice(draggedFieldIdx, 1);
    copy.splice(targetIdx, 0, moved);
    const reordered = copy.map((f, i) => ({ ...f, order: i + 1 }));
    setDraggedFieldIdx(null);
    onUpdateList(activeList.id, { fields: reordered }, `Reorganizou ordem do campo "${moved.name}" via Drag & Drop`);
  };

  const handleUpdateSingleField = (fieldId, patch, reason) => {
    const updatedFields = sortedFields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f));
    onUpdateList(activeList.id, { fields: updatedFields }, reason || 'Atualizou configuração de campo');
  };

  const handleDeleteField = (field) => {
    if (!window.confirm(`Deseja realmente excluir o campo "${field.name}" desta lista?`)) return;
    const remaining = sortedFields
      .filter((f) => f.id !== field.id)
      .map((f, idx) => ({ ...f, order: idx + 1 }));
    onUpdateList(activeList.id, { fields: remaining }, `Excluiu o campo "${field.name}"`);
    showToast(`Campo "${field.name}" removido da lista.`, 'warning');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Barra Superior do Construtor de Listas */}
      <div className="bg-[#141821] border border-slate-800/90 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Construtor Dinâmico No-Code
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            🛠️ Construtor de Listas e Campos Personalizados
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Crie novas listas, adicione qualquer um dos 14 tipos de campos, defina campos obrigatórios, edite opções e arraste para reordenar as colunas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={activeList.id}
            onChange={(e) => onSelectList(e.target.value)}
            className="bg-[#0b0d11] border border-slate-700 text-slate-100 text-xs font-bold rounded-xl px-3.5 py-2.5"
          >
            {db.lists.map((l) => (
              <option key={l.id} value={l.id}>
                📋 {l.name} ({l.fields?.length || 0} campos)
              </option>
            ))}
          </select>

          <button
            onClick={() => setCreatingNewList(!creatingNewList)}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
          >
            ＋ Criar Nova Lista do Zero
          </button>

          <button
            onClick={() => onDuplicateList(activeList.id)}
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
          >
            📑 Duplicar Lista
          </button>

          <button
            onClick={onOpenListTasks}
            className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
          >
            Ver Registros da Lista →
          </button>
        </div>
      </div>

      {/* Formulário Expansível para Criar Nova Lista (Ex: CHECKLIST OPERACIONAL) */}
      {creatingNewList && (
        <form
          onSubmit={handleCreateCustomList}
          className="bg-[#181f2c] border-2 border-emerald-500/50 rounded-2xl p-5 space-y-4 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
              ✨ Criar Nova Lista Personalizada (Com Os 8 Campos Base + Campos Livres)
            </h3>
            <button
              type="button"
              onClick={() => setCreatingNewList(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Fechar
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Nova Lista *</label>
              <input
                type="text"
                required
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Ex: CHECKLIST OPERACIONAL"
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Grupo / Categoria da Lista</label>
              <input
                type="text"
                value={newListCategory}
                onChange={(e) => setNewListCategory(e.target.value)}
                placeholder="Ex: Operacional Diário"
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cor de Identificação</label>
              <input
                type="color"
                value={newListColor}
                onChange={(e) => setNewListColor(e.target.value)}
                className="w-full h-10 bg-[#0b0d11] border border-slate-700 rounded-xl px-2 py-1 cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição / Objetivo da Lista</label>
            <input
              type="text"
              value={newListDesc}
              onChange={(e) => setNewListDesc(e.target.value)}
              className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreatingNewList(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              ✓ Criar Lista Agora
            </button>
          </div>
        </form>
      )}

      {/* Propriedades Gerais da Lista Selecionada */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#141821] border border-slate-800/90 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5">
            1. Configurações da Lista Ativa
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Nome da Lista (Editável)</label>
            <input
              type="text"
              value={activeList.name}
              onChange={(e) => onUpdateList(activeList.id, { name: e.target.value }, 'Renomeou a lista')}
              className="w-full bg-[#0b0d11] border border-slate-700/80 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Categoria / Agrupamento</label>
            <input
              type="text"
              value={activeList.category || ''}
              onChange={(e) => onUpdateList(activeList.id, { category: e.target.value }, 'Alterou categoria da lista')}
              className="w-full bg-[#0b0d11] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Descrição</label>
            <textarea
              rows={2}
              value={activeList.description || ''}
              onChange={(e) => onUpdateList(activeList.id, { description: e.target.value }, 'Editou descrição da lista')}
              className="w-full bg-[#0b0d11] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Cor Visual da Lista</label>
              <input
                type="color"
                value={activeList.color || '#10b981'}
                onChange={(e) => onUpdateList(activeList.id, { color: e.target.value }, 'Alterou cor da lista')}
                className="w-20 h-9 rounded-lg bg-[#0b0d11] border border-slate-700 p-1 cursor-pointer"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none bg-[#0b0d11] border border-slate-800 px-3 py-2 rounded-xl">
              <input
                type="checkbox"
                checked={activeList.autoCalculateFormula !== false}
                onChange={(e) =>
                  onUpdateList(
                    activeList.id,
                    { autoCalculateFormula: e.target.checked },
                    'Alterou regra de cálculo automático de progresso'
                  )
                }
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <span className="text-xs text-slate-300 font-medium">
                Fórmula Excel Automática (<code className="text-emerald-400">Iniciada/Finalizada → %</code>)
              </span>
            </label>
          </div>

          {db.lists.length > 1 && (
            <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">Ações destrutivas desta lista:</span>
              <button
                type="button"
                onClick={() => onDeleteList(activeList.id)}
                className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-semibold transition"
              >
                🗑️ Excluir Lista
              </button>
            </div>
          )}

          {/* Adicionar Novo Campo Personalizado (14 Tipos) */}
          <form onSubmit={handleAddField} className="pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
              2. Adicionar Novo Campo / Coluna
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Campo *</label>
              <input
                type="text"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="Ex: Custo Estimado, Nº OS, Assinatura do Encarregado..."
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tipo do Campo (14 Tipos Disponíveis)
              </label>
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value)}
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                {Object.entries(window.FIELD_TYPE_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label} — {meta.desc}
                  </option>
                ))}
              </select>
            </div>

            {(newFieldType === 'select' || newFieldType === 'multi_select') && (
              <div>
                <label className="block text-xs font-semibold text-orange-300 mb-1">
                  Opções de Seleção (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={newFieldOptionsText}
                  onChange={(e) => setNewFieldOptionsText(e.target.value)}
                  placeholder="Ex: Aprovado, Em Revisão, Pendente"
                  className="w-full bg-[#0b0d11] border border-orange-500/40 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={newFieldRequired}
                onChange={(e) => setNewFieldRequired(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <span>Campo de preenchimento obrigatório</span>
            </label>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition"
            >
              ＋ Adicionar Campo à Lista
            </button>
          </form>
        </div>

        {/* Lista de Campos da Lista com Drag & Drop, Edição de Nome, Tipo, Obrigatoriedade e Opções */}
        <div className="lg:col-span-2 bg-[#141821] border border-slate-800/90 rounded-2xl p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                3. Estrutura de Campos / Colunas de "{activeList.name}" ({sortedFields.length} campos)
              </h2>
              <p className="text-xs text-slate-400">
                Arraste e solte os cards (ou use as setas ↑↓) para alterar a ordem das colunas. Tudo pode ser renomeado, mudado de tipo ou excluído.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {sortedFields.map((field, idx) => {
              const isEditingThis = editingFieldId === field.id;
              return (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => setDraggedFieldIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropField(idx)}
                  className={`rounded-xl border p-3.5 transition ${
                    draggedFieldIdx === idx
                      ? 'border-emerald-500 bg-emerald-950/20 opacity-60'
                      : 'border-slate-800/90 bg-[#0e1218] hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                      <span
                        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-white px-1.5 py-1 rounded bg-slate-800/80 text-xs font-mono"
                        title="Arraste para reordenar"
                      >
                        ⠿ #{idx + 1}
                      </span>

                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) =>
                          handleUpdateSingleField(
                            field.id,
                            { name: e.target.value },
                            `Renomeou o campo "${field.name}" para "${e.target.value}"`
                          )
                        }
                        className="bg-[#141821] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none flex-1"
                      />

                      <select
                        value={field.type}
                        onChange={(e) =>
                          handleUpdateSingleField(
                            field.id,
                            {
                              type: e.target.value,
                              options:
                                (e.target.value === 'select' || e.target.value === 'multi_select') && !field.options
                                  ? [
                                      { id: 'opt_1', label: 'Opção 1', color: '#10b981' },
                                      { id: 'opt_2', label: 'Opção 2', color: '#f97316' },
                                    ]
                                  : field.options,
                            },
                            `Alterou tipo do campo "${field.name}" para ${e.target.value}`
                          )
                        }
                        className="bg-[#141821] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-semibold"
                      >
                        {Object.entries(window.FIELD_TYPE_META).map(([k, m]) => (
                          <option key={k} value={k}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer bg-[#141821] px-2.5 py-1 rounded-lg border border-slate-800">
                        <input
                          type="checkbox"
                          checked={Boolean(field.required)}
                          onChange={(e) =>
                            handleUpdateSingleField(
                              field.id,
                              { required: e.target.checked },
                              `Marcou campo "${field.name}" como ${e.target.checked ? 'Obrigatório' : 'Opcional'}`
                            )
                          }
                          className="accent-orange-500"
                        />
                        <span className={field.required ? 'text-orange-400 font-bold' : 'text-slate-400'}>
                          {field.required ? 'Obrigatório' : 'Opcional'}
                        </span>
                      </label>

                      <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer bg-[#141821] px-2.5 py-1 rounded-lg border border-slate-800">
                        <input
                          type="checkbox"
                          checked={field.visible !== false}
                          onChange={(e) =>
                            handleUpdateSingleField(
                              field.id,
                              { visible: e.target.checked },
                              `${e.target.checked ? 'Exibiu' : 'Ocultou'} coluna "${field.name}"`
                            )
                          }
                          className="accent-emerald-500"
                        />
                        <span>Visível</span>
                      </label>

                      {(field.type === 'select' || field.type === 'multi_select') && !field.isSystemField && (
                        <button
                          type="button"
                          onClick={() => setEditingFieldId(isEditingThis ? null : field.id)}
                          className="px-2.5 py-1 rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/30 text-xs font-semibold"
                        >
                          ⚙️ Opções ({(field.options || []).length})
                        </button>
                      )}

                      <div className="flex items-center bg-[#141821] rounded-lg border border-slate-800">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveField(idx, -1)}
                          className="px-2 py-1 text-xs text-slate-300 hover:text-white disabled:opacity-30"
                          title="Subir campo"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={idx === sortedFields.length - 1}
                          onClick={() => handleMoveField(idx, 1)}
                          className="px-2 py-1 text-xs text-slate-300 hover:text-white disabled:opacity-30"
                          title="Descer campo"
                        >
                          ↓
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteField(field)}
                        className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 text-xs font-semibold"
                        title="Excluir campo"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Editor de Opções para Campos de Seleção Personalizados */}
                  {isEditingThis && (field.type === 'select' || field.type === 'multi_select') && (
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-orange-400">
                          Opções de Seleção do Campo "{field.name}"
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextOpts = [
                              ...(field.options || []),
                              { id: 'opt_' + Date.now(), label: 'Nova Opção', color: '#3b82f6' },
                            ];
                            handleUpdateSingleField(field.id, { options: nextOpts }, `Adicionou opção em "${field.name}"`);
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold"
                        >
                          ＋ Nova Opção
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(field.options || []).map((opt, oIdx) => (
                          <div key={opt.id} className="flex items-center gap-2 bg-[#141821] p-2 rounded-lg border border-slate-800">
                            <input
                              type="color"
                              value={opt.color || '#10b981'}
                              onChange={(e) => {
                                const nextOpts = field.options.map((o, i) =>
                                  i === oIdx ? { ...o, color: e.target.value } : o
                                );
                                handleUpdateSingleField(field.id, { options: nextOpts });
                              }}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                            />
                            <input
                              type="text"
                              value={opt.label}
                              onChange={(e) => {
                                const nextOpts = field.options.map((o, i) =>
                                  i === oIdx ? { ...o, label: e.target.value } : o
                                );
                                handleUpdateSingleField(field.id, { options: nextOpts });
                              }}
                              className="bg-[#0b0d11] border border-slate-700 rounded px-2 py-1 text-xs text-white flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const nextOpts = field.options.filter((_, i) => i !== oIdx);
                                handleUpdateSingleField(field.id, { options: nextOpts });
                              }}
                              className="text-red-400 hover:text-red-300 text-xs px-1"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
