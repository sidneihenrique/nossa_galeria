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

    async function handleSubmit(event) {
        event.preventDefault();
        showStatus('');

        const file = fileInput.files[0];
        if (!file) {
            showStatus('Escolha uma foto primeiro.');
            return;
        }

        const isoDate = todayToggle.checked ? toIsoDate(new Date()) : dateInput.value;
        if (!parseIsoDate(isoDate)) {
            showStatus('Escolha a data da foto ou marque "Hoje".');
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = 'Guardando…';

        try {
            const name = timestampName();
            const description = descInput.value.trim();
            const image = await prepareImage(file);
            const info = new Blob([buildInfoText(isoDate, description)], { type: 'text/plain;charset=utf-8' });

            const body = new FormData();
            body.append('nome', name);
            body.append('imagem', image, `${name}${image === file ? '' : '.jpg'}`);
            body.append('info', info, `${name}.txt`);

            let response;
            try {
                response = await fetch(`${config.apiUrl}/upload`, { method: 'POST', body });
            } catch (error) {
                throw new Error('Não consegui falar com o servidor. Ele está ligado no computador?');
            }

            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.erro || `Erro ${response.status} ao enviar.`);

            // Mostra na hora; para todo mundo aparece quando o GitHub Pages atualizar
            photos.push({ name, image: URL.createObjectURL(image), date: isoDate, description });
            render();

            form.reset();
            updateCounter();
            location.hash = '';
            showToast('Foto guardada! Em alguns minutos ela aparece no site para todo mundo.');
        } catch (error) {
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
    descInput.addEventListener('input', updateCounter);
    form.addEventListener('submit', handleSubmit);
    window.addEventListener('hashchange', () => {
        if (location.hash === '#upload') {
            updateTodayLabel();
            showStatus('');
        }
    });

    if (window.Fancybox) {
        Fancybox.bind('[data-fancybox="gallery"]', { Hash: false });
    }

    loadPhotos();
})();
