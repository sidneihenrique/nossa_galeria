// Configuração do site.
window.GALERIA_CONFIG = {
    // Repositório onde as fotos são guardadas (envio direto pela API do GitHub).
    github: {
        owner: 'sidneihenrique',
        repo: 'nossa_galeria',
        branch: 'main',
        uploadsPath: 'uploads',
    },

    // Fotos maiores que isso (lado maior, em px) são reduzidas antes do envio.
    maxImageSide: 2048,
    jpegQuality: 0.86,
};
