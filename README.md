# ✅ CheckFlow Pro — Sistema Web de Checklist 100% Editável

Sistema Web completo para gerenciamento dinâmico de listas, tarefas, checklists operacionais, auditoria e importação/exportação de planilhas Excel, construído com **React 18**, **TypeScript**, **Tailwind CSS**, **SheetJS (`xlsx`)** e **Firebase (Authentication, Cloud Firestore, Storage)** + **Motor de Persistência Local Transacional**.

---

## 🚀 Como Executar Imediatamente

1. **Execução Direta (Zero-Build)**:
   - Dê dois cliques em [`INICIAR-CHECKLIST.bat`](./INICIAR-CHECKLIST.bat) ou abra [`index.html`](./index.html) diretamente no Chrome ou Edge.
2. **Execução com Servidor de Desenvolvimento (Vite / Node.js)**:
   ```bash
   npm install
   npm run dev
   ```

---

## 📋 Dados Originais da Planilha Excel Pré-Carregados (12 Abas)

Todas as **12 abas** da planilha original ([`planilha-original.xlsx`](./planilha-original.xlsx)) foram mapeadas e carregadas no banco de dados inicial:
- **`LIST 03`** (Checklist Operacional Principal — 12 atividades)
- **`LIST 30`**, **`LIST 28`**, **`LIST 22`**, **`LIST 21`**, **`LIST 20`**, **`LIST 19`**, **`LIST 15`** (Listas Operacionais Diárias)
- **`CHECK DIA 13`**, **`CHECK DIA 12`**, **`CHECK DIA 09`** (Demandas e % Qualidade por Data)
- **`CORTE`** (Programação de Campo, Notas `440113684` / `440113894`, Chefes de Equipe e Atividades)

---

## 🛠️ Estrutura de Arquivos do Projeto

- [`index.html`](./index.html) — Aplicação principal autossuficiente pronta para uso imediato no navegador.
- [`seed_data.js`](./seed_data.js) & [`orig_excel_data.js`](./orig_excel_data.js) — Dados estruturados das 12 abas e binário Base64 da planilha Excel original para testes de reimportação com 1 clique.
- [`excel_pdf_engine.js`](./excel_pdf_engine.js) — Motor de importação e exportação Excel (`.xlsx`), geração de relatórios executivos em PDF e componente de Assinatura Digital em Canvas HTML5.
- [`views_dashboard_builder.js`](./views_dashboard_builder.js) — Dashboard executivo em tempo real e Construtor de Listas Personalizadas (No-Code com 14 tipos de campos e Drag & Drop).
- [`views_list_workspace.js`](./views_list_workspace.js) — Visualização da Lista em 4 modos (**Tabela Editável Inline**, **Kanban Drag & Drop**, **Calendário Mensal** e **Modo Checklist**), edição simultânea em massa e modal completo de tarefa.
- [`views_importer_admin_audit.js`](./views_importer_admin_audit.js) — Importador inteligente de Excel em 8 etapas, Central de Configurações Administrativas e Histórico de Auditoria Imutável.
- [`firestore.rules`](./firestore.rules) & [`storage.rules`](./storage.rules) — Regras de segurança do Firebase para proteção das coleções e anexos.
- [`src/types/schema.ts`](./src/types/schema.ts), [`src/services/database.ts`](./src/services/database.ts), [`src/services/firebase.ts`](./src/services/firebase.ts), [`src/services/excelEngine.ts`](./src/services/excelEngine.ts), [`src/components/SignaturePad.tsx`](./src/components/SignaturePad.tsx) — Módulos TypeScript da arquitetura React + Vite + Firebase.
