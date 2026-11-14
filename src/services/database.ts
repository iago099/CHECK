import {
  DatabaseState,
  DynamicList,
  TaskItem,
  AuditLogEntry,
} from '../types/schema';
import { INITIAL_DATABASE_STATE, createDefaultFieldsForList } from '../data/excelSeed';

const STORAGE_KEY = 'CHECKFLOW_PRO_DB_V2';

// Helper para criar cada lista e tarefas reais da planilha Excel original do usuário
export function buildInitialDatabaseFromExcel(): DatabaseState {
  const state: DatabaseState = JSON.parse(JSON.stringify(INITIAL_DATABASE_STATE));

  const sheetsConfig: Array<{
    id: string;
    name: string;
    origSheetName: string;
    description: string;
    category: string;
    icon: string;
    color: string;
    mode: 'list' | 'check' | 'corte';
    defaultDate: string;
    rows: Array<{
      title: string;
      started: boolean;
      finished: boolean;
      responsibleId: string;
      teamId: string;
      categoryId: string;
      priorityId: string;
      dueDate?: string;
      serviceNote?: string;
      observations?: string;
    }>;
  }> = [
    {
      id: 'lst_03',
      name: 'LIST 03 — Checklist Operacional (Principal)',
      origSheetName: 'LIST 03',
      description: 'Aba principal ativa da planilha original com 12 atividades operacionais, faturamento, Maria e Equatorial.',
      category: 'Operacional Diário',
      icon: 'CheckSquare',
      color: '#10b981',
      mode: 'list',
      defaultDate: '2026-02-03',
      rows: [
        { title: 'FALA COM SALVADORA SOBRE DESLIGAMENTO', started: true, finished: true, responsibleId: 'usr_salvadora', teamId: 'tm_adm_faturamento', categoryId: 'cat_corte', priorityId: 'pr_alta', observations: 'Alinhado processo de desligamento programado.' },
        { title: 'VER COM SALVADORA SOBRE CADASTRO DOS CLIENTES DAS OBRAS DE FLORI', started: true, finished: true, responsibleId: 'usr_salvadora', teamId: 'tm_adm_faturamento', categoryId: 'cat_faturamento', priorityId: 'pr_alta', observations: 'Cadastros de Floriano conferidos.' },
        { title: 'FALAR COM CARLOS SOBRE OBRA DE RICHO', started: true, finished: false, responsibleId: 'usr_carlos', teamId: 'tm_campo_postes', categoryId: 'cat_obras', priorityId: 'pr_alta', observations: 'Em andamento com encarregado Carlos.' },
        { title: 'FAZER AS BUITS DAS OBRAS DE FLORIANO', started: true, finished: false, responsibleId: 'usr_victor', teamId: 'tm_adm_faturamento', categoryId: 'cat_faturamento', priorityId: 'pr_critica', observations: 'Documentação As-Built das obras de Floriano em elaboração.' },
        { title: 'JADIR FAZER RELATORIO FOTOGRAFICO ENQUANTO NÃO TEM ACESSO', started: true, finished: false, responsibleId: 'usr_jadir', teamId: 'tm_ti_sistemas', categoryId: 'cat_faturamento', priorityId: 'pr_media', observations: 'Aguardando liberação final de acesso ao sistema.' },
        { title: 'JEFFESON ATUALIZAR A MARIA', started: true, finished: false, responsibleId: 'usr_jefferson', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta', observations: 'Atualização de cronograma na planilha Maria.' },
        { title: 'TENTAR AINDA HOJE FALAR COM THIAGO SOBRE MELHORIAS', started: true, finished: false, responsibleId: 'usr_thiago', teamId: 'tm_planejamento', categoryId: 'cat_comunicacao', priorityId: 'pr_media', observations: 'Pauta de melhorias de processo e controle.' },
        { title: 'AJUSTAR PLANINHA DE FATURAMENTO DO VICTOR COM STATUS', started: true, finished: false, responsibleId: 'usr_victor', teamId: 'tm_adm_faturamento', categoryId: 'cat_faturamento', priorityId: 'pr_alta', observations: 'Vincular coluna de status atualizado no controle do Victor.' },
        { title: 'FALAR COM TECNICO DA EQUATORIAL', started: true, finished: false, responsibleId: 'usr_edson', teamId: 'tm_ti_sistemas', categoryId: 'cat_comunicacao', priorityId: 'pr_critica', observations: 'Validação técnica em campo / Equatorial.' },
        { title: 'DEFINIR UM PADRÃO SOBRE RELATORIOS DE FOTOS', started: true, finished: true, responsibleId: 'usr_jadir', teamId: 'tm_planejamento', categoryId: 'cat_faturamento', priorityId: 'pr_media', observations: 'Padrão fotográfico definido e compartilhado.' },
        { title: 'DEFINIR UM PADRÃO DE APONTAMENTO DOS ENCARREGADO', started: true, finished: true, responsibleId: 'usr_carlos', teamId: 'tm_planejamento', categoryId: 'cat_obras', priorityId: 'pr_alta', observations: 'Modelo padronizado de apontamento diário concluído.' },
        { title: 'RIACHO FRIO - SISCOME ADEREÇA DE MATERIAL', started: true, finished: false, responsibleId: 'usr_carlos', teamId: 'tm_campo_postes', categoryId: 'cat_obras', priorityId: 'pr_alta', observations: 'Conferência de aderência de material SISCOME — Obra Riacho Frio (Ref: 198279).' },
      ],
    },
    {
      id: 'lst_30',
      name: 'LIST 30 — Checklist Operacional (Dia 30)',
      origSheetName: 'LIST 30',
      description: 'Controle diário de atividades do dia 30 (G2M, PROJ, Avanço Físico, Maria, Gantt e Planejamento de Fevereiro).',
      category: 'Operacional Diário',
      icon: 'ClipboardCheck',
      color: '#3b82f6',
      mode: 'list',
      defaultDate: '2026-01-30',
      rows: [
        { title: 'ACOMPANHAR A SOLICITAÇÃO G2M | PROJ', started: true, finished: true, responsibleId: 'usr_edson', teamId: 'tm_ti_sistemas', categoryId: 'cat_sistemas', priorityId: 'pr_alta' },
        { title: 'AJUSTAR O AVANÇO FISICO', started: true, finished: true, responsibleId: 'usr_admin', teamId: 'tm_planejamento', categoryId: 'cat_obras', priorityId: 'pr_alta' },
        { title: 'AJUSTAR O CALENDARIO DA MARIA', started: true, finished: true, responsibleId: 'usr_jefferson', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_media' },
        { title: 'ACOMPANHAR A PRODUÇÃO DO DIA DE ONTEM', started: true, finished: true, responsibleId: 'usr_carlos', teamId: 'tm_campo_postes', categoryId: 'cat_obras', priorityId: 'pr_media' },
        { title: 'AJUSTAR A PLANINHA DE GANNT', started: true, finished: true, responsibleId: 'usr_thiago', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
        { title: 'COLOCAR PLANEJAMENTO DE FEVEREIRO NA PLANINHA DE AVANÇO', started: true, finished: true, responsibleId: 'usr_thiago', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
      ],
    },
    {
      id: 'lst_28',
      name: 'LIST 28 — Checklist Operacional (Dia 28)',
      origSheetName: 'LIST 28',
      description: 'Atividades de TI (SSH, VPN Equatorial com Edson), Gantt e revisão de obras de Janeiro/Fevereiro com Thiago.',
      category: 'Operacional Diário',
      icon: 'Layers',
      color: '#8b5cf6',
      mode: 'list',
      defaultDate: '2026-01-28',
      rows: [
        { title: 'ACOMPANHAR A SOLICITAÇÃO G2M', started: true, finished: false, responsibleId: 'usr_edson', teamId: 'tm_ti_sistemas', categoryId: 'cat_sistemas', priorityId: 'pr_alta' },
        { title: 'ATUALIZAR O AVANÇO DE OBRAS', started: true, finished: true, responsibleId: 'usr_admin', teamId: 'tm_planejamento', categoryId: 'cat_obras', priorityId: 'pr_alta' },
        { title: 'ATUALIZAR A MARIA OBRAS DE JANEIRO / FEVEREIRO COM THIAGO', started: true, finished: false, responsibleId: 'usr_thiago', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_critica' },
        { title: 'CRIAR ACESSO FORA COM SSH', started: true, finished: true, responsibleId: 'usr_edson', teamId: 'tm_ti_sistemas', categoryId: 'cat_sistemas', priorityId: 'pr_media' },
        { title: 'VER VPN COM EDSON', started: true, finished: true, responsibleId: 'usr_edson', teamId: 'tm_ti_sistemas', categoryId: 'cat_sistemas', priorityId: 'pr_alta' },
        { title: 'ATUALIZAR A PLANINHA GANNT COM OS VALORES APONTADO', started: true, finished: true, responsibleId: 'usr_jefferson', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
        { title: 'AJUSTAR CALENDARIO DE FEVEREIRO NA MARIA', started: true, finished: false, responsibleId: 'usr_jefferson', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_media' },
        { title: 'FAZER UM NOVO REQUERIMENTO PARA EQUATORIAL SOBRE VPN', started: true, finished: true, responsibleId: 'usr_edson', teamId: 'tm_ti_sistemas', categoryId: 'cat_sistemas', priorityId: 'pr_critica' },
      ],
    },
    {
      id: 'lst_22',
      name: 'LIST 22 — Checklist Operacional (Dia 22)',
      origSheetName: 'LIST 22',
      description: 'Acompanhamento G2M, cronograma Maria, avanço online, entrega de projetos de Flores e Gantt.',
      category: 'Operacional Diário',
      icon: 'ListChecks',
      color: '#f97316',
      mode: 'list',
      defaultDate: '2026-01-22',
      rows: [
        { title: 'ACOMPANHAR G2M', started: true, finished: false, responsibleId: 'usr_edson', teamId: 'tm_ti_sistemas', categoryId: 'cat_sistemas', priorityId: 'pr_alta' },
        { title: 'AJUSTAR O CRONOGRAMA NA MARIA', started: true, finished: false, responsibleId: 'usr_jefferson', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
        { title: 'AJUSTAR O AVANÇO DE OBRAS PLANILHA ONLINE', started: false, finished: false, responsibleId: 'usr_admin', teamId: 'tm_planejamento', categoryId: 'cat_obras', priorityId: 'pr_critica', dueDate: '2026-01-25' },
        { title: 'ENTREGRA DE PROJETOS DE FLORES DE JANEIRO', started: false, finished: false, responsibleId: 'usr_carlos', teamId: 'tm_campo_postes', categoryId: 'cat_faturamento', priorityId: 'pr_critica', dueDate: '2026-01-25' },
        { title: 'CRIAR PLANILHA DE ACOMPANHAMENTO', started: true, finished: true, responsibleId: 'usr_admin', teamId: 'tm_planejamento', categoryId: 'cat_obras', priorityId: 'pr_media' },
        { title: 'AJUSTAR O GANTT COM NOSSOS DADOS', started: true, finished: false, responsibleId: 'usr_thiago', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
      ],
    },
    {
      id: 'lst_21',
      name: 'LIST 21 — Checklist Operacional (Dia 21)',
      origSheetName: 'LIST 21',
      description: 'Requerimentos de sistemas, avanço de obras, planilha de Fevereiro/Março e remoção da obra 8883.',
      category: 'Operacional Diário',
      icon: 'FileSpreadsheet',
      color: '#06b6d4',
      mode: 'list',
      defaultDate: '2026-01-21',
      rows: [
        { title: 'Request access to Systems ACOMPALHAR SOBRE REQUERIMENTO', started: true, finished: false, responsibleId: 'usr_edson', teamId: 'tm_ti_sistemas', categoryId: 'cat_sistemas', priorityId: 'pr_alta' },
        { title: 'AJUSTAR A PLANILHA DE AVANÇO DE OBRAS', started: true, finished: true, responsibleId: 'usr_admin', teamId: 'tm_planejamento', categoryId: 'cat_obras', priorityId: 'pr_alta' },
        { title: 'FAZER UMA PLANILHA POR THIAGO DAS OBRAS DE FEVEREIRO', started: true, finished: true, responsibleId: 'usr_thiago', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
        { title: 'AJUSTAR O CALENDARIOS DE OBRAS', started: true, finished: false, responsibleId: 'usr_jefferson', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_media' },
        { title: 'REMOVER OBRA 8883 DO CALENDARIO', started: true, finished: true, responsibleId: 'usr_jefferson', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_baixa' },
        { title: 'CRIAR A PLANILHA COM OBRAS DE FEVEREIRO E MARÇO', started: true, finished: true, responsibleId: 'usr_thiago', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
        { title: 'ADD O PLANEJAMENTO DE NAIERO NA PLANILHA', started: true, finished: false, responsibleId: 'usr_admin', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_media' },
      ],
    },
    {
      id: 'lst_20',
      name: 'LIST 20 — Checklist Operacional (Dia 20)',
      origSheetName: 'LIST 20',
      description: 'Avanço de obras, calendário Maria, coleta de produção com chefes de equipe e chamado G2M + PROJ.',
      category: 'Operacional Diário',
      icon: 'CheckCircle2',
      color: '#14b8a6',
      mode: 'list',
      defaultDate: '2026-01-20',
      rows: [
        { title: 'AJUSTAR A PLANILHA DO AVANÇO DE OBRAS', started: true, finished: true, responsibleId: 'usr_admin', teamId: 'tm_planejamento', categoryId: 'cat_obras', priorityId: 'pr_alta' },
        { title: 'AJUSTAR O CALENDARIO DE OBRAS NA MARIA', started: true, finished: false, responsibleId: 'usr_jefferson', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_media' },
        { title: 'PEGAR A PRODUÇÃO DE ONTEM COM OS MENINOS E CHEFE DE EQUIPE', started: true, finished: true, responsibleId: 'usr_carlos_eduardo', teamId: 'tm_campo_cabos', categoryId: 'cat_obras', priorityId: 'pr_alta' },
        { title: 'VERIFICAR A OBRAS DO CALENDARIOS JUNTO COM A CARTEIRA', started: true, finished: false, responsibleId: 'usr_thiago', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
        { title: 'FAZER UM NOVO CHAMADO PARA ACESSO DO G2M + PROJ', started: true, finished: true, responsibleId: 'usr_edson', teamId: 'tm_ti_sistemas', categoryId: 'cat_sistemas', priorityId: 'pr_alta' },
      ],
    },
    {
      id: 'lst_19',
      name: 'LIST 19 — Checklist Operacional (Dia 19)',
      origSheetName: 'LIST 19',
      description: 'Conferência de carteira vs cronograma, programação parcial/perdida e remoção da obra 4210.',
      category: 'Operacional Diário',
      icon: 'ClipboardList',
      color: '#6366f1',
      mode: 'list',
      defaultDate: '2026-01-19',
      rows: [
        { title: 'AJUSTAR A PLANILHA DE AVANÇO DE OBRAS', started: true, finished: true, responsibleId: 'usr_admin', teamId: 'tm_planejamento', categoryId: 'cat_obras', priorityId: 'pr_alta' },
        { title: 'ACOMPANHAR A SOLICITAÇÃO DO SITEMAS G2M', started: true, finished: false, responsibleId: 'usr_edson', teamId: 'tm_ti_sistemas', categoryId: 'cat_sistemas', priorityId: 'pr_alta' },
        { title: 'RECOLHER TODAS AS INFORMAÇOES DE PRODUÇÃO ONTEM', started: true, finished: true, responsibleId: 'usr_carlos', teamId: 'tm_campo_postes', categoryId: 'cat_obras', priorityId: 'pr_media' },
        { title: 'VERFICAR SE ESTA TUDO DE ACORDO NA CARTEIRA E CRONOGRAMA', started: true, finished: true, responsibleId: 'usr_thiago', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
        { title: 'AJUSTAR ALGUNS PONTO DO CRONOGRAMA NA MARIA', started: true, finished: true, responsibleId: 'usr_jefferson', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_media' },
        { title: 'AJUSTAR PROGRAMAÇÃO PARCIAL E PROGRAMAÇÃO PERDIDA', started: true, finished: false, responsibleId: 'usr_thiago', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_critica' },
        { title: 'REMOVER OBRA 4210 DO CONOGRAMA', started: true, finished: true, responsibleId: 'usr_jefferson', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_baixa' },
      ],
    },
    {
      id: 'lst_15',
      name: 'LIST 15 — Checklist Operacional (Dia 15)',
      origSheetName: 'LIST 15',
      description: 'Alinhamento com chefe de equipe e gestores, produção de campo e apontamento.',
      category: 'Operacional Diário',
      icon: 'FolderKanban',
      color: '#ec4899',
      mode: 'list',
      defaultDate: '2026-01-15',
      rows: [
        { title: 'AJUSTAR A PLANILHA DE AVANÇO DE OBRAS', started: true, finished: true, responsibleId: 'usr_admin', teamId: 'tm_planejamento', categoryId: 'cat_obras', priorityId: 'pr_alta' },
        { title: 'AJUSTAR O CALENDARIOS JUNTO COM CHEFE DE EQUIPE', started: true, finished: true, responsibleId: 'usr_carlos_eduardo', teamId: 'tm_campo_cabos', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
        { title: 'MELHORAR A COMUNICAÇÃO COM GESTORES', started: true, finished: true, responsibleId: 'usr_thiago', teamId: 'tm_planejamento', categoryId: 'cat_comunicacao', priorityId: 'pr_media' },
        { title: 'ACOMPANHAR A SOLICITAÇÃO DO SITEMAS G2M', started: true, finished: true, responsibleId: 'usr_edson', teamId: 'tm_ti_sistemas', categoryId: 'cat_sistemas', priorityId: 'pr_alta' },
        { title: 'MELHORAR A COMUNICAÇÃO COM OS MENINOS', started: true, finished: true, responsibleId: 'usr_carlos', teamId: 'tm_campo_postes', categoryId: 'cat_comunicacao', priorityId: 'pr_media' },
        { title: 'RECOLHER TODAS AS INFORMAÇOES DE PRODUÇÃO ONTEM', started: true, finished: true, responsibleId: 'usr_carlos', teamId: 'tm_campo_postes', categoryId: 'cat_obras', priorityId: 'pr_media' },
        { title: 'APRENDER A APONTAR A PRODUÇÃO VINDO DE CAMPO', started: false, finished: false, responsibleId: 'usr_jadir', teamId: 'tm_planejamento', categoryId: 'cat_obras', priorityId: 'pr_alta', dueDate: '2026-01-20' },
      ],
    },
    {
      id: 'chk_13',
      name: 'CHECK DIA 13 — Qualidade & Demandas (13/01)',
      origSheetName: 'CHECK DIA 13',
      description: 'Checklist de Demandas e % Qualidade referente à data 13/01/2026 (serial Excel 46035).',
      category: 'Checklists de Qualidade',
      icon: 'CalendarCheck',
      color: '#eab308',
      mode: 'check',
      defaultDate: '2026-01-13',
      rows: [
        { title: 'ORGANIZAR O CRONOGRAMA', started: true, finished: false, responsibleId: 'usr_jefferson', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
        { title: 'FAZER RECORTE DAS OBRAS 15/01 E 16/01', started: false, finished: false, responsibleId: 'usr_carlos_eduardo', teamId: 'tm_campo_cabos', categoryId: 'cat_corte', priorityId: 'pr_critica', dueDate: '2026-01-15' },
        { title: 'ATUALIZAR O AVANÇO FISICO', started: false, finished: false, responsibleId: 'usr_admin', teamId: 'tm_planejamento', categoryId: 'cat_obras', priorityId: 'pr_alta', dueDate: '2026-01-14' },
      ],
    },
    {
      id: 'chk_12',
      name: 'CHECK DIA 12 — Qualidade & Demandas (12/01)',
      origSheetName: 'CHECK DIA 12',
      description: 'Checklist de Demandas e % Qualidade referente à data 12/01/2026 (serial Excel 46034) — 90% concluído.',
      category: 'Checklists de Qualidade',
      icon: 'Award',
      color: '#10b981',
      mode: 'check',
      defaultDate: '2026-01-12',
      rows: [
        { title: 'ORGANIZAR CALENDARIO DE OBRAS', started: true, finished: true, responsibleId: 'usr_jefferson', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
        { title: 'ATUALIZAR PLANILHA DE AVANÇO', started: true, finished: true, responsibleId: 'usr_admin', teamId: 'tm_planejamento', categoryId: 'cat_obras', priorityId: 'pr_alta' },
        { title: 'SEPARAR TODAS AS INFORMAÇÕES DO DIA 09 E 10 DE JANEIRO', started: true, finished: true, responsibleId: 'usr_carlos', teamId: 'tm_campo_postes', categoryId: 'cat_obras', priorityId: 'pr_media' },
        { title: 'COLOCAR INFORMAÇÃO NA PLANILHA RESUMO', started: true, finished: true, responsibleId: 'usr_admin', teamId: 'tm_planejamento', categoryId: 'cat_obras', priorityId: 'pr_media' },
        { title: 'MELHORAR A COMUNICAÇÃO COM GESTORES', started: true, finished: true, responsibleId: 'usr_thiago', teamId: 'tm_planejamento', categoryId: 'cat_comunicacao', priorityId: 'pr_media' },
        { title: 'BATE PONTO DE ENTRADA NO NOVO HORARIO', started: true, finished: true, responsibleId: 'usr_admin', teamId: 'tm_planejamento', categoryId: 'cat_comunicacao', priorityId: 'pr_baixa' },
        { title: 'ADD OBRAS DA CARTEIRA NO CALENDARIO', started: true, finished: true, responsibleId: 'usr_jefferson', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
        { title: 'MUDANÇA DE PROGRAMAÇÃO DO DIA 13', started: true, finished: true, responsibleId: 'usr_thiago', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
        { title: 'ADD ABERTURA DE FAIXA EM TODAS AS OBRAS DE FLORES', started: false, finished: false, responsibleId: 'usr_rosinaldo', teamId: 'tm_campo_postes', categoryId: 'cat_corte', priorityId: 'pr_critica', dueDate: '2026-01-18' },
        { title: 'FAZER CORTE DO DIA AMANHÃ PARA AJUDAR NO CONOGRAMA', started: true, finished: true, responsibleId: 'usr_carlos_eduardo', teamId: 'tm_campo_cabos', categoryId: 'cat_corte', priorityId: 'pr_alta' },
      ],
    },
    {
      id: 'chk_09',
      name: 'CHECK DIA 09 — Qualidade & Demandas (09/01)',
      origSheetName: 'CHECK DIA 09',
      description: 'Checklist de Demandas e % Qualidade referente à data 09/01/2026 (serial Excel 46031).',
      category: 'Checklists de Qualidade',
      icon: 'CheckSquare',
      color: '#3b82f6',
      mode: 'check',
      defaultDate: '2026-01-09',
      rows: [
        { title: 'organizar calendarios de obras', started: true, finished: true, responsibleId: 'usr_jefferson', teamId: 'tm_planejamento', categoryId: 'cat_cronograma', priorityId: 'pr_alta' },
        { title: 'atualizar a produção na planilha de avanço', started: true, finished: true, responsibleId: 'usr_admin', teamId: 'tm_planejamento', categoryId: 'cat_obras', priorityId: 'pr_alta' },
        { title: 'separar todas as informações da produção de hoje', started: false, finished: false, responsibleId: 'usr_carlos', teamId: 'tm_campo_postes', categoryId: 'cat_obras', priorityId: 'pr_media', dueDate: '2026-01-12' },
        { title: 'separar todas as informações da produção de ontem', started: true, finished: true, responsibleId: 'usr_carlos', teamId: 'tm_campo_postes', categoryId: 'cat_obras', priorityId: 'pr_media' },
        { title: 'fazer um resumo da semana', started: true, finished: true, responsibleId: 'usr_thiago', teamId: 'tm_planejamento', categoryId: 'cat_comunicacao', priorityId: 'pr_media' },
        { title: 'mandar os curriculo para nilton', started: true, finished: true, responsibleId: 'usr_nilton', teamId: 'tm_adm_faturamento', categoryId: 'cat_comunicacao', priorityId: 'pr_baixa' },
      ],
    },
    {
      id: 'lst_corte',
      name: 'CORTE — Programação de Equipes e Notas',
      origSheetName: 'CORTE',
      description: 'Controle de Notas de Obras (440113684, 440113894), Chefes de Equipe e Atividades de Campo.',
      category: 'Programação de Campo',
      icon: 'Zap',
      color: '#f59e0b',
      mode: 'corte',
      defaultDate: '2026-01-22',
      rows: [
        {
          title: 'LANÇAMENTO DE CABOS',
          serviceNote: '440113684',
          started: true,
          finished: false,
          responsibleId: 'usr_carlos_eduardo',
          teamId: 'tm_campo_cabos',
          categoryId: 'cat_corte',
          priorityId: 'pr_critica',
          dueDate: '2026-01-22',
          observations: 'Chefes de equipe: CARLOS EDUARDO / RAFAEL FRANCISCO. Dia de encabeçamento ficou para dia 22.',
        },
        {
          title: 'IMPLATAÇÃO DE POSTE',
          serviceNote: '440113894',
          started: true,
          finished: true,
          responsibleId: 'usr_rosinaldo',
          teamId: 'tm_campo_postes',
          categoryId: 'cat_corte',
          priorityId: 'pr_alta',
          dueDate: '2026-01-22',
          observations: 'Chefe de equipe: ROSINALDO OLIVEIRA. Dia de encabeçamento ficou para dia 22.',
        },
      ],
    },
  ];

  let taskCounter = 1;
  sheetsConfig.forEach((sc, idx) => {
    const listObj: DynamicList = {
      id: sc.id,
      name: sc.name,
      description: sc.description,
      category: sc.category,
      icon: sc.icon,
      color: sc.color,
      order: idx + 1,
      origSheetName: sc.origSheetName,
      autoCalculateFormula: true,
      fields: createDefaultFieldsForList(sc.mode),
      createdAt: `${sc.defaultDate}T08:00:00.000Z`,
      updatedAt: `${sc.defaultDate}T18:00:00.000Z`,
    };
    state.lists.push(listObj);

    sc.rows.forEach((r) => {
      const code = `CHK-${String(taskCounter++).padStart(3, '0')}`;
      const progress = r.finished ? 100 : r.started ? 50 : 0;
      const statusId = r.finished ? 'st_concluido' : r.started ? 'st_parcial' : 'st_nao_iniciado';
      const task: TaskItem = {
        id: `tsk_${code.toLowerCase()}`,
        code,
        listId: sc.id,
        title: r.title,
        description: r.observations || `Atividade importada da aba ${sc.origSheetName} da planilha original.`,
        categoryId: r.categoryId,
        statusId,
        priorityId: r.priorityId,
        responsibleId: r.responsibleId,
        teamId: r.teamId,
        started: r.started,
        finished: r.finished,
        progress,
        executionDate: sc.defaultDate,
        dueDate: r.dueDate || sc.defaultDate,
        executionTime: '08:00',
        observations: r.observations || '',
        serviceNote: r.serviceNote || '',
        attachments: [],
        images: [],
        customValues: r.serviceNote ? { serviceNote: r.serviceNote } : {},
        createdAt: `${sc.defaultDate}T08:00:00.000Z`,
        createdBy: 'Administrador Geral',
        updatedAt: `${sc.defaultDate}T17:30:00.000Z`,
        completedAt: r.finished ? `${sc.defaultDate}T17:30:00.000Z` : undefined,
        completedBy: r.finished ? 'Administrador Geral' : undefined,
      };
      state.tasks.push(task);
    });
  });

  state.auditLogs = [
    {
      id: 'aud_init_1',
      action: 'import',
      fieldChanged: 'Planilha Original Completa (12 Abas)',
      oldValue: 'Vazio',
      newValue: `${state.lists.length} listas e ${state.tasks.length} tarefas sincronizadas`,
      userId: 'usr_admin',
      userName: 'Administrador Geral',
      timestamp: new Date().toISOString(),
    },
  ];

  return state;
}

export function loadDatabaseState(): DatabaseState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.lists) && parsed.lists.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao ler banco local:', err);
  }
  const initial = buildInitialDatabaseFromExcel();
  saveDatabaseState(initial);
  return initial;
}

export function saveDatabaseState(state: DatabaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Erro ao salvar no banco de dados:', err);
  }
}

export function resetDatabaseToFactoryExcel(): DatabaseState {
  const initial = buildInitialDatabaseFromExcel();
  saveDatabaseState(initial);
  return initial;
}

export function createAuditEntry(
  params: Omit<AuditLogEntry, 'id' | 'timestamp'>
): AuditLogEntry {
  return {
    ...params,
    id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
}
