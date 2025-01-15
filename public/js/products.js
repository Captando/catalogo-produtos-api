window.products = {
    init() {
        this.productForm = document.getElementById('productForm');
        this.productList = document.getElementById('productList');
        this.searchInput = document.getElementById('searchInput');
        this.editForm = document.getElementById('editForm');

        if (this.productForm) {
            this.setupAddForm();
        }
        
        if (this.searchInput) {
            this.setupSearch();
        }

        if (this.editForm) {
            this.setupEditForm();
        }

        // Carregar produtos inicialmente
        this.fetchProducts();
    },

    setupSearch() {
        let searchTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.fetchProducts(e.target.value);
            }, 300);
        });
    },

    async fetchProducts(search = '') {
        try {
            const url = search 
                ? `/products?search=${encodeURIComponent(search)}`
                : '/products';

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                }
            });

            if (!response.ok) throw new Error('Erro ao carregar produtos');
            const products = await response.json();
            this.renderProducts(products);
        } catch (error) {
            UI.showMessage('error', error.message);
        }
    },

    renderProducts(products) {
        if (!this.productList) return;

        if (products.length === 0) {
            this.productList.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-box-open"></i>
                    <p>Nenhum produto encontrado</p>
                </div>`;
            return;
        }

        this.productList.innerHTML = products.map(product => this.createProductCard(product)).join('');
    },

    createProductCard(product) {
        return `
            <div class="product-card">
                <div class="product-images">
                    ${this.renderProductImages(product)}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-price">${UI.formatPrice(product.price)}</p>
                    ${product.description ? 
                        `<p class="product-description">${product.description}</p>` : 
                        ''}
                    <div class="share-buttons">
                        <button onclick="window.share.open(${JSON.stringify(product).replace(/"/g, '&quot;')})" 
                                class="share-button whatsapp-button">
                            <i class="fab fa-whatsapp"></i> Compartilhar
                        </button>
                        <button onclick="window.products.copyProductInfo(${JSON.stringify(product).replace(/"/g, '&quot;')})" 
                                class="share-button copy-button">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                    ${auth.isAdmin() ? this.renderAdminButtons(product.id) : ''}
                </div>
            </div>
        `;
    },

    renderProductImages(product) {
        if (!product.images?.length) {
            return `
                <div class="product-image-container">
                    <div class="product-image empty">
                        <i class="fas fa-image"></i>
                        <span>Sem imagem</span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="product-image-container">
                <img src="${product.images[0]}" 
                     alt="${product.name}" 
                     class="main-product-image"
                     data-product-id="${product.id}">
                ${product.images.length > 1 ? this.renderThumbnails(product) : ''}
            </div>
        `;
    },

    renderThumbnails(product) {
        if (!product.images || product.images.length <= 1) return '';
        
        return `
            <div class="product-thumbnails">
                ${product.images.map((image, index) => `
                    <div class="thumbnail-container">
                        <img src="${image}" 
                            class="product-thumbnail ${index === 0 ? 'active' : ''}"
                            onclick="window.products.changeMainImage(${product.id}, '${image}', this)"
                            alt="Thumbnail ${index + 1}">
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderAdminButtons(productId) {
        return `
            <div class="admin-buttons">
                <button onclick="window.products.editProduct(${productId})" class="button edit-button">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button onclick="window.products.deleteProduct(${productId})" class="button danger-button">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        `;
    },

    setupAddForm() {
        this.productForm.innerHTML = `
            <div class="form-group">
                <label class="form-label">Nome do Produto *</label>
                <input type="text" id="productName" required class="form-input"
                       placeholder="Digite o nome do produto">
            </div>

            <div class="form-group">
                <label class="form-label">Preço (R$) *</label>
                <input type="number" id="productPrice" step="0.01" required class="form-input"
                       placeholder="0,00" min="0">
            </div>

            <div class="form-group">
                <label class="form-label">Descrição</label>
                <textarea id="productDescription" class="form-input" rows="4"
                          placeholder="Descrição detalhada do produto"></textarea>
            </div>

            <div class="form-group">
                <label class="form-label">Imagens (até 5 imagens)</label>
                <input type="file" id="productImages" accept=".jpg,.jpeg,.png,.gif" multiple class="form-input">
                <div id="imagePreview" class="image-preview"></div>
                <p class="preview-note">Formatos permitidos: JPG, PNG, GIF. Tamanho máximo: 5MB por imagem</p>
            </div>

            <div class="button-group">
                <button type="submit" class="button primary-button">
                    <i class="fas fa-plus"></i> Adicionar Produto
                </button>
            </div>
        `;

        this.productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddProduct(e);
        });

        document.getElementById('productImages').addEventListener('change', (e) => {
            this.handleImagePreview(e, 'imagePreview');
        });
    },

    setupEditForm() {
        if (!this.editForm) return;

        this.editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEditProduct(e);
        });

        document.getElementById('editProductImages').addEventListener('change', (e) => {
            this.handleImagePreview(e, 'editImagePreview');
        });

        document.getElementById('editCurrentImages').addEventListener('click', (e) => {
            if (e.target.closest('.remove-image')) {
                const imageContainer = e.target.closest('.current-image');
                imageContainer.classList.toggle('marked-for-deletion');
            }
        });
    },

    async handleAddProduct(e) {
        e.preventDefault();
        const formData = new FormData();

        formData.append('name', document.getElementById('productName').value);
        formData.append('price', document.getElementById('productPrice').value);
        formData.append('description', document.getElementById('productDescription').value);

        const imageFiles = document.getElementById('productImages').files;
        Array.from(imageFiles).forEach(file => {
            formData.append('images', file);
        });

        try {
            console.log('Enviando produto...');
            const response = await fetch('/products', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao adicionar produto');
            }

            UI.showMessage('success', 'Produto adicionado com sucesso!');
            e.target.reset();
            document.getElementById('imagePreview').innerHTML = '';
            await this.fetchProducts();
        } catch (error) {
            console.error('Erro completo:', error);
            UI.showMessage('error', error.message);
        }
    },

    async handleEditProduct(e) {
        e.preventDefault();
        const productId = document.getElementById('editProductId').value;
        const formData = new FormData();

        formData.append('name', document.getElementById('editProductName').value);
        formData.append('price', document.getElementById('editProductPrice').value);
        formData.append('description', document.getElementById('editProductDescription').value);

        // Imagens marcadas para exclusão
        const imagesToDelete = Array.from(document.querySelectorAll('.current-image.marked-for-deletion img'))
            .map(img => new URL(img.src).pathname)
            .join(',');
        
        if (imagesToDelete) {
            formData.append('deleteImages', imagesToDelete);
        }

        // Novas imagens
        const imageFiles = document.getElementById('editProductImages').files;
        Array.from(imageFiles).forEach(file => {
            formData.append('images', file);
        });

        try {
            const response = await fetch(`/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                },
                body: formData
            });

            // Verificar se a resposta está ok antes de tentar parsear o JSON
            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Erro ao atualizar produto');
                } else {
                    throw new Error('Erro ao atualizar produto. Por favor, tente novamente.');
                }
            }

            // Tentar parsear a resposta como JSON
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Erro ao parsear resposta:', parseError);
                throw new Error('Erro ao processar resposta do servidor');
            }

            // Atualiza a interface após sucesso
            await this.fetchProducts();
            UI.showMessage('success', 'Produto atualizado com sucesso!');
            this.closeEditModal();
        } catch (error) {
            console.error('Erro completo:', error);
            UI.showMessage('error', error.message);
        }
    },

    handleImagePreview(e, previewId) {
        const preview = document.getElementById(previewId);
        preview.innerHTML = '';
        const files = Array.from(e.target.files);

        if (files.length > 5) {
            UI.showMessage('error', 'Máximo de 5 imagens permitido');
            e.target.value = '';
            return;
        }

        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                UI.showMessage('error', `Arquivo ${file.name} muito grande. Máximo de 5MB`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'preview-image-container';
                imgContainer.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                preview.appendChild(imgContainer);
            };
            reader.readAsDataURL(file);
        });
    },

    changeMainImage(productId, newSrc, thumbnailElement) {
        const mainImage = document.querySelector(`[data-product-id="${productId}"]`);
        if (mainImage) {
            mainImage.src = newSrc;
            // Atualiza o status ativo dos thumbnails
            thumbnailElement.closest('.product-thumbnails')
                .querySelectorAll('.product-thumbnail')
                .forEach(thumb => thumb.classList.remove('active'));
            thumbnailElement.classList.add('active');
        }
    },

    copyProductInfo(product) {
        let text = `${product.name}\n${UI.formatPrice(product.price)}`;
        if (product.description) {
            text += `\n\n${product.description}`;
        }

        navigator.clipboard.writeText(text)
            .then(() => UI.showCopiedTooltip())
            .catch(() => UI.showMessage('error', 'Erro ao copiar informações'));
    },

    async editProduct(id) {
        try {
            const response = await fetch(`/products/${id}`, {
                headers: {
                    'Authorization': `Bearer ${window.auth.token}`
                }
            });

            if (!response.ok) throw new Error('Erro ao carregar produto');
            
            const product = await response.json();
            this.showEditModal(product);
        } catch (error) {
            UI.showMessage('error', error.message);
        }
    },

    async deleteProduct(id) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        
        try {
            const response = await fetch(`/products/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.auth.token}`
                }
            });

            if (!response.ok) throw new Error('Erro ao excluir produto');
            
            UI.showMessage('success', 'Produto excluído com sucesso!');
            await this.fetchProducts();
        } catch (error) {
            UI.showMessage('error', error.message);
        }
    },

    showEditModal(product) {
        document.getElementById('editProductId').value = product.id;
        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductDescription').value = product.description || '';

        const currentImages = document.getElementById('editCurrentImages');
        currentImages.innerHTML = product.images.map((image, index) => `
            <div class="current-image">
                <img src="${image}" alt="Imagem ${index + 1}">
                <button type="button" class="remove-image" data-image="${image}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        document.getElementById('editProductImages').value = '';
        document.getElementById('editImagePreview').innerHTML = '';

        document.getElementById('editModal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        document.getElementById('editForm').reset();
        document.getElementById('editCurrentImages').innerHTML = '';
        document.getElementById('editImagePreview').innerHTML = '';
        document.body.style.overflow = 'auto';
    }
};

// Inicializar quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => window.products.init());