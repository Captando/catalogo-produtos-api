# Catálogo de Produtos - API

Sistema de gerenciamento de catálogo de produtos com autenticação e upload de imagens.

<div align="center">
  <img src="public/logo.png" alt="Logo Catálogo de Produtos" width="300">
</div>

## 📋 Funcionalidades

- ✅ Autenticação de usuários (JWT)
- 📦 Gerenciamento de produtos
- 🖼️ Upload de múltiplas imagens
- 🔍 Busca e filtros
- 👥 Níveis de acesso (Admin/User)
- 📱 API RESTful

## 🚀 Tecnologias

- Node.js
- Express.js
- SQLite3
- JWT
- Multer
- bcryptjs
- CORS

## 📦 Instalação

1. Clone o repositório
```bash
git clone https://github.com/captando/catalogo-produtos-api.git
cd catalogo-produtos-api
```

2. Instale as dependências
```bash
npm install
```

3. Inicie o servidor
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

O servidor iniciará na porta 3020 por padrão (http://localhost:3020)

## 👥 Usuários Padrão

```json
{
  "admin": {
    "email": "adm@captando.com.br",
    "senha": "CaptADM"
  },
  "user": {
    "email": "user@captando.com.br",
    "senha": "CaptaUser"
  }
}
```

## 🔗 Endpoints da API

### Autenticação
```
POST /auth/login
```

### Produtos
```
GET    /products        - Lista todos os produtos
GET    /products/:id    - Busca produto por ID
POST   /products        - Cria novo produto
PUT    /products/:id    - Atualiza produto
DELETE /products/:id    - Remove produto
```

## 📁 Estrutura do Projeto

```
├── public/            # Arquivos estáticos
├── uploads/           # Upload de imagens
├── server.js          # Arquivo principal
├── package.json       # Dependências e scripts
└── README.md          # Documentação
```

## 📝 Configurações

### Upload de Imagens
- Limite: 5MB por arquivo
- Formatos: jpg, jpeg, png, gif
- Máximo: 5 imagens por produto

### Banco de Dados
- SQLite3
- Tabelas:
  - users
  - products
  - product_images

## 🔒 Segurança

- Autenticação JWT
- Senhas criptografadas
- Validação de uploads
- Proteção contra CSRF
- Rate limiting
- Sanitização de inputs

## 💡 Uso

Exemplo de criação de produto:

```javascript
const formData = new FormData();
formData.append('name', 'Produto Teste');
formData.append('price', '99.90');
formData.append('description', 'Descrição do produto');
formData.append('images', imageFile);

fetch('http://localhost:3020/products', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

## 🤝 Contribuição

1. Faça o fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add: nova feature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Copyright © 2024 [Victor Silva](https://captando.com.br)

Este projeto está sob licença proprietária - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👤 Autor

**Victor Silva**

* Website: [captando.com.br](https://captando.com.br)
* Github: [@captando](https://github.com/captando)
* LinkedIn: [Victor Silva](www.linkedin.com/in/victor-silva-captando)

## ✨ Agradecimentos

- Node.js Foundation
- Comunidade Express.js
- Todos os contribuidores de dependências

---
Feito com ❤️ por [Victor Silva](https://captando.com.br)
