window.share = {
    modal: null,
    currentData: null,
    selectedImage: null,

    init() {
        this.modal = document.getElementById('shareModal');
        this.setupImageCheckbox();
    },

    setupImageCheckbox() {
        const imageCheckbox = document.querySelector('input[data-field="image"]');
        const otherCheckboxes = document.querySelectorAll('input[data-field]:not([data-field="image"])');
        const shareNotice = document.getElementById('shareNotice');
        
        if (imageCheckbox) {
            imageCheckbox.addEventListener('change', (e) => {
                const imagesGrid = document.getElementById('shareImagesGrid');
                shareNotice.style.display = e.target.checked ? 'block' : 'none';
                
                // Desabilitar outras opções quando imagem está selecionada
                otherCheckboxes.forEach(cb => {
                    cb.checked = false;
                    cb.disabled = e.target.checked;
                });

                if (e.target.checked && this.currentData?.images?.length > 0) {
                    imagesGrid.style.display = 'grid';
                } else {
                    imagesGrid.style.display = 'none';
                    this.selectedImage = null;
                }
            });
        }
    },

    open(productData) {
        this.currentData = productData;
        this.selectedImage = productData.images?.[0] || null;
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Reset checkboxes state
        const imageCheckbox = document.querySelector('input[data-field="image"]');
        const otherCheckboxes = document.querySelectorAll('input[data-field]:not([data-field="image"])');
        if (imageCheckbox) {
            imageCheckbox.checked = false;
            otherCheckboxes.forEach(cb => {
                cb.disabled = false;
                cb.checked = true;
            });
        }
        
        // Renderizar grid de imagens
        const imagesGrid = document.getElementById('shareImagesGrid');
        const shareNotice = document.getElementById('shareNotice');
        shareNotice.style.display = 'none';
        imagesGrid.innerHTML = '';
        imagesGrid.style.display = 'none';
        
        if (productData.images && productData.images.length > 0) {
            imagesGrid.innerHTML = productData.images.map((img, index) => `
                <div class="share-image-option" data-image="${img}" onclick="window.share.selectImage('${img}')">
                    <img src="${img}" alt="Imagem ${index + 1}">
                </div>
            `).join('');
        }
    },

    selectImage(imageUrl) {
        this.selectedImage = imageUrl;
        
        // Atualizar seleção visual
        document.querySelectorAll('.share-image-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.image === imageUrl);
        });
    },

    close() {
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.currentData = null;
        this.selectedImage = null;
    },

    async confirm() {
        if (!this.currentData) return;

        const options = document.querySelectorAll('#shareOptions input[type="checkbox"]');
        let text = '';

        // Construir o texto
        options.forEach(option => {
            if (option.checked) {
                switch(option.dataset.field) {
                    case 'name':
                        text += `*${this.currentData.name}*\n`;
                        break;
                    case 'price':
                        text += `💰 ${UI.formatPrice(this.currentData.price)}\n`;
                        break;
                    case 'description':
                        if (this.currentData.description) {
                            text += `\n📝 ${this.currentData.description}\n`;
                        }
                        break;
                }
            }
        });

        // Verificar se imagem foi selecionada
        const imageOption = Array.from(options).find(opt => opt.dataset.field === 'image' && opt.checked);
        if (imageOption && this.selectedImage) {
            try {
                // Tentar compartilhar com Web Share API
                if (navigator.share) {
                    try {
                        const response = await fetch(this.selectedImage);
                        const blob = await response.blob();
                        await navigator.share({
                            files: [new File([blob], 'produto.jpg', { type: 'image/jpeg' })]
                        });
                        this.close();
                        return;
                    } catch (err) {
                        console.log('Web Share API falhou, usando fallback...');
                    }
                }

                // Fallback para WhatsApp
                window.open(`https://api.whatsapp.com/send?text=_Imagem do produto sendo enviada em seguida_`, '_blank');

            } catch (error) {
                console.error('Erro ao processar imagem:', error);
            }
        } else {
            // Se não tem imagem, apenas compartilhar o texto
            const encodedText = encodeURIComponent(text);
            window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
        }

        this.close();
    }
};

document.addEventListener('DOMContentLoaded', () => window.share.init());