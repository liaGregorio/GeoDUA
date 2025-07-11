# GeoDUA

Um aplicativo React para gerenciamento de materiais escolares.

## 🔧 Configuração

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente

1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Edite o arquivo `.env` e configure suas credenciais:
```env
API_BASE_URL=https://api-geodua.onrender.com/api
VITE_API_KEY=sua_chave_api_aqui
```

> ⚠️ **Importante**: Nunca commite o arquivo `.env` no repositório. Ele já está no `.gitignore`.

### 3. Executar o projeto
```bash
npm run dev
```

## 🔐 Autenticação

Este projeto implementa autenticação por API Key para proteger as requisições:

- **API Key**: Chave secreta para autenticação
- **Headers**: `Authorization: Bearer {key}` e `X-API-Key: {key}`
- **Tratamento de erros**: Feedback específico para erros de autenticação

### Como obter a API Key

1. Entre em contato com o administrador da API
2. Solicite uma chave de API válida
3. Configure no arquivo `.env`

## 🚀 Scripts disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run preview` - Visualiza o build
- `npm run lint` - Executa o linter

## 📁 Estrutura do projeto

```
src/
├── components/          # Componentes reutilizáveis
├── pages/              # Páginas da aplicação
├── services/           # Serviços de API
│   ├── api.js         # Configuração da API
│   └── bookService.js # Serviço de livros
└── assets/            # Recursos estáticos
```

## 🔒 Segurança

- ✅ API Key protegida em variáveis de ambiente
- ✅ Arquivos `.env` ignorados pelo Git
- ✅ Tratamento de erros de autenticação
- ✅ Headers de segurança configurados
- ✅ Validação de API Key no cliente

## 📦 Tecnologias

- React 19
- Vite
- React Router
- Lucide React (ícones)