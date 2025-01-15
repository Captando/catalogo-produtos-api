const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3020;
const JWT_SECRET = 'sua-secret-key-2025';

// Middlewares principais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middlewares de arquivos estáticos
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Criar pastas necessárias
['uploads', 'public'].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
});

// Configuração do Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const productName = req.body.name ? req.body.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'produto';
        cb(null, `${productName}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Apenas imagens são permitidas!'), false);
        }
        cb(null, true);
    }
});

// Banco de dados
const db = new sqlite3.Database('dados.db', err => {
    if (err) console.error('Erro ao conectar ao banco:', err.message);
    console.log('Conectado ao banco SQLite');
});

// Criar tabelas
db.serialize(() => {
    // Tabela de usuários
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de produtos
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de imagens
    db.run(`CREATE TABLE IF NOT EXISTS product_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

    // Inserir usuários padrão se não existirem
    db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
        if (err) {
            console.error(err);
            return;
        }

        if (row.count === 0) {
            const users = [
                {
                    email: 'adm@captando.com.br',
                    password: bcrypt.hashSync('CaptADM', 10),
                    role: 'admin'
                },
                {
                    email: 'user@captando.com.br',
                    password: bcrypt.hashSync('CaptaUser', 10),
                    role: 'user'
                }
            ];

            users.forEach(user => {
                db.run(
                    'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
                    [user.email, user.password, user.role]
                );
            });
            console.log('Usuários padrão criados com sucesso');
        }
    });
});

// Middleware de autenticação
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
}

// Middleware para verificar se é admin
function isAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
}

// Rotas de autenticação
app.post('/auth/login', async (req, res) => {
    console.log('Tentativa de login:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            console.error('Erro no banco:', err);
            return res.status(500).json({ error: 'Erro ao buscar usuário' });
        }

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                email: user.email,
                role: user.role
            }
        });
    });
});

// Rotas de produtos
app.get('/products', authenticateToken, (req, res) => {
    let query = `
        SELECT p.*, GROUP_CONCAT(pi.image_url) as images 
        FROM products p 
        LEFT JOIN product_images pi ON p.id = pi.product_id
    `;
    const params = [];

    if (req.query.search) {
        query += " WHERE p.name LIKE ? OR p.description LIKE ?";
        const searchTerm = `%${req.query.search}%`;
        params.push(searchTerm, searchTerm);
    }

    query += " GROUP BY p.id ORDER BY p.id DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar produtos:', err);
            return res.status(500).json({ error: 'Erro ao buscar produtos' });
        }
        
        rows = rows.map(row => ({
            ...row,
            images: row.images ? row.images.split(',') : []
        }));

        res.json(rows);
    });
});

// Rota para buscar um produto específico
app.get('/products/:id', authenticateToken, (req, res) => {
    const productId = req.params.id;
    
    const query = `
        SELECT p.*, GROUP_CONCAT(pi.image_url) as images 
        FROM products p 
        LEFT JOIN product_images pi ON p.id = pi.product_id 
        WHERE p.id = ? 
        GROUP BY p.id
    `;

    db.get(query, [productId], (err, row) => {
        if (err) {
            console.error('Erro ao buscar produto:', err);
            return res.status(500).json({ error: 'Erro ao buscar produto' });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        row.images = row.images ? row.images.split(',') : [];
        res.json(row);
    });
});

app.post('/products', authenticateToken, isAdmin, upload.array('images', 5), (req, res) => {
    console.log('Recebendo requisição POST /products');
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    const { name, price, description } = req.body;
    
    if (!name || !price) {
        console.log('Erro: Nome ou preço não fornecidos');
        return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
    }

    db.run(
        `INSERT INTO products (name, price, description) VALUES (?, ?, ?)`,
        [name, price, description || null],
        function(err) {
            if (err) {
                console.error('Erro ao inserir produto:', err);
                return res.status(500).json({ error: 'Erro ao salvar produto' });
            }
            
            const productId = this.lastID;
            const files = req.files || [];

            if (files.length === 0) {
                console.log('Produto adicionado sem imagens');
                return res.json({
                    id: productId,
                    name,
                    price,
                    description,
                    images: []
                });
            }

            const imageValues = files.map(file => 
                `(${productId}, '/uploads/${file.filename}')`
            ).join(',');

            db.run(`INSERT INTO product_images (product_id, image_url) VALUES ${imageValues}`, [], (err) => {
                if (err) {
                    console.error('Erro ao salvar imagens:', err);
                    return res.status(500).json({ error: 'Erro ao salvar imagens' });
                }

                const imageUrls = files.map(file => `/uploads/${file.filename}`);
                console.log('Produto adicionado com sucesso com imagens');
                res.json({
                    id: productId,
                    name,
                    price,
                    description,
                    images: imageUrls
                });
            });
        }
    );
});

app.put('/products/:id', authenticateToken, isAdmin, upload.array('images', 5), async (req, res) => {
    console.log('PUT /products/:id - Iniciando atualização do produto');
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    const { name, price, description, deleteImages } = req.body;
    const productId = req.params.id;

    if (!name || !price) {
        console.log('Erro: Nome ou preço não fornecidos');
        return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
    }

    try {
        // Se houver imagens para deletar
        if (deleteImages) {
            console.log('Processando deleção de imagens:', deleteImages);
            const imagesToDelete = deleteImages.split(',');
            
            // Deletar arquivos físicos
            for (const imageUrl of imagesToDelete) {
                const imagePath = path.join(__dirname, imageUrl);
                if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                        console.log('Imagem deletada:', imagePath);
                    } catch (err) {
                        console.error('Erro ao deletar arquivo:', err);
                    }
                }
            }

            // Deletar registros no banco
            const placeholders = imagesToDelete.map(() => '?').join(',');
            await new Promise((resolve, reject) => {
                const query = `DELETE FROM product_images WHERE product_id = ? AND image_url IN (${placeholders})`;
                const params = [productId, ...imagesToDelete];
                
                console.log('Query de deleção:', query);
                console.log('Parâmetros:', params);

                db.run(query, params, (err) => {
                    if (err) {
                        console.error('Erro ao deletar registros de imagem:', err);
                        reject(err);
                    } else {
                        console.log('Registros de imagem deletados com sucesso');
                        resolve();
                    }
                });
            });
        }

        // Atualizar produto
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE products SET name = ?, price = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [name, price, description, productId],
                function(err) {
                    if (err) {
                        console.error('Erro ao atualizar produto:', err);
                        reject(err);
                    } else {
                        resolve(this.changes);
                    }
                }
            );
        });

        // Se houver novas imagens
        const files = req.files || [];
        if (files.length > 0) {
            console.log('Processando novas imagens:', files.length);
            const imageValues = files.map(file => 
                `(${productId}, '/uploads/${file.filename}')`
            ).join(',');

            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO product_images (product_id, image_url) VALUES ${imageValues}`, [], (err) => {
                    if (err) {
                        console.error('Erro ao inserir imagens:', err);
                        reject(err);
                    } else {
                        console.log('Novas imagens inseridas com sucesso');
                        resolve();
                    }
                });
            });
        }

        // Buscar produto atualizado
        const product = await new Promise((resolve, reject) => {
            const query = `
                SELECT p.*, GROUP_CONCAT(pi.image_url) as images 
                FROM products p 
                LEFT JOIN product_images pi ON p.id = pi.product_id 
                WHERE p.id = ? 
                GROUP BY p.id
            `;

            db.get(query, [productId], (err, row) => {
                if (err) {
                    console.error('Erro ao buscar produto atualizado:', err);
                    reject(err);
                } else if (!row) {
                    reject(new Error('Produto não encontrado'));
                } else {
                    row.images = row.images ? row.images.split(',') : [];
                    console.log('Produto recuperado após atualização:', row);
                    resolve(row);
                }
            });
        });

        res.json(product);

    } catch (error) {
        console.error('Erro durante atualização:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});

app.delete('/products/:id', authenticateToken, isAdmin, (req, res) => {
    const productId = req.params.id;

    db.all('SELECT image_url FROM product_images WHERE product_id = ?', [productId], (err, rows) => {
        if (rows) {
            rows.forEach(row => {
                const imagePath = path.join(__dirname, row.image_url);
                if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                        console.log('Imagem deletada:', imagePath);
                    } catch (err) {
                        console.error('Erro ao deletar arquivo:', err);
                    }
                }
            });
        }

        db.run('DELETE FROM products WHERE id = ?', productId, function(err) {
            if (err) {
                console.error('Erro ao deletar produto:', err);
                return res.status(500).json({ error: 'Erro ao deletar produto' });
            }
            console.log('Produto deletado com sucesso');
            res.json({ success: true });
        });
    });
});

// Servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Tratamento de erros do Multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. Máximo de 5MB permitido.' });
        }
    }
    next(err);
});

// Tratamento geral de erros
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});