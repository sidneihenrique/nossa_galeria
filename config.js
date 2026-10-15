// Configuração do site.
window.GALERIA_CONFIG = {
    // Envio direto para o GitHub (usado no GitHub Pages, ou em qualquer
    // endereço quando o aparelho já tem a chave do GitHub salva).
    github: {
        owner: 'sidneihenrique',
        repo: 'nossa_galeria',
        branch: 'main',
        uploadsPath: 'uploads',
    },

    // Backend PHP local, usado quando o site é aberto por ele
    // (http://localhost:8000 ou http://IP-DO-PC:8000) e não há chave salva.
    apiUrl: location.origin + '/api',

    // Fotos maiores que isso (lado maior, em px) são reduzidas antes do envio.
    maxImageSide: 2048,
    jpegQuality: 0.86,
};
