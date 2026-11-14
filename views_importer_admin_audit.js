// ============================================================================
// MÓDULO 3: IMPORTADOR INTELIGENTE DE PLANILHA EXCEL + ADMINISTRAÇÃO + AUDITORIA
// ============================================================================

window.ExcelImporterView = function ({
  db,
  onImportSheetsToDatabase,
  onExportExcel,
  onExportPdf,
  showToast,
}) {
  const [sheetPreviews, setSheetPreviews] = React.useState([]);
  const [activeSheetIdx, setActiveSheetIdx] = React.useState(0);
  const [duplicateStrategy, setDuplicateStrategy] = React.useState('update'); // 'update' | 'skip' | 'create'
  const [loadedFileName, setLoadedFileName] = React.useState('');

  // Carrega automaticamente a planilha Excel original no importador ao abrir a tela pela primeira vez
  const loadOriginalEmbeddedExcel = () => {
    if (typeof XLSX === 'undefined' || !window.ORIGINAL_EXCEL_BASE64) {
      showToast('Aguarde o carregamento da biblioteca SheetJS...', 'warning');
      return;
    }
    try {
      const wb = XLSX.read(window.ORIGINAL_EXCEL_BASE64, { type: 'base64' });
      const parsed = window.parseWorkbookToPreviews(wb, db);
      setSheetPreviews(parsed);
      setActiveSheetIdx(0);
      setLoadedFileName('media_1794627820294_7f52eb2b.xlsx (Planilha Original do Usuário — 12 Abas)');
      showToast(`12 abas lidas com sucesso da planilha original!`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao processar planilha original.', 'error');
    }
  };

  React.useEffect(() => {
    if (sheetPreviews.length === 0 && window.ORIGINAL_EXCEL_BASE64 && typeof XLSX !== 'undefined') {
      loadOriginalEmbeddedExcel();
    }
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const parsed = window.parseWorkbookToPreviews(wb, db);
        setSheetPreviews(parsed);
        setActiveSheetIdx(0);
        setLoadedFileName(file.name);
        showToast(`Arquivo "${file.name}" analisado: ${parsed.length} aba(s) identificada(s)!`);
      } catch (err) {
        console.error(err);
        showToast('Não foi possível ler o arquivo Excel selecionado.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const currentSheet = sheetPreviews[activeSheetIdx] || null;

  const toggleSheetSelection = (idx) => {
    setSheetPreviews((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, selected: !s.selected } : s))
    );
  };

  const updateColumnMapping = (colName, targetField) => {
    setSheetPreviews((prev) =>
      prev.map((s, i) =>
        i === activeSheetIdx
          ? { ...s, columnMapping: { ...s.columnMapping, [colName]: targetField } }
          : s
      )
    );
  };

  const toggleSkipRow = (rowIdx) => {
    setSheetPreviews((prev) =>
      prev.map((s, i) => {
        if (i !== activeSheetIdx) return s;
        const nextRows = s.rows.map((r, rI) =>
          rI === rowIdx ? { ...r, skipRow: !r.skipRow } : r
        );
        return { ...s, rows: nextRows };
      })
    );
  };

  const handleConfirmImport = () => {
    const selectedSheets = sheetPreviews.filter((s) => s.selected);
    if (selectedSheets.length === 0) {
      showToast('Selecione pelo menos uma aba para importar.', 'warning');
      return;
    }
    onImportSheetsToDatabase(selectedSheets, duplicateStrategy);
  };

  const totalSelectedSheets = sheetPreviews.filter((s) => s.selected).length;
  const totalSelectedRows = sheetPreviews
    .filter((s) => s.selected)
    .reduce((acc, s) => acc + s.rows.filter((r) => !r.skipRow).length, 0);
  const totalDuplicates = sheetPreviews
    .filter((s) => s.selected)
    .reduce((acc, s) => acc + s.rows.filter((r) => r.isDuplicate && !r.skipRow).length, 0);

  return (
    <div className="space-y-6 pb-14">
      {/* Cabeçalho do Importador / Exportador */}
      <div className="bg-[#141821] border border-slate-800/90 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Importador & Exportador Inteligente (SheetJS + PDF)
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            📥 Importação e Exportação da Planilha Excel
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Lê todas as abas (visíveis e ocultas), identifica colunas automaticamente, permite mapear campos, detecta registros duplicados e exibe prévia completa antes de salvar no banco.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-950/50 transition">
            📂 Enviar Arquivo Excel (.xlsx / .xls / .csv)
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={loadOriginalEmbeddedExcel}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-emerald-500/30 transition"
          >
            🔄 Recarregar Planilha Original (12 Abas)
          </button>

          <button
            onClick={() => onExportExcel()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition"
          >
            📤 Exportar Banco Completo (.xlsx)
          </button>

          <button
            onClick={() => onExportPdf()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 font-semibold text-xs border border-orange-500/30 transition"
          >
            🖨️ Exportar Relatório Geral PDF
          </button>
        </div>
      </div>

      {sheetPreviews.length > 0 && (
        <>
          {/* Painel de Controle de Importação: Seleção de Abas + Tratamento de Duplicados + Botão Confirmar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Passo 1: Selecionar Abas da Planilha */}
            <div className="bg-[#141821] border border-slate-800/90 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    1. Abas Identificadas ({sheetPreviews.length})
                  </h2>
                  <p className="text-[11px] text-slate-400 truncate max-w-[260px]">
                    Arquivo: {loadedFileName}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setSheetPreviews((prev) => prev.map((s) => ({ ...s, selected: true })))
                    }
                    className="text-[11px] text-emerald-400 hover:underline font-semibold"
                  >
                    Todas
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSheetPreviews((prev) => prev.map((s) => ({ ...s, selected: false })))
                    }
                    className="text-[11px] text-slate-400 hover:underline"
                  >
                    Nenhuma
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {sheetPreviews.map((sh, idx) => {
                  const dupCount = sh.rows.filter((r) => r.isDuplicate).length;
                  return (
                    <div
                      key={sh.sheetName}
                      onClick={() => setActiveSheetIdx(idx)}
                      className={`cursor-pointer rounded-xl border p-2.5 flex items-center justify-between transition ${
                        activeSheetIdx === idx
                          ? 'bg-emerald-950/30 border-emerald-500/60'
                          : 'bg-[#0e1218] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={sh.selected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSheetSelection(idx)}
                          className="accent-emerald-500 w-4 h-4 rounded"
                        />
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{sh.sheetName}</span>
                            {sh.isHidden && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] text-slate-400 font-normal">
                                Aba Oculta no Excel
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {sh.rows.length} registros • {sh.detectedColumns.length} colunas
                            {dupCount > 0 && (
                              <span className="text-orange-400 ml-1">
                                ({dupCount} já existentes)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">→</span>
                    </div>
                  );
                })}
              </div>

              {/* Estratégia para Registros Duplicados */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-orange-400">
                  Tratamento de Registros Duplicados ({totalDuplicates} detectados):
                </label>
                <select
                  value={duplicateStrategy}
                  onChange={(e) => setDuplicateStrategy(e.target.value)}
                  className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="update">🔄 Atualizar registros existentes sem duplicar</option>
                  <option value="skip">⏭️ Ignorar registros que já existem no banco</option>
                  <option value="create">➕ Importar todos como novos registros</option>
                </select>

                <button
                  onClick={handleConfirmImport}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/60 transition"
                >
                  ✓ Importar {totalSelectedSheets} Aba(s) ({totalSelectedRows} Registros) para o Banco
                </button>
              </div>
            </div>

            {/* Passo 2 e 3: Mapeamento de Colunas + Prévia dos Dados da Aba Selecionada */}
            {currentSheet && (
              <div className="lg:col-span-2 bg-[#141821] border border-slate-800/90 rounded-2xl p-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-base font-extrabold text-white">
                      2. Mapeamento de Colunas & Prévia — Aba "{currentSheet.sheetName}"
                    </h2>
                    <p className="text-xs text-slate-400">
                      Linha de cabeçalho identificada automaticamente na linha {currentSheet.headerRowIndex + 1} da planilha.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-mono text-xs font-bold">
                    {currentSheet.rows.length} linhas de dados válidas
                  </span>
                </div>

                {/* Mapeamento de Colunas */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5">
                    Mapeamento das Colunas da Planilha → Campos do Sistema
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {currentSheet.detectedColumns.map((colName) => (
                      <div
                        key={colName}
                        className="bg-[#0e1218] border border-slate-800 rounded-xl p-2.5 space-y-1"
                      >
                        <div className="text-[11px] font-bold text-emerald-400 truncate">
                          Coluna Excel: "{colName}"
                        </div>
                        <select
                          value={currentSheet.columnMapping[colName] || 'title'}
                          onChange={(e) => updateColumnMapping(colName, e.target.value)}
                          className="w-full bg-[#141821] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                        >
                          <option value="title">📌 Título / Atividade Principal</option>
                          <option value="statusId">🎨 Status / Cor (NÃO INICIADO, PARCIAL, CONCLUÍDO)</option>
                          <option value="started">☑️ Etapa 1: Iniciada (Booleano)</option>
                          <option value="finished">✅ Etapa 2: Finalizada (Booleano)</option>
                          <option value="progress">📊 Concluída em % / % Qualidade</option>
                          <option value="responsibleName">👷 Responsável / Chefe de Equipe</option>
                          <option value="teamName">🛡️ Equipe</option>
                          <option value="executionDate">📅 Data de Execução</option>
                          <option value="dueDate">⏰ Prazo</option>
                          <option value="priorityName">⚡ Prioridade</option>
                          <option value="serviceNote">🔢 Nº da Nota / Obra</option>
                          <option value="observations">📝 Observações</option>
                          <option value={'custom:' + colName}>
                            ✨ Criar Campo Personalizado: "{colName}"
                          </option>
                          <option value="ignore">🚫 Ignorar esta coluna</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabela de Prévia antes da Importação */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    3. Prévia dos Registros Antes da Importação (Desmarque linhas se quiser ignorar)
                  </h3>
                  <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-[340px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#0e1218] border-b border-slate-800 text-[10px] font-bold uppercase text-slate-400">
                          <th className="p-2.5 text-center w-12">Imp.</th>
                          <th className="p-2.5 w-16">Linha</th>
                          <th className="p-2.5 w-28">Status Duplic.</th>
                          {currentSheet.detectedColumns.map((col) => (
                            <th key={col} className="p-2.5 border-l border-slate-800">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {currentSheet.rows.map((r, rIdx) => (
                          <tr
                            key={r.rowNumber}
                            className={
                              r.skipRow
                                ? 'opacity-40 bg-slate-900'
                                : r.isDuplicate
                                ? 'bg-orange-950/15'
                                : 'hover:bg-[#19202e]'
                            }
                          >
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={!r.skipRow}
                                onChange={() => toggleSkipRow(rIdx)}
                                className="accent-emerald-500"
                              />
                            </td>
                            <td className="p-2 font-mono text-[11px] text-slate-400">
                              #{r.rowNumber}
                            </td>
                            <td className="p-2">
                              {r.isDuplicate ? (
                                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold">
                                  Já existe
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                  Novo
                                </span>
                              )}
                            </td>
                            {currentSheet.detectedColumns.map((col) => {
                              const rawVal = r.rawValues[col];
                              const target = currentSheet.columnMapping[col];
                              let displayVal = String(rawVal ?? '');
                              if (target === 'executionDate' && rawVal) {
                                displayVal = window.excelSerialToDateString(rawVal);
                              } else if (target === 'progress' && rawVal !== '' && Number(rawVal) <= 1) {
                                displayVal = Math.round(Number(rawVal) * 100) + '%';
                              } else if ((target === 'started' || target === 'finished') && (rawVal === 1 || rawVal === '1' || rawVal === true)) {
                                displayVal = 'SIM (1)';
                              } else if ((target === 'started' || target === 'finished') && (rawVal === 0 || rawVal === '0' || rawVal === false)) {
                                displayVal = 'NÃO (0)';
                              }
                              return (
                                <td key={col} className="p-2 border-l border-slate-800/50 text-slate-200">
                                  {displayVal}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// CONFIGURAÇÕES ADMINISTRATIVAS COMPLETAS (REQUISITO 7 — AUTONOMIA TOTAL)
// ============================================================================
window.AdminSettingsView = function ({
  db,
  setDb,
  onResetFactory,
  onSelectListAndOpenBuilder,
  showToast,
  logAdminChange,
}) {
  const [adminTab, setAdminTab] = React.useState('categories');

  // Estados para adição rápida nos cadastros administrativos
  const [newCatName, setNewCatName] = React.useState('');
  const [newCatColor, setNewCatColor] = React.useState('#10b981');
  const [newCatDesc, setNewCatDesc] = React.useState('');

  const [newStatusName, setNewStatusName] = React.useState('');
  const [newStatusColor, setNewStatusColor] = React.useState('#3b82f6');
  const [newStatusCat, setNewStatusCat] = React.useState('in_progress');

  const [newPriorityName, setNewPriorityName] = React.useState('');
  const [newPriorityColor, setNewPriorityColor] = React.useState('#f97316');
  const [newPriorityLevel, setNewPriorityLevel] = React.useState(2);

  const [newUserName, setNewUserName] = React.useState('');
  const [newUserEmail, setNewUserEmail] = React.useState('');
  const [newUserJob, setNewUserJob] = React.useState('');
  const [newUserRole, setNewUserRole] = React.useState('operator');
  const [newUserTeam, setNewUserTeam] = React.useState(db.teams[0]?.id || '');
  const [newUserColor, setNewUserColor] = React.useState('#10b981');

  const [newTeamName, setNewTeamName] = React.useState('');
  const [newTeamLeader, setNewTeamLeader] = React.useState('');
  const [newTeamColor, setNewTeamColor] = React.useState('#3b82f6');
  const [newTeamDesc, setNewTeamDesc] = React.useState('');

  return (
    <div className="space-y-6 pb-14">
      <div className="bg-[#141821] border border-slate-800/90 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Autonomia Administrativa 100% Sem Programador
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            ⚙️ Central de Configurações Administrativas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Controle total sobre Categorias, Status, Prioridades, Cores, Equipes, Responsáveis, Usuários, Permissões, Listas e Banco de Dados Firebase.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const dataStr =
                'data:text/json;charset=utf-8,' +
                encodeURIComponent(JSON.stringify(db, null, 2));
              const a = document.createElement('a');
              a.href = dataStr;
              a.download = `CheckFlow_Backup_DB_${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              showToast('Backup JSON completo exportado!');
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-emerald-500/30"
          >
            💾 Exportar Backup JSON
          </button>

          <button
            onClick={() => {
              if (
                window.confirm(
                  'Deseja restaurar os dados originais de fábrica das 12 abas da planilha Excel?'
                )
              ) {
                onResetFactory();
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold border border-red-500/30"
          >
            🔄 Restaurar Base Original da Planilha
          </button>
        </div>
      </div>

      {/* Abas de Navegação Administrativa */}
      <div className="flex flex-wrap gap-1.5 bg-[#141821] p-1.5 rounded-2xl border border-slate-800">
        {[
          { id: 'categories', label: '🏷️ Categorias' },
          { id: 'statuses', label: '🎨 Status & Cores' },
          { id: 'priorities', label: '⚡ Prioridades' },
          { id: 'users', label: '👷 Responsáveis & Usuários' },
          { id: 'teams', label: '🛡️ Equipes' },
          { id: 'lists', label: '📋 Gestão de Listas' },
          { id: 'permissions', label: '🔐 Permissões & Perfis' },
          { id: 'settings', label: '🔥 Identidade Visual & Firebase' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setAdminTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              adminTab === t.id
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ABA 1: CATEGORIAS */}
      {adminTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCatName.trim()) return;
              const cat = {
                id: 'cat_' + Date.now(),
                name: newCatName.trim(),
                color: newCatColor,
                icon: 'Tag',
                description: newCatDesc.trim(),
              };
              setDb((prev) => ({ ...prev, categories: [...prev.categories, cat] }));
              logAdminChange('Categorias', 'Nova Categoria', cat.name);
              setNewCatName('');
              setNewCatDesc('');
              showToast(`Categoria "${cat.name}" criada!`);
            }}
            className="bg-[#141821] border border-slate-800 rounded-2xl p-5 space-y-4 h-fit"
          >
            <h3 className="text-sm font-bold text-emerald-400 uppercase">＋ Criar Nova Categoria</h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Nome da Categoria *</label>
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ex: Manutenção Preventiva"
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Cor Visual</label>
              <input
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="w-full h-10 bg-[#0b0d11] border border-slate-700 rounded-xl p-1 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Descrição</label>
              <input
                type="text"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Salvar Categoria
            </button>
          </form>

          <div className="lg:col-span-2 bg-[#141821] border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-white">
              Categorias Cadastradas ({db.categories.length})
            </h3>
            <div className="space-y-2.5">
              {db.categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex flex-wrap items-center justify-between gap-3 bg-[#0e1218] border border-slate-800 rounded-xl p-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                    <input
                      type="color"
                      value={cat.color || '#10b981'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDb((prev) => ({
                          ...prev,
                          categories: prev.categories.map((c) =>
                            c.id === cat.id ? { ...c, color: val } : c
                          ),
                        }));
                      }}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDb((prev) => ({
                          ...prev,
                          categories: prev.categories.map((c) =>
                            c.id === cat.id ? { ...c, name: val } : c
                          ),
                        }));
                      }}
                      className="bg-[#141821] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white flex-1"
                    />
                  </div>
                  <input
                    type="text"
                    value={cat.description || ''}
                    placeholder="Descrição..."
                    onChange={(e) => {
                      const val = e.target.value;
                      setDb((prev) => ({
                        ...prev,
                        categories: prev.categories.map((c) =>
                          c.id === cat.id ? { ...c, description: val } : c
                        ),
                      }));
                    }}
                    className="bg-[#141821] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 flex-1"
                  />
                  <button
                    onClick={() => {
                      if (!window.confirm(`Excluir categoria "${cat.name}"?`)) return;
                      setDb((prev) => ({
                        ...prev,
                        categories: prev.categories.filter((c) => c.id !== cat.id),
                      }));
                      logAdminChange('Categorias', cat.name, 'Excluída');
                      showToast('Categoria excluída.', 'warning');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-bold"
                  >
                    🗑️ Excluir
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: STATUS & CORES */}
      {adminTab === 'statuses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newStatusName.trim()) return;
              const st = {
                id: 'st_' + Date.now(),
                name: newStatusName.trim().toUpperCase(),
                color: newStatusColor,
                category: newStatusCat,
                order: db.statuses.length + 1,
              };
              setDb((prev) => ({ ...prev, statuses: [...prev.statuses, st] }));
              logAdminChange('Status', 'Novo Status', st.name);
              setNewStatusName('');
              showToast(`Status "${st.name}" criado!`);
            }}
            className="bg-[#141821] border border-slate-800 rounded-2xl p-5 space-y-4 h-fit"
          >
            <h3 className="text-sm font-bold text-emerald-400 uppercase">＋ Criar Novo Status</h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Nome do Status *</label>
              <input
                type="text"
                required
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                placeholder="Ex: EM VALIDAÇÃO"
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Comportamento no Sistema</label>
              <select
                value={newStatusCat}
                onChange={(e) => setNewStatusCat(e.target.value)}
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="todo">Pendente / Não Iniciado (0%)</option>
                <option value="in_progress">Em Andamento / Parcial (50%)</option>
                <option value="done">Concluído / Finalizado (100%)</option>
                <option value="blocked">Bloqueado / Aguardando</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Cor Visual</label>
              <input
                type="color"
                value={newStatusColor}
                onChange={(e) => setNewStatusColor(e.target.value)}
                className="w-full h-10 bg-[#0b0d11] border border-slate-700 rounded-xl p-1 cursor-pointer"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Salvar Status
            </button>
          </form>

          <div className="lg:col-span-2 bg-[#141821] border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-white">
              Status & Identificações Visuais ({db.statuses.length})
            </h3>
            {db.statuses.map((st) => (
              <div
                key={st.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-[#0e1218] border border-slate-800 rounded-xl p-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="color"
                    value={st.color}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDb((prev) => ({
                        ...prev,
                        statuses: prev.statuses.map((s) =>
                          s.id === st.id ? { ...s, color: val } : s
                        ),
                      }));
                    }}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={st.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDb((prev) => ({
                        ...prev,
                        statuses: prev.statuses.map((s) =>
                          s.id === st.id ? { ...s, name: val } : s
                        ),
                      }));
                    }}
                    className="bg-[#141821] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-extrabold text-white flex-1"
                  />
                </div>
                <select
                  value={st.category}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDb((prev) => ({
                      ...prev,
                      statuses: prev.statuses.map((s) =>
                        s.id === st.id ? { ...s, category: val } : s
                      ),
                    }));
                  }}
                  className="bg-[#141821] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="todo">Pendente (0%)</option>
                  <option value="in_progress">Em Andamento (50%)</option>
                  <option value="done">Concluído (100%)</option>
                  <option value="blocked">Bloqueado</option>
                </select>
                {db.statuses.length > 1 && (
                  <button
                    onClick={() => {
                      setDb((prev) => ({
                        ...prev,
                        statuses: prev.statuses.filter((s) => s.id !== st.id),
                      }));
                      showToast('Status removido.', 'warning');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-bold"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 3: PRIORIDADES */}
      {adminTab === 'priorities' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newPriorityName.trim()) return;
              const pr = {
                id: 'pr_' + Date.now(),
                name: newPriorityName.trim(),
                color: newPriorityColor,
                level: Number(newPriorityLevel) || 2,
                order: db.priorities.length + 1,
              };
              setDb((prev) => ({ ...prev, priorities: [...prev.priorities, pr] }));
              setNewPriorityName('');
              showToast(`Prioridade "${pr.name}" adicionada!`);
            }}
            className="bg-[#141821] border border-slate-800 rounded-2xl p-5 space-y-4 h-fit"
          >
            <h3 className="text-sm font-bold text-emerald-400 uppercase">＋ Nova Prioridade</h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Nome da Prioridade *</label>
              <input
                type="text"
                required
                value={newPriorityName}
                onChange={(e) => setNewPriorityName(e.target.value)}
                placeholder="Ex: Emergencial"
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Cor</label>
              <input
                type="color"
                value={newPriorityColor}
                onChange={(e) => setNewPriorityColor(e.target.value)}
                className="w-full h-10 bg-[#0b0d11] border border-slate-700 rounded-xl p-1"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Adicionar Prioridade
            </button>
          </form>

          <div className="lg:col-span-2 bg-[#141821] border border-slate-800 rounded-2xl p-5 space-y-2.5">
            <h3 className="text-base font-bold text-white">Prioridades ({db.priorities.length})</h3>
            {db.priorities.map((pr) => (
              <div
                key={pr.id}
                className="flex items-center justify-between gap-3 bg-[#0e1218] border border-slate-800 rounded-xl p-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="color"
                    value={pr.color}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDb((prev) => ({
                        ...prev,
                        priorities: prev.priorities.map((p) =>
                          p.id === pr.id ? { ...p, color: val } : p
                        ),
                      }));
                    }}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={pr.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDb((prev) => ({
                        ...prev,
                        priorities: prev.priorities.map((p) =>
                          p.id === pr.id ? { ...p, name: val } : p
                        ),
                      }));
                    }}
                    className="bg-[#141821] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white flex-1"
                  />
                </div>
                {db.priorities.length > 1 && (
                  <button
                    onClick={() =>
                      setDb((prev) => ({
                        ...prev,
                        priorities: prev.priorities.filter((p) => p.id !== pr.id),
                      }))
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-bold"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 4: RESPONSÁVEIS & USUÁRIOS */}
      {adminTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newUserName.trim()) return;
              const isFull = newUserRole === 'admin' || newUserRole === 'manager';
              const newUsr = {
                id: 'usr_' + Date.now(),
                name: newUserName.trim(),
                email: newUserEmail.trim() || `${newUserName.toLowerCase().replace(/\s+/g, '.')}@operacoes.com.br`,
                role: newUserRole,
                jobTitle: newUserJob.trim() || 'Responsável Operacional',
                teamId: newUserTeam,
                avatarColor: newUserColor,
                active: true,
                permissions: {
                  canCreateLists: isFull,
                  canDeleteLists: newUserRole === 'admin',
                  canEditSchema: isFull,
                  canCreateTasks: newUserRole !== 'viewer',
                  canEditTasks: newUserRole !== 'viewer',
                  canDeleteTasks: isFull,
                  canImportExport: true,
                  canManageUsers: newUserRole === 'admin',
                  canManageSettings: newUserRole === 'admin',
                },
              };
              setDb((prev) => ({ ...prev, users: [...prev.users, newUsr] }));
              logAdminChange('Responsáveis', 'Novo Responsável', newUsr.name);
              setNewUserName('');
              setNewUserEmail('');
              setNewUserJob('');
              showToast(`Responsável "${newUsr.name}" adicionado!`);
            }}
            className="bg-[#141821] border border-slate-800 rounded-2xl p-5 space-y-3.5 h-fit"
          >
            <h3 className="text-sm font-bold text-emerald-400 uppercase">
              ＋ Adicionar Responsável / Usuário
            </h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Ex: Marcos Oliveira"
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Cargo / Função</label>
              <input
                type="text"
                value={newUserJob}
                onChange={(e) => setNewUserJob(e.target.value)}
                placeholder="Ex: Engenheiro de Campo"
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">E-mail</label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="marcos@operacoes.com.br"
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Perfil de Permissão</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white"
                >
                  <option value="admin">Administrador</option>
                  <option value="manager">Gestor</option>
                  <option value="operator">Operador</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Equipe</label>
                <select
                  value={newUserTeam}
                  onChange={(e) => setNewUserTeam(e.target.value)}
                  className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white"
                >
                  {db.teams.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Cadastrar Responsável
            </button>
          </form>

          <div className="lg:col-span-2 bg-[#141821] border border-slate-800 rounded-2xl p-5 space-y-2.5">
            <h3 className="text-base font-bold text-white">
              Responsáveis & Usuários Cadastrados ({db.users.length})
            </h3>
            {db.users.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-[#0e1218] border border-slate-800 rounded-xl p-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: u.avatarColor || '#10b981' }}
                  >
                    {u.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={u.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDb((prev) => ({
                          ...prev,
                          users: prev.users.map((usr) =>
                            usr.id === u.id ? { ...usr, name: val } : usr
                          ),
                        }));
                      }}
                      className="w-full bg-[#141821] border border-slate-700 rounded px-2.5 py-1 text-xs font-bold text-white"
                    />
                    <input
                      type="text"
                      value={u.jobTitle || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDb((prev) => ({
                          ...prev,
                          users: prev.users.map((usr) =>
                            usr.id === u.id ? { ...usr, jobTitle: val } : usr
                          ),
                        }));
                      }}
                      className="w-full bg-transparent text-[11px] text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <select
                  value={u.role}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDb((prev) => ({
                      ...prev,
                      users: prev.users.map((usr) =>
                        usr.id === u.id ? { ...usr, role: val } : usr
                      ),
                    }));
                  }}
                  className="bg-[#141821] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-bold"
                >
                  <option value="admin">Administrador</option>
                  <option value="manager">Gestor</option>
                  <option value="operator">Operador</option>
                  <option value="viewer">Visualizador</option>
                </select>

                {db.users.length > 1 && (
                  <button
                    onClick={() => {
                      if (!window.confirm(`Remover responsável "${u.name}"?`)) return;
                      setDb((prev) => ({
                        ...prev,
                        users: prev.users.filter((usr) => usr.id !== u.id),
                      }));
                      showToast('Responsável removido.', 'warning');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-bold"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 5: EQUIPES */}
      {adminTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTeamName.trim()) return;
              const tm = {
                id: 'tm_' + Date.now(),
                name: newTeamName.trim(),
                leaderName: newTeamLeader.trim() || 'Não definido',
                color: newTeamColor,
                description: newTeamDesc.trim(),
                memberIds: [],
              };
              setDb((prev) => ({ ...prev, teams: [...prev.teams, tm] }));
              setNewTeamName('');
              setNewTeamLeader('');
              setNewTeamDesc('');
              showToast(`Equipe "${tm.name}" criada!`);
            }}
            className="bg-[#141821] border border-slate-800 rounded-2xl p-5 space-y-4 h-fit"
          >
            <h3 className="text-sm font-bold text-emerald-400 uppercase">＋ Criar Nova Equipe</h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Nome da Equipe *</label>
              <input
                type="text"
                required
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Ex: Equipe Linha Viva"
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Líder / Encarregado</label>
              <input
                type="text"
                value={newTeamLeader}
                onChange={(e) => setNewTeamLeader(e.target.value)}
                placeholder="Ex: Rosinaldo Oliveira"
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Cor da Equipe</label>
              <input
                type="color"
                value={newTeamColor}
                onChange={(e) => setNewTeamColor(e.target.value)}
                className="w-full h-10 bg-[#0b0d11] border border-slate-700 rounded-xl p-1"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Salvar Equipe
            </button>
          </form>

          <div className="lg:col-span-2 bg-[#141821] border border-slate-800 rounded-2xl p-5 space-y-2.5">
            <h3 className="text-base font-bold text-white">Equipes Operacionais ({db.teams.length})</h3>
            {db.teams.map((tm) => (
              <div
                key={tm.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-[#0e1218] border border-slate-800 rounded-xl p-3.5"
              >
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="color"
                    value={tm.color || '#10b981'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDb((prev) => ({
                        ...prev,
                        teams: prev.teams.map((t) => (t.id === tm.id ? { ...t, color: val } : t)),
                      }));
                    }}
                    className="w-8 h-8 rounded bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDb((prev) => ({
                        ...prev,
                        teams: prev.teams.map((t) => (t.id === tm.id ? { ...t, name: val } : t)),
                      }));
                    }}
                    className="bg-[#141821] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white flex-1"
                  />
                </div>
                <input
                  type="text"
                  value={tm.leaderName || ''}
                  placeholder="Líder da equipe"
                  onChange={(e) => {
                    const val = e.target.value;
                    setDb((prev) => ({
                      ...prev,
                      teams: prev.teams.map((t) => (t.id === tm.id ? { ...t, leaderName: val } : t)),
                    }));
                  }}
                  className="bg-[#141821] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300"
                />
                <button
                  onClick={() =>
                    setDb((prev) => ({
                      ...prev,
                      teams: prev.teams.filter((t) => t.id !== tm.id),
                    }))
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-bold"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 6: GESTÃO DE LISTAS */}
      {adminTab === 'lists' && (
        <div className="bg-[#141821] border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-base font-bold text-white">
            Todas as Listas do Sistema ({db.lists.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {db.lists.map((lst) => (
              <div
                key={lst.id}
                className="bg-[#0e1218] border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <input
                    type="text"
                    value={lst.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDb((prev) => ({
                        ...prev,
                        lists: prev.lists.map((l) => (l.id === lst.id ? { ...l, name: val } : l)),
                      }));
                    }}
                    className="w-full bg-[#141821] border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white"
                  />
                  <div className="text-[11px] text-slate-400">
                    {db.tasks.filter((t) => t.listId === lst.id).length} tarefas •{' '}
                    {(lst.fields || []).length} campos configurados
                  </div>
                </div>
                <button
                  onClick={() => onSelectListAndOpenBuilder(lst.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold"
                >
                  🛠️ Editar Campos
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 7: PERMISSÕES POR USUÁRIO */}
      {adminTab === 'permissions' && (
        <div className="bg-[#141821] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">
              🔐 Matriz de Permissões Granulares por Usuário
            </h3>
            <p className="text-xs text-slate-400">
              Ative ou desative individualmente cada permissão. Você pode testar os diferentes usuários no seletor do topo da página.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0e1218] border-b border-slate-800 text-[10px] font-bold uppercase text-slate-400">
                  <th className="p-3">Usuário / Perfil</th>
                  <th className="p-3 text-center">Criar Listas</th>
                  <th className="p-3 text-center">Editar Campos</th>
                  <th className="p-3 text-center">Criar Tarefas</th>
                  <th className="p-3 text-center">Editar Tarefas</th>
                  <th className="p-3 text-center">Excluir Tarefas</th>
                  <th className="p-3 text-center">Importar/Exportar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {db.users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#19202e]">
                    <td className="p-3 font-bold text-white">
                      {u.name}{' '}
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 ml-1">
                        {u.role}
                      </span>
                    </td>
                    {[
                      'canCreateLists',
                      'canEditSchema',
                      'canCreateTasks',
                      'canEditTasks',
                      'canDeleteTasks',
                      'canImportExport',
                    ].map((permKey) => (
                      <td key={permKey} className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(u.permissions && u.permissions[permKey])}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setDb((prev) => ({
                              ...prev,
                              users: prev.users.map((usr) =>
                                usr.id === u.id
                                  ? {
                                      ...usr,
                                      permissions: { ...(usr.permissions || {}), [permKey]: checked },
                                    }
                                  : usr
                              ),
                            }));
                          }}
                          className="w-4 h-4 accent-emerald-500 cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 8: IDENTIDADE VISUAL & FIREBASE */}
      {adminTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#141821] border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white">🎨 Identidade Visual & Configurações Gerais</h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Nome do Sistema</label>
              <input
                type="text"
                value={db.settings.systemName}
                onChange={(e) =>
                  setDb((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, systemName: e.target.value },
                  }))
                }
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Nome da Organização / Operação</label>
              <input
                type="text"
                value={db.settings.organizationName}
                onChange={(e) =>
                  setDb((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, organizationName: e.target.value },
                  }))
                }
                className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Cor de Conclusão (Verde)</label>
                <input
                  type="color"
                  value={db.settings.completedColor || '#10b981'}
                  onChange={(e) =>
                    setDb((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, completedColor: e.target.value },
                    }))
                  }
                  className="w-full h-10 bg-[#0b0d11] border border-slate-700 rounded-xl p-1"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Cor de Atenção / Pendência (Laranja)</label>
                <input
                  type="color"
                  value={db.settings.warningColor || '#f97316'}
                  onChange={(e) =>
                    setDb((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, warningColor: e.target.value },
                    }))
                  }
                  className="w-full h-10 bg-[#0b0d11] border border-slate-700 rounded-xl p-1"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#141821] border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-white">
              🔥 Conexão Cloud Firestore / Firebase Storage
            </h3>
            <p className="text-xs text-slate-400">
              O sistema possui persistência transacional local ativa por padrão e sincroniza automaticamente com o Cloud Firestore quando as chaves do seu projeto Firebase são preenchidas abaixo:
            </p>
            {['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'].map((k) => (
              <div key={k}>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">{k}</label>
                <input
                  type="text"
                  value={(db.settings.firebaseConfig && db.settings.firebaseConfig[k]) || ''}
                  onChange={(e) =>
                    setDb((prev) => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        firebaseConfig: {
                          ...(prev.settings.firebaseConfig || {}),
                          [k]: e.target.value,
                        },
                      },
                    }))
                  }
                  placeholder={`Informe o ${k} do seu projeto Firebase...`}
                  className="w-full bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CENTRAL DE HISTÓRICO E AUDITORIA IMUTÁVEL (REQUISITO 8)
// ============================================================================
window.AuditHistoryView = function ({ db }) {
  const [searchLog, setSearchLog] = React.useState('');
  const [filterAction, setFilterAction] = React.useState('ALL');

  const logs = React.useMemo(() => {
    return (db.auditLogs || []).filter((log) => {
      if (filterAction !== 'ALL' && log.action !== filterAction) return false;
      if (searchLog.trim()) {
        const q = searchLog.toLowerCase();
        return (
          (log.taskTitle || '').toLowerCase().includes(q) ||
          (log.userName || '').toLowerCase().includes(q) ||
          (log.fieldChanged || '').toLowerCase().includes(q) ||
          (log.oldValue || '').toLowerCase().includes(q) ||
          (log.newValue || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [db.auditLogs, searchLog, filterAction]);

  return (
    <div className="space-y-5 pb-14">
      <div className="bg-[#141821] border border-slate-800/90 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Rastreabilidade & Auditoria Imutável
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            🛡️ Histórico Completo de Alterações e Auditoria
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Registra quem criou, quem editou, qual informação foi alterada, valor anterior, novo valor, data/horário e quem concluiu. O histórico nunca é apagado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={searchLog}
            onChange={(e) => setSearchLog(e.target.value)}
            placeholder="🔍 Buscar por tarefa, usuário ou valor..."
            className="bg-[#0b0d11] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white w-64"
          />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-[#0b0d11] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
          >
            <option value="ALL">Todas as Ações ({db.auditLogs?.length || 0})</option>
            <option value="create">Criação de Tarefa</option>
            <option value="update">Edição de Campo</option>
            <option value="complete">Conclusão de Tarefa</option>
            <option value="bulk_update">Edição Simultânea em Massa</option>
            <option value="schema_change">Alteração de Colunas / Estrutura</option>
            <option value="import">Importação de Planilha</option>
          </select>
        </div>
      </div>

      <div className="bg-[#141821] border border-slate-800/90 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0e1218] border-b border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                <th className="p-3.5">Data e Horário</th>
                <th className="p-3.5">Usuário Responsável</th>
                <th className="p-3.5">Ação</th>
                <th className="p-3.5">Tarefa / Lista</th>
                <th className="p-3.5">Campo Alterado</th>
                <th className="p-3.5">Valor Anterior</th>
                <th className="p-3.5">Novo Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#19202e]">
                  <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3 font-bold text-white whitespace-nowrap">
                    👷 {log.userName}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        log.action === 'complete'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : log.action === 'delete'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-slate-200">
                    {log.taskCode ? `[${log.taskCode}] ` : ''}
                    {log.taskTitle || log.listName || '-'}
                  </td>
                  <td className="p-3 font-bold text-emerald-400">{log.fieldChanged}</td>
                  <td className="p-3 font-mono text-[11px] text-red-400/90 line-through">
                    {log.oldValue || '—'}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-emerald-400 font-bold">
                    {log.newValue || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
