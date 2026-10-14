// Configuração do site.
//
// apiUrl: endereço do backend PHP que roda no seu computador.
// - Aberto pelo GitHub Pages: fala com o backend em http://localhost:8000.
// - Aberto pelo próprio backend (http://localhost:8000 ou http://IP-DO-PC:8000
//   no celular, na mesma rede): usa o mesmo endereço da página.
window.GALERIA_CONFIG = {
    apiUrl: location.hostname.endsWith('github.io')
        ? 'http://localhost:8000/api'
        : location.origin + '/api',

    // Fotos maiores que isso (lado maior, em px) são reduzidas antes do envio.
    maxImageSide: 2048,
    jpegQuality: 0.86,
};
