(() => {
    'use strict';

    const config = window.GALERIA_CONFIG;

    const WEEKDAYS = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
    const MONTHS_SHORT = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

    const grid = document.getElementById('card-grid');
    const template = document.getElementById('card-template');
    const countLabel = document.getElementById('photo-count');
    const emptyMessage = document.getElementById('gallery-empty');

    const form = document.getElementById('upload-form');
    const fileInput = form.elements.foto;
    const preview = document.getElementById('dropzone-preview');
    const dropzoneTitle = document.getElementById('dropzone-title');
    const dropzoneHint = document.getElementById('dropzone-hint');
    const sameDescLabel = document.getElementById('same-desc');
    const sameDescToggle = form.elements.mesmaDescricao;
    const perPhotoList = document.getElementById('photo-descriptions');
    const tokenField = document.getElementById('token-field');
    const tokenInput = form.elements.token;
    const forgetTokenButton = document.getElementById('forget-token');
    const dateInput = form.elements.data;
    const descInput = form.elements.descricao;
    const todayToggle = document.getElementById('use-today');
    const todayLabel = document.getElementById('today-label');
    const counter = document.getElementById('desc-counter');
    const formStatus = document.getElementById('form-status');
    const saveButton = form.querySelector('.save-button');
    const toast = document.getElementById('toast');

    let photos = [];

    // =====================
    // Datas
    // =====================

    const pad = (n, size = 2) => String(n).padStart(size, '0');

    const toIsoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    // "2026-09-27" -> Date local (sem deslocamento de fuso)
    function parseIsoDate(iso) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
        return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
    }

    // Nome do arquivo = momento da publicação: 2026-10-14_15-30-12-123
    function timestampName(d = new Date()) {
        return `${toIsoDate(d)}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}-${pad(d.getMilliseconds(), 3)}`;
    }

    // =====================
    // Arquivo .txt
    // =====================
    //
    // data: 2026-09-27
    // descricao:
    // Texto livre, pode ter várias linhas.

    function buildInfoText(isoDate, description) {
        return `data: ${isoDate}\ndescricao:\n${description.trim()}\n`;
    }

    function parseInfoText(text) {
        const normalized = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
        const date = /^data:\s*(\d{4}-\d{2}-\d{2})\s*$/m.exec(normalized);
        const desc = /^descricao:[ \t]*\n?([\s\S]*)$/m.exec(normalized);
        return {
            date: date ? date[1] : null,
            description: desc ? desc[1].trim() : '',
        };
    }

    // =====================
    // Galeria
    // =====================

    async function loadPhotos() {
        let manifest;
        try {
            const response = await fetch(`./uploads/manifest.json?v=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) throw new Error(response.status);
            manifest = await response.json();
        } catch (error) {
            manifest = { fotos: [] };
        }

        const entries = await Promise.all((manifest.fotos || []).map(async (entry) => {
            let info = { date: null, description: '' };
            try {
                const response = await fetch(`./uploads/${encodeURIComponent(entry.info)}`);
                if (response.ok) info = parseInfoText(await response.text());
            } catch (error) { /* mostra a foto mesmo sem o .txt */ }

            return {
                name: entry.info.replace(/\.txt$/, ''),
                image: `./uploads/${encodeURIComponent(entry.imagem)}`,
                // Sem data no .txt, usa o dia da publicação (início do nome)
                date: info.date || entry.info.slice(0, 10),
                description: info.description,
            };
        }));

        photos = entries;
        render();
    }

    function sortPhotos() {
        // Mais recentes primeiro (pela data da foto; empate pelo momento da publicação)
        photos.sort((a, b) => b.date.localeCompare(a.date) || b.name.localeCompare(a.name));
    }

    function render() {
        sortPhotos();
        grid.replaceChildren(...photos.map((photo, index) => createCard(photo, photos.length - index)));

        emptyMessage.hidden = photos.length > 0;

        if (photos.length === 0) {
            countLabel.textContent = '0 fotos';
        } else {
            const oldest = parseIsoDate(photos[photos.length - 1].date);
            const total = photos.length === 1 ? '1 foto' : `${photos.length} fotos`;
            countLabel.textContent = oldest
                ? `${total} · desde ${MONTHS_SHORT[oldest.getMonth()]} ${oldest.getFullYear()}`
                : total;
        }
    }

    function createCard(photo, number) {
        const card = template.content.firstElementChild.cloneNode(true);
        const id = `flip-${photo.name}`;
        const date = parseIsoDate(photo.date);
        const dateText = date ? `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}` : '';
        const description = photo.description || 'Sem descrição.';

        card.querySelector('.flip-toggle').id = id;
        card.querySelectorAll('.flip-button').forEach((label) => label.setAttribute('for', id));

        const link = card.querySelector('.photo');
        link.href = photo.image;
        link.dataset.caption = escapeHtml(dateText ? `${dateText} — ${description}` : description);
        // Nome do arquivo baixado: nos-dois-2026-10-09_10-50-19-865.jpg
        const extension = (/\.(\w+)$/.exec(photo.image) || [, 'jpg'])[1];
        link.dataset.downloadFilename = `nos-dois-${photo.date}_${photo.name.slice(11)}.${extension}`;

        const img = card.querySelector('img');
        img.src = photo.image;
        img.alt = photo.description || `Foto de ${dateText}`;

        card.querySelector('.weekday').textContent = date ? WEEKDAYS[date.getDay()] : '';
        card.querySelector('.date').textContent = dateText;
        card.querySelector('.description').textContent = description;
        card.querySelector('.photo-number').textContent = `Nº ${pad(number)}`;

        return card;
    }

    function escapeHtml(text) {
        const span = document.createElement('span');
        span.textContent = text;
        return span.innerHTML;
    }

    // =====================
    // Upload
    // =====================

    function updateTodayLabel() {
        const now = new Date();
        todayLabel.textContent = `Hoje, ${now.getDate()} de ${MONTHS_LONG[now.getMonth()]} de ${now.getFullYear()}`;
        dateInput.max = toIsoDate(now);
    }

    function updateCounter() {
        const length = descInput.value.length;
        counter.textContent = length ? `${length}/280` : 'até 280';
    }

    const MAX_FILES = 20;
    let selectionUrls = [];

    // Prévia da primeira foto dentro do campo e, com várias, a lista de descrições por foto
    function updateSelection() {
        selectionUrls.forEach((url) => URL.revokeObjectURL(url));
        preview.removeAttribute('src');
        preview.hidden = true;
        perPhotoList.replaceChildren();

        const files = Array.from(fileInput.files);
        selectionUrls = files.map((file) => URL.createObjectURL(file));

        if (files.length) {
            preview.src = selectionUrls[0];
            preview.hidden = false;
        }

        selectionUrls.forEach((url, index) => {
            const item = document.createElement('div');
            item.className = 'photo-description';

            const thumb = document.createElement('img');
            thumb.src = url;
            thumb.alt = `Foto ${index + 1}`;

            const textarea = document.createElement('textarea');
            textarea.rows = 2;
            textarea.maxLength = 280;
            textarea.placeholder = `Descrição da foto ${index + 1}`;

            item.append(thumb, textarea);
            perPhotoList.append(item);
        });

        const count = files.length;
        dropzoneTitle.textContent = count > 1 ? `${count} fotos selecionadas` : 'Foto selecionada';
        dropzoneHint.textContent = count > 1 ? `${count} fotos · toque para trocar` : 'Toque para trocar';
        sameDescLabel.hidden = count < 2;
        showStatus(count > MAX_FILES ? `Escolha no máximo ${MAX_FILES} fotos por vez.` : '');
        updateDescriptionMode();
    }

    // Mesma descrição para todas (um campo) ou uma por foto (lista com miniaturas)
    function updateDescriptionMode() {
        const perPhoto = fileInput.files.length > 1 && !sameDescToggle.checked;
        perPhotoList.hidden = !perPhoto;
        descInput.hidden = perPhoto;
        counter.hidden = perPhoto;

        if (perPhoto) {
            // Começa cada campo com o texto que já estava escrito
            perPhotoList.querySelectorAll('textarea').forEach((textarea) => {
                if (!textarea.value) textarea.value = descInput.value;
            });
        }
    }

    // Formato que o navegador não mostra (ex.: HEIC): fica só o aviso "Foto selecionada"
    preview.addEventListener('error', () => {
        if (preview.hasAttribute('src')) preview.hidden = true;
    });

    function showStatus(message) {
        formStatus.textContent = message;
        formStatus.hidden = !message;
    }

    let toastTimer;
    function showToast(message) {
        toast.textContent = message;
        toast.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
    }

    // Reduz fotos grandes de celular para algo leve para o site
    async function prepareImage(file) {
        if (!('createImageBitmap' in window)) return file;
        try {
            const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
            const scale = Math.min(1, config.maxImageSide / Math.max(bitmap.width, bitmap.height));
            const isWebFormat = /^image\/(jpeg|png|webp)$/.test(file.type);

            if (scale === 1 && isWebFormat && file.size <= 1.5 * 1024 * 1024) {
                bitmap.close();
                return file;
            }

            const canvas = document.createElement('canvas');
            canvas.width = Math.round(bitmap.width * scale);
            canvas.height = Math.round(bitmap.height * scale);
            canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            bitmap.close();

            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', config.jpegQuality));
            return blob || file;
        } catch (error) {
            return file;
        }
    }

    // =====================
    // Envio direto para o GitHub
    // =====================
    //
    // Um único commit com a imagem, o .txt e o manifest.json atualizado,
    // feito pela API do GitHub com a chave (token) salva neste aparelho.

    const TOKEN_KEY = 'galeria.githubToken';
    const IMAGE_EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

    function getToken() {
        try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (error) { return ''; }
    }

    function saveToken(token) {
        try { localStorage.setItem(TOKEN_KEY, token); } catch (error) { /* só vale para esta visita */ }
    }

    function forgetToken() {
        try { localStorage.removeItem(TOKEN_KEY); } catch (error) { /* nada salvo */ }
    }

    function updateTokenField() {
        const hasToken = Boolean(getToken());
        tokenField.hidden = hasToken;
        forgetTokenButton.hidden = !hasToken;
    }

    async function github(token, path, options = {}) {
        const { owner, repo } = config.github;
        let response;
        try {
            response = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
                ...options,
                cache: 'no-store',
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `Bearer ${token}`,
                    'X-GitHub-Api-Version': '2022-11-28',
                    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                },
            });
        } catch (error) {
            throw new Error('Não consegui falar com o GitHub. Verifique a internet.');
        }

        if (!response.ok) {
            const messages = {
                401: 'A chave do GitHub é inválida ou expirou. Cole uma nova.',
                403: 'A chave do GitHub não tem permissão para gravar no repositório.',
                404: 'A chave do GitHub não tem acesso ao repositório nossa_galeria.',
            };
            const error = new Error(messages[response.status] || `O GitHub recusou o envio (erro ${response.status}).`);
            error.status = response.status;
            throw error;
        }
        return response.json();
    }

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.slice(reader.result.indexOf(',') + 1));
            reader.onerror = () => reject(new Error('Não consegui ler a foto.'));
            reader.readAsDataURL(blob);
        });
    }

    function base64ToText(base64) {
        const bytes = Uint8Array.from(atob(base64.replace(/\s/g, '')), (c) => c.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }

    async function readRemoteManifest(token, commitSha) {
        try {
            const file = await github(token, `/contents/${config.github.uploadsPath}/manifest.json?ref=${commitSha}`);
            const manifest = JSON.parse(base64ToText(file.content));
            return Array.isArray(manifest.fotos) ? manifest : { fotos: [] };
        } catch (error) {
            if (error.status === 404) return { fotos: [] };
            throw error;
        }
    }

    // items: [{ name, image, extension, infoText }] — todas as fotos vão no mesmo commit
    async function uploadToGithub(token, items, onProgress = () => {}) {
        const { branch, uploadsPath } = config.github;
        const files = items.map((item) => ({
            ...item,
            imageFile: `${item.name}.${item.extension}`,
            infoFile: `${item.name}.txt`,
        }));

        for (const [index, file] of files.entries()) {
            onProgress(index + 1, files.length);
            const blob = await github(token, '/git/blobs', {
                method: 'POST',
                body: JSON.stringify({ content: await blobToBase64(file.image), encoding: 'base64' }),
            });
            file.blobSha = blob.sha;
        }

        const names = files.map((file) => file.name);
        const message = (files.length === 1 ? 'Adiciona 1 foto' : `Adiciona ${files.length} fotos`) + `\n\n${names.join('\n')}`;

        // Se alguém publicar ao mesmo tempo, o branch anda e a gente refaz o commit em cima
        for (let attempt = 1; ; attempt++) {
            const ref = await github(token, `/git/ref/heads/${branch}`);
            const head = ref.object.sha;
            const commit = await github(token, `/git/commits/${head}`);

            const manifest = await readRemoteManifest(token, head);
            const newInfos = new Set(files.map((file) => file.infoFile));
            manifest.fotos = manifest.fotos.filter((entry) => !newInfos.has(entry.info));
            files.forEach((file) => manifest.fotos.push({ imagem: file.imageFile, info: file.infoFile }));
            manifest.fotos.sort((a, b) => b.info.localeCompare(a.info));

            const tree = await github(token, '/git/trees', {
                method: 'POST',
                body: JSON.stringify({
                    base_tree: commit.tree.sha,
                    tree: [
                        ...files.flatMap((file) => [
                            { path: `${uploadsPath}/${file.imageFile}`, mode: '100644', type: 'blob', sha: file.blobSha },
                            { path: `${uploadsPath}/${file.infoFile}`, mode: '100644', type: 'blob', content: file.infoText },
                        ]),
                        { path: `${uploadsPath}/manifest.json`, mode: '100644', type: 'blob', content: JSON.stringify(manifest, null, 4) + '\n' },
                    ],
                }),
            });

            const newCommit = await github(token, '/git/commits', {
                method: 'POST',
                body: JSON.stringify({ message, tree: tree.sha, parents: [head] }),
            });

            try {
                await github(token, `/git/refs/heads/${branch}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ sha: newCommit.sha }),
                });
                return;
            } catch (error) {
                if (error.status !== 422 || attempt >= 3) throw error;
            }
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        showStatus('');

        const files = Array.from(fileInput.files);
        if (!files.length) {
            showStatus('Escolha uma foto primeiro.');
            return;
        }
        if (files.length > MAX_FILES) {
            showStatus(`Escolha no máximo ${MAX_FILES} fotos por vez.`);
            return;
        }

        const isoDate = todayToggle.checked ? toIsoDate(new Date()) : dateInput.value;
        if (!parseIsoDate(isoDate)) {
            showStatus('Escolha a data da foto ou marque "Hoje".');
            return;
        }

        const token = getToken() || tokenInput.value.trim();
        if (!token) {
            showStatus('Cole a chave do GitHub para guardar fotos por aqui.');
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = 'Guardando…';

        try {
            const total = files.length;
            const perPhoto = total > 1 && !sameDescToggle.checked;
            const perPhotoInputs = perPhotoList.querySelectorAll('textarea');
            const publishedAt = Date.now();
            const items = [];

            for (const [index, file] of files.entries()) {
                if (total > 1) saveButton.textContent = `Preparando ${index + 1}/${total}…`;
                const image = await prepareImage(file);
                const extension = IMAGE_EXTENSIONS[image.type];
                if (!extension) {
                    throw new Error(total > 1
                        ? `A foto ${index + 1} está num formato não suportado (use JPG, PNG, WEBP ou GIF).`
                        : 'Formato de imagem não suportado (use JPG, PNG, WEBP ou GIF).');
                }

                const description = (perPhoto ? perPhotoInputs[index].value : descInput.value).trim();
                items.push({
                    // 1 ms de diferença entre elas; a primeira escolhida fica com o horário mais
                    // recente, para aparecer primeiro entre fotos do mesmo dia
                    name: timestampName(new Date(publishedAt + (total - 1 - index))),
                    image,
                    extension,
                    description,
                    infoText: buildInfoText(isoDate, description),
                });
            }

            await uploadToGithub(token, items, (done) => {
                if (total > 1) saveButton.textContent = `Enviando ${done}/${total}…`;
            });
            saveToken(token);

            // Mostra na hora; para todo mundo aparece quando o GitHub Pages atualizar
            items.forEach((item) => {
                photos.push({ name: item.name, image: URL.createObjectURL(item.image), date: isoDate, description: item.description });
            });
            render();

            form.reset();
            updateSelection();
            updateCounter();
            updateTokenField();
            location.hash = '';
            showToast(total > 1
                ? `${total} fotos guardadas! Em alguns minutos elas aparecem no site para todo mundo.`
                : 'Foto guardada! Em alguns minutos ela aparece no site para todo mundo.');
        } catch (error) {
            if ([401, 403, 404].includes(error.status)) {
                forgetToken();
                updateTokenField();
            }
            showStatus(error.message);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Guardar foto';
        }
    }

    // =====================
    // Início
    // =====================

    updateTodayLabel();
    updateCounter();
    updateTokenField();
    descInput.addEventListener('input', updateCounter);
    forgetTokenButton.addEventListener('click', () => {
        forgetToken();
        tokenInput.value = '';
        updateTokenField();
        showToast('Chave do GitHub apagada deste aparelho.');
    });
    fileInput.addEventListener('change', updateSelection);
    sameDescToggle.addEventListener('change', updateDescriptionMode);
    form.addEventListener('submit', handleSubmit);
    window.addEventListener('hashchange', () => {
        if (location.hash === '#upload') {
            updateTodayLabel();
            updateTokenField();
            showStatus('');
        }
    });

    if (window.Fancybox) {
        Fancybox.bind('[data-fancybox="gallery"]', {
            Hash: false,
            Toolbar: {
                display: {
                    left: ['infobar'],
                    middle: [],
                    right: ['download', 'slideshow', 'thumbs', 'close'],
                },
            },
        });
    }

    loadPhotos();
})();
