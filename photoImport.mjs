import { makeWord, saveWord } from './vocabularyData.mjs';
import { cropPixels } from './photoOcrGeometry.mjs';
import { isPhotoWord, suggestPhotoReading } from './photoOcrText.mjs';
import { orderPhotoCards } from './photoOcrNumbers.mjs';

const maxPhotoBytes = 30 * 1024 * 1024;
const maxPhotos = 2;
const maxSide = 1600;
let readingDictionary;

function loadReadingDictionary() {
    readingDictionary ??= import('./db_core.js').then(() => globalThis.MOE_DATA).catch(() => undefined);
    return readingDictionary;
}

function element(tag, text = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
}

function setNotice(node, message, error = false) {
    node.textContent = message;
    node.toggleAttribute('data-error', error);
}

function parseTeacherNumber(value) {
    const normalized = value.trim().normalize('NFKC');
    return /^[1-9][0-9]?$/u.test(normalized) ? Number(normalized) : null;
}

export function initPhotoImport({ cloud, currentBook, persist }) {
    const byId = id => document.getElementById(id);
    const camera = byId('photoCamera');
    const cameraLabel = byId('photoCameraLabel');
    const photoFile = byId('photoFile');
    const clear = byId('clearPhotos');
    const canvas = byId('photoCanvas');
    const cropFrame = byId('photoCropFrame');
    const cropPanel = byId('photoCrop');
    const preview = byId('photoPreview');
    const previewPicker = byId('photoPreviewPicker');
    const outline = byId('photoCropOutline');
    const edges = byId('photoEdges');
    const sliders = [...edges.querySelectorAll('input')];
    const status = byId('photoNotice');
    const loadStatus = byId('photoLoadNotice');
    const saveStatus = byId('photoSaveNotice');
    const scan = byId('scanPhoto');
    const scanHandwriting = byId('scanPhotoHandwriting');
    const cancelHandwriting = byId('cancelPhotoHandwriting');
    const handwritingPosition = byId('photoHandwritingPosition');
    const handwritingTarget = byId('photoHandwritingTarget');
    const review = byId('photoReview');
    const list = byId('photoCandidates');
    const save = byId('savePhotoWords');
    const add = byId('addPhotoWord');
    const sort = byId('sortPhotoWords');
    const selectAll = byId('selectAllPhotoWords');
    const resetCrop = byId('resetPhotoCrop');
    const orderNotice = byId('photoOrderNotice');
    const firstNumber = byId('photoFirstNumber');
    const lastNumber = byId('photoLastNumber');
    const rangeError = byId('photoRangeError');
    const missingNotice = byId('photoMissingNotice');
    const mode = byId('photoMode');
    const direction = byId('photoTextDirection');
    const drawText = byId('drawPhotoTextBox');
    const textHelp = byId('photoTextHelp');
    const diagnostics = byId('photoDiagnostics');
    const diagnosticList = diagnostics.querySelector('ul');
    const clearResults = byId('clearPhotoResults');
    let photoVersion = 0;
    let worker;
    let cancelScan;
    let scanVersion = 0;
    let photos = [];
    let loading = false;
    let scanning = false;
    let saving = false;
    let rangeEdited = false;
    let cards = [];
    let cardCount = 0;
    let handwritingEdges = null;
    let cropDrag = null;
    let handwritingCard = null;
    let selectingText = false;

    function gapFilled(card) {
        const word = card.word.value.trim();
        return isPhotoWord(word) && card.pronunciation.value.trim().split(/\s+/u).filter(Boolean).length === [...word].length;
    }

    function refreshButtons() {
        const eligible = cards.filter(card => !(card.gap || card.text) || gapFilled(card));
        const selected = cards.filter(card => card.selected.checked).length;
        const busy = loading || scanning || saving;
        const full = photos.length >= maxPhotos;
        camera.disabled = busy || full;
        cameraLabel.textContent = full ? '已滿 2 張' : photos.length === 1 ? '拍第二張' : '拍照';
        photoFile.disabled = loading || saving;
        clear.hidden = !photos.length;
        clear.disabled = busy;
        scan.disabled = busy || !photos.length;
        scanHandwriting.disabled = busy || !handwritingCard;
        cancelHandwriting.disabled = !handwritingCard;
        handwritingPosition.disabled = busy;
        add.disabled = busy;
        clearResults.disabled = busy || !cards.length;
        sort.disabled = busy || !cards.length;
        save.disabled = busy || Boolean(handwritingCard) || !selected;
        selectAll.disabled = busy || !eligible.length;
        selectAll.checked = eligible.length > 0 && eligible.every(card => card.selected.checked);
        selectAll.indeterminate = selected > 0 && !selectAll.checked;
        edges.disabled = busy;
        mode.disabled = busy || Boolean(handwritingCard);
        direction.disabled = drawText.disabled = busy;
        preview.disabled = saving || Boolean(handwritingCard);
        resetCrop.disabled = busy;
        for (const card of cards) {
            card.numberInput.disabled = busy;
            card.selected.disabled = busy || ((card.gap || card.text) && !card.selected.checked && !gapFilled(card));
            if (card.addHandwriting) card.addHandwriting.disabled = busy || Boolean(handwritingCard);
            if (card.useHandwriting) card.useHandwriting.disabled = busy || Boolean(handwritingCard);
        }
        firstNumber.disabled = lastNumber.disabled = busy;
    }

    function clearReview() {
        scanVersion++;
        cancelScan?.();
        scanning = false;
        cards = [];
        cardCount = 0;
        list.replaceChildren();
        diagnosticList.replaceChildren();
        diagnostics.hidden = true;
        setNotice(missingNotice, '');
        setNotice(orderNotice, '');
        review.hidden = true;
        setNotice(saveStatus, '');
        refreshButtons();
    }

    function reset() {
        photoVersion++;
        photos = [];
        loading = false;
        rangeEdited = false;
        firstNumber.value = lastNumber.value = '';
        showRangeError('');
        clearReview();
        canvas.width = canvas.height = 1;
        cropPanel.hidden = true;
        preview.replaceChildren();
        setHandwritingMode(null);
        camera.value = photoFile.value = '';
        setNotice(status, '');
        setNotice(loadStatus, '');
    }

    function edgeValues() {
        return Object.fromEntries(sliders.map(input => [input.name, Number(input.value)]));
    }

    function drawOutline(range = edgeValues()) {
        const { left, top, right, bottom } = range;
        Object.assign(outline.style, { left: left + '%', top: top + '%',
            width: (right - left) + '%', height: (bottom - top) + '%' });
    }

    function defaultEdges() {
        return Object.fromEntries(sliders.map(input => [input.name, Number(input.defaultValue)]));
    }

    function showPreview() {
        const photo = photos[Number(preview.value)];
        if (!photo) return;
        canvas.width = photo.canvas.width;
        canvas.height = photo.canvas.height;
        canvas.getContext('2d').drawImage(photo.canvas, 0, 0);
        const range = handwritingEdges ?? photo.edges;
        for (const input of sliders) input.value = range[input.name];
        drawOutline(range);
    }

    function updateMode() {
        const active = Boolean(handwritingCard);
        const text = mode.value === 'text';
        for (const input of sliders) {
            input.min = !active && !text && ['right', 'bottom'].includes(input.name) ? 5 : 0;
            input.max = !active && !text && ['left', 'top'].includes(input.name) ? 95 : 100;
        }
        cropFrame.toggleAttribute('data-selecting', active || (text && selectingText));
        drawText.setAttribute('aria-pressed', String(selectingText));
        drawText.textContent = selectingText ? '取消框選' : '框選文字';
        textHelp.textContent = selectingText ? '在照片上拖曳框住國字。'
            : '可直接辨識照片。若國字旁有注音，請框住國字。';
        byId('photoTextOptions').hidden = textHelp.hidden = active || !text;
        scan.hidden = active;
        scan.textContent = text ? '辨識照片文字' : '辨識圈選詞語';
        byId('photoNumberRange').hidden = active || text;
        sort.hidden = byId('photoMissingSection').hidden = text;
        clearResults.hidden = !text;
        byId('photoHandwritingOptions').hidden = !active;
        scanHandwriting.hidden = cancelHandwriting.hidden = !active;
        byId('photoCropLegend').textContent = active
            ? '在照片上拖曳或用滑桿框住一個紅色手寫字'
            : text ? '用滑桿調整文字範圍' : '調整裁切範圍，保留紅圈和旁邊的編號';
    }

    function setHandwritingMode(card) {
        handwritingCard = card;
        handwritingEdges = card ? defaultEdges() : null;
        cropDrag = null;
        selectingText = false;
        updateMode();
        showPreview();
        refreshButtons();
    }

    function previewPoint(event) {
        const rect = canvas.getBoundingClientRect();
        const percent = (value, start, length) => Math.max(0, Math.min(100, (value - start) * 100 / length));
        return { x: percent(event.clientX, rect.left, rect.width), y: percent(event.clientY, rect.top, rect.height) };
    }

    function drawCropBox(event) {
        const { start } = cropDrag;
        const point = previewPoint(event);
        if (Math.abs(point.x - start.x) < 1 || Math.abs(point.y - start.y) < 1) return;
        const range = {
            left: Math.min(start.x, point.x), right: Math.max(start.x, point.x),
            top: Math.min(start.y, point.y), bottom: Math.max(start.y, point.y)
        };
        for (const input of sliders) input.value = Math.round(range[input.name]);
        drawOutline(range);
        return range;
    }

    function changeCrop(event) {
        const values = edgeValues();
        const input = event.target;
        const gap = handwritingEdges || mode.value === 'text' ? 1 : 5;
        const limits = { left: [0, values.right - gap], right: [values.left + gap, 100],
            top: [0, values.bottom - gap], bottom: [values.top + gap, 100] };
        const [minimum, maximum] = limits[input.name];
        input.value = Math.min(maximum, Math.max(minimum, values[input.name]));
        updateCrop();
    }

    function updateCrop() {
        const photo = photos[Number(preview.value)];
        if (!photo || scanning || saving) return;
        if (handwritingEdges) {
            handwritingEdges = edgeValues();
            drawOutline();
            return;
        }
        photo.edges = edgeValues();
        if (mode.value === 'circles') clearReview();
        drawOutline();
        setNotice(status, '');
    }

    async function readPhoto(file) {
        if (file.size > maxPhotoBytes) throw new Error('超過 30 MB，請縮小後再試。');
        const url = URL.createObjectURL(file);
        const image = new Image();
        try {
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
                image.src = url;
            });
            const width = image.naturalWidth;
            const height = image.naturalHeight;
            if (!width || !height) throw new Error('Missing image dimensions');
            const factor = Math.min(1, maxSide / Math.max(width, height));
            const source = element('canvas');
            source.width = Math.max(1, Math.round(width * factor));
            source.height = Math.max(1, Math.round(height * factor));
            const context = source.getContext('2d', { willReadFrequently: true });
            context.fillStyle = 'white';
            context.fillRect(0, 0, source.width, source.height);
            context.drawImage(image, 0, 0, source.width, source.height);
            return source;
        } catch {
            throw new Error('無法開啟，請試試 JPG 或 PNG。');
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    async function openPhotos(files, append = false) {
        if (loading || saving || !files.length) return;
        if (append && (scanning || photos.length + files.length > maxPhotos)) return;
        if (files.length > maxPhotos) {
            setNotice(loadStatus, '一次最多選 2 張照片。請重新選擇。', true);
            return;
        }
        if (!append) reset();
        const version = photoVersion;
        const issues = [];
        const opened = [];
        loading = true;
        refreshButtons();
        setNotice(loadStatus, append ? '正在開啟剛拍的照片…' : `正在開啟 ${files.length} 張照片…`);
        for (const [index, file] of files.entries()) {
            let source;
            try {
                source = await readPhoto(file);
            } catch (error) {
                issues.push(`照片 ${photos.length + index + 1}：${error.message}`);
            }
            if (version !== photoVersion) return;
            if (source) opened.push({ canvas: source, edges: defaultEdges() });
        }
        loading = false;
        if (opened.length) {
            for (const photo of opened) photos.push({ ...photo, number: photos.length + 1 });
            clearReview();
            preview.replaceChildren(...photos.map((photo, index) => new Option('照片 ' + photo.number, index)));
            if (append) preview.value = String(photos.length - 1);
            previewPicker.hidden = photos.length < 2;
            cropPanel.hidden = false;
            showPreview();
            setNotice(status, photos.length === 2 ? '可切換預覽調整各張裁切，再一起辨識。' : '可調整範圍，或直接辨識整張照片。');
        }
        let loaded = photos.length ? `已選 ${photos.length} 張照片。` : '';
        if (append && photos.length === 1) loaded = '已保留第 1 張照片。可再拍一張一起辨識。';
        if (append && photos.length === 2) loaded = '已保留 2 張照片，可以一起辨識。';
        setNotice(loadStatus, [loaded, ...issues].filter(Boolean).join(' '), issues.length > 0);
        refreshButtons();
    }

    function labeledInput(container, labelText, attributes) {
        const label = element('label', labelText);
        const input = element('input');
        for (const [name, value] of Object.entries(attributes)) input.setAttribute(name, value);
        label.append(input);
        container.append(label);
        return input;
    }

    function fillBlanks(card) {
        const chars = [...card.word.value.trim()];
        card.blanks.replaceChildren(element('legend', '挖空字'));
        for (const [index, character] of chars.entries()) {
            const label = element('label');
            label.className = 'check';
            const check = element('input');
            check.type = 'checkbox';
            check.value = index + 1;
            check.checked = true;
            label.append(check, character);
            card.blanks.append(label);
        }
    }

    function updateReading(card) {
        const word = card.word.value.trim();
        if (card.manualReading) {
            if (card.readingWord !== word) setNotice(card.note, '詞語已修改，請重新核對注音。');
            return;
        }
        card.pronunciation.value = '';
        if (!isPhotoWord(word)) {
            setNotice(card.note, word ? '請輸入國字詞語。' : card.box ? '請依裁圖填寫詞語。' : '請填寫詞語。');
            return;
        }
        const revision = ++card.readingRevision;
        loadReadingDictionary().then(dictionary => {
            if (!cards.includes(card) || card.readingRevision !== revision ||
                card.manualReading || card.word.value.trim() !== word) return;
            const { reading, ambiguous } = suggestPhotoReading(word, dictionary);
            card.pronunciation.value = reading;
            const wordHint = card.uncertain
                ? (card.text ? '可能有漏字，請對照裁圖補齊。' : '圈內國字待核對。')
                : '';
            if (ambiguous.length) {
                setNotice(card.note, wordHint + `本機注音建議：「${ambiguous.join('、')}」有多種讀音，請核對。`);
            } else {
                const readingHint = reading ? '已帶入本機注音建議，請核對。' : '沒有完整的注音建議，請手動補上。';
                setNotice(card.note, wordHint + readingHint);
            }
            if (card.gap) refreshGapStatus();
            if (card.text) refreshButtons();
        });
    }

    function applyHandwritingSuggestion(card, mark, crop, photo) {
        const original = card.word.value.trim();
        if (card.manualWord) return;
        const combine = word => mark.before ? mark.word + word : word + mark.word;
        const proposed = combine(original);
        const canApply = Boolean(isPhotoWord(original) && mark.word && isPhotoWord(proposed));
        // A red character next to a complete printed term can belong to a neighboring circle.
        const auto = mark.confident && canApply && !card.uncertain && [...original].length === 1;
        const panel = element('div');
        panel.className = 'photo-handwriting-suggestion';
        const hint = element('p');
        const image = element('canvas');
        const source = photo.canvas;
        const x = Math.max(0, crop.x + mark.x - 3);
        const y = Math.max(0, crop.y + mark.y - 3);
        image.width = Math.min(source.width - x, mark.right - mark.x + 6);
        image.height = Math.min(source.height - y, mark.bottom - mark.y + 6);
        image.setAttribute('role', 'img');
        image.setAttribute('aria-label', '待核對的紅色手寫筆畫');
        image.getContext('2d').drawImage(source, x, y, image.width, image.height, 0, 0, image.width, image.height);
        const toggle = element('button');
        toggle.type = 'button';
        card.useHandwriting = toggle;
        let base = original;
        let applied = '';
        let suggestion = '';
        function renderSuggestion() {
            const current = card.word.value.trim();
            const undo = Boolean(applied && current === applied);
            const correctedSingle = [...original].length <= 1 && [...current].length === 1 && current !== mark.word;
            const eligible = mark.word && (current === original || correctedSingle);
            suggestion = eligible && isPhotoWord(current) && isPhotoWord(combine(current)) ? combine(current) : '';
            toggle.hidden = !undo && !suggestion;
            if (undo) {
                hint.textContent = `已合成「${applied}」，請核對。`;
                toggle.textContent = `還原「${base}」`;
            } else if (suggestion) {
                hint.textContent = `紅字配對待核對，可能是「${suggestion}」。`;
                toggle.textContent = `改成「${suggestion}」`;
            } else if (!current) {
                hint.textContent = mark.word ? `紅字可能是「${mark.word}」。先填圈內國字，就能在這裡合成詞語。`
                    : '附近有不確定的紅筆字。請對照兩張裁圖填寫詞語。';
            } else {
                hint.textContent = current === original ? '附近有不確定的紅筆字。請核對並修改詞語。'
                    : '請核對詞語、紅字和注音。';
            }
        }
        toggle.addEventListener('click', () => {
            if (applied && card.word.value.trim() === applied) {
                card.word.value = base;
                applied = '';
            } else if (suggestion) {
                base = card.word.value.trim();
                applied = suggestion;
                card.word.value = applied;
            } else {
                return;
            }
            card.word.dispatchEvent(new Event('input'));
        });
        card.word.addEventListener('input', () => {
            if (card.word.value.trim() !== applied) applied = '';
            renderSuggestion();
        });
        if (auto) {
            applied = proposed;
            card.word.value = applied;
            card.word.dispatchEvent(new Event('input'));
        }
        renderSuggestion();
        panel.append(hint, image, toggle);
        card.note.after(panel);
    }

    function addCard(box, crop, photo, gapNumber = null, text = mode.value === 'text') {
        const number = ++cardCount;
        const gap = gapNumber !== null;
        const row = element('li');
        row.className = 'photo-candidate';
        row.classList.toggle('photo-candidate-gap', gap);
        const aside = element('div');
        const title = element('strong', box ? '候選 ' + number : '手動新增');
        aside.append(title);
        if (gap) aside.append(element('small', '補填詞語'));
        if (box) {
            const source = photo.canvas;
            const tile = element('canvas');
            tile.setAttribute('role', 'img');
            tile.setAttribute('aria-label', '候選 ' + number + (text ? ' 的文字裁圖' : ' 的圈選裁圖'));
            const x = Math.max(0, crop.x + box.x - 5);
            const y = Math.max(0, crop.y + box.y - 5);
            tile.width = Math.min(source.width - x, box.width + 10);
            tile.height = Math.min(source.height - y, box.height + 10);
            tile.getContext('2d').drawImage(source, x, y, tile.width, tile.height, 0, 0, tile.width, tile.height);
            aside.append(tile);
            if (photos.length > 1) aside.append(element('small', '照片 ' + photo.number));
        }
        const body = element('div');
        const label = gap ? '第 ' + gapNumber + ' 號' : '候選 ' + number;
        const numberInput = labeledInput(body, '老師編號', { type: 'text', inputmode: 'numeric', maxlength: '2',
            autocomplete: 'off', 'aria-label': label + ' 老師編號' });
        numberInput.className = 'photo-teacher-number';
        numberInput.parentElement.hidden = gap || text;
        if (gap) {
            numberInput.readOnly = true;
            numberInput.value = String(gapNumber);
        }
        const numberNote = element('p');
        numberNote.className = 'notice photo-number-note';
        numberNote.id = 'photo-number-note-' + number;
        numberInput.setAttribute('aria-describedby', numberNote.id);
        body.append(numberNote);
        const selectLabel = element('label');
        selectLabel.className = 'check';
        const selected = element('input');
        selected.type = 'checkbox';
        selected.setAttribute('aria-label', '勾選' + label + ' 加入詞庫');
        selectLabel.append(selected, '加入詞庫');
        body.append(selectLabel);
        const word = labeledInput(body, '詞語', { type: 'text', maxlength: '20', autocomplete: 'off', 'aria-label': label + ' 詞語' });
        const pronunciation = labeledInput(body, '逐字注音', { type: 'text', maxlength: '90', autocomplete: 'off',
            placeholder: '例如 ㄊㄧㄢ ㄎㄨㄥ', 'aria-label': label + ' 逐字注音' });
        const blanks = element('fieldset');
        blanks.setAttribute('aria-label', label + ' 挖空字');
        body.append(blanks);
        const note = element('p', box ? '等待辨識' : '');
        note.className = 'notice';
        note.id = 'photo-candidate-note-' + number;
        pronunciation.setAttribute('aria-describedby', note.id);
        body.append(note);
        row.append(aside, body);
        const card = { number, row, title, box, gap, text, numberInput, numberNote, teacherNumber: gapNumber, inferred: false,
            selected, word, pronunciation, blanks, note, readingRevision: 0,
            manualReading: false, manualWord: false, readingWord: '', recognized: false };
        if (box && !text) {
            const button = element('button', '補進紅色手寫字');
            button.type = 'button';
            button.className = 'photo-add-handwriting';
            button.disabled = scanning;
            button.addEventListener('click', () => {
                preview.value = String(photos.indexOf(photo));
                handwritingTarget.textContent = `要補進「${card.word.value.trim() || card.title.textContent}」。請框住要加入的一個紅色國字。`;
                handwritingPosition.value = 'after';
                setHandwritingMode(card);
                cropFrame.scrollIntoView({ block: 'center' });
                setNotice(status, '');
            });
            card.addHandwriting = button;
            body.append(button);
        }
        cards.push(card);
        list.append(row);
        fillBlanks(card);
        selected.addEventListener('change', refreshButtons);
        word.addEventListener('input', () => {
            card.manualWord = true;
            card.uncertain = false;
            fillBlanks(card);
            updateReading(card);
            if (card.gap) refreshGapStatus();
            if (card.text) refreshButtons();
        });
        pronunciation.addEventListener('input', () => {
            card.manualReading = true;
            card.readingWord = card.word.value.trim();
            setNotice(card.note, '');
            if (card.gap) refreshGapStatus();
            if (card.text) refreshButtons();
        });
        numberInput.addEventListener('input', () => {
            card.teacherNumber = parseTeacherNumber(numberInput.value);
            card.inferred = false;
            describeOrder();
        });
        return card;
    }

    function numberRange() {
        const first = firstNumber.value.trim();
        const last = lastNumber.value.trim();
        const start = parseTeacherNumber(first);
        const end = parseTeacherNumber(last);
        if (!first && !last) return { start, end };
        if (start === null || end === null) {
            return { invalid: start === null ? firstNumber : lastNumber, message: '請填寫起始和最後編號，兩欄都須是 1 到 99 的整數。' };
        }
        if (start > end) {
            return { invalid: lastNumber, message: '最後編號須大於或等於起始編號。' };
        }
        return { start, end };
    }

    function showRangeError(message) {
        setNotice(rangeError, message, Boolean(message));
        rangeError.hidden = !message;
    }

    function syncGapCards({ start, end, invalid }) {
        if (invalid) return false;
        const detected = new Set(cards.filter(card => !card.gap).map(card => card.teacherNumber));
        let changed = false;
        cards = cards.filter(card => {
            if (!card.gap || card.word.value.trim() || card.pronunciation.value.trim() || card.selected.checked) return true;
            const number = card.teacherNumber;
            if (start !== null && number >= start && number <= end && !detected.has(number)) return true;
            card.row.remove();
            changed = true;
            return false;
        });
        const present = new Set(cards.map(card => card.teacherNumber));
        for (let number = start; number !== null && number <= end; number++) {
            if (!present.has(number)) {
                addCard(null, null, null, number);
                changed = true;
            }
        }
        return changed;
    }

    function renderMissingNotice({ start, end, invalid }) {
        if (invalid) {
            setNotice(missingNotice, '請修正上方的老師編號範圍。', true);
            return;
        }
        if (start === null) {
            setNotice(missingNotice, '在上方填入老師的起始與最後編號，即可檢查缺號。');
            return;
        }
        const missing = cards.filter(card => card.gap && !gapFilled(card) &&
            card.teacherNumber >= start && card.teacherNumber <= end).length;
        const range = `第 ${start}～${end} 號`;
        setNotice(missingNotice, missing
            ? `${range}還有 ${missing} 筆待補。可直接在清單填寫，全選會略過未填完的補填列。`
            : `${range}沒有待補的缺號。`);
    }

    function refreshGapStatus() {
        renderMissingNotice(numberRange());
        refreshButtons();
    }

    function describeOrder(reorder = false) {
        const range = numberRange();
        const gapsChanged = !review.hidden && syncGapCards(range);
        const { sorted, duplicates } = orderPhotoCards(cards);
        let needsReview = 0;
        let numbered = 0;
        for (const card of cards) {
            const number = card.teacherNumber;
            const duplicate = duplicates.has(number);
            if (number !== null && !duplicate) numbered++;
            const message = duplicate ? '編號重複，請核對。' : card.inferred ? '依前後編號推估，請核對。'
                : number === null && card.numberInput.value ? '請填 1 到 99 的整數。'
                : number === null && card.box ? '未辨識到編號，可手動補填。' : '';
            if (message) needsReview++;
            card.title.textContent = number === null ? (card.box ? '候選 ' + card.number : '手動新增') : '第 ' + number + ' 號';
            setNotice(card.numberNote, message);
        }
        if (reorder || gapsChanged) {
            const active = document.activeElement;
            const wasEditing = active instanceof HTMLInputElement && list.contains(active);
            let next = null;
            for (const { row } of sorted.slice().reverse()) {
                if (row.nextElementSibling !== next) list.insertBefore(row, next);
                next = row;
            }
            if (wasEditing && active.isConnected && document.activeElement !== active) active.focus({ preventScroll: true });
        }
        const messages = [];
        if (numbered) messages.push(reorder || gapsChanged ? '已按老師編號排序。' : '修改編號後，可再按「依編號排序」。');
        if (needsReview) messages.push(`有 ${needsReview} 筆編號需要核對。`);
        setNotice(orderNotice, messages.join(''));
        renderMissingNotice(range);
        refreshButtons();
    }

    function scanOnePhoto(photo, label, handwritingRange = null) {
        return new Promise(resolve => {
            const photoCards = [];
            let textDiagnostics;
            let crop;
            let downloadingModel = false;
            let timer;
            function watch(timeout) {
                clearTimeout(timer);
                timer = setTimeout(() => finish('failed'), timeout);
            }
            watch(240_000);
            function finish(result) {
                clearTimeout(timer);
                if (worker) {
                    worker.onmessage = worker.onerror = null;
                    if (result === 'failed' || result === 'cancelled') {
                        worker.terminate();
                        worker = null;
                    }
                }
                if (result === 'failed') {
                    for (const card of photoCards) {
                        if (!card.word.value) setNotice(card.note, '可依裁圖手動填寫。');
                    }
                }
                cancelScan = undefined;
                if (result === 'failed' && textDiagnostics) {
                    resolve({ ...textDiagnostics, reason: downloadingModel ? 'download-failed' : 'failed', candidates: [], photo, crop });
                    return;
                }
                resolve(result === 'failed' && downloadingModel ? 'download-failed' : result);
            }
            cancelScan = () => finish('cancelled');
            try {
                const source = photo.canvas;
                const range = handwritingRange ?? photo.edges;
                crop = cropPixels(source.width, source.height, range);
                const image = source.getContext('2d').getImageData(crop.x, crop.y, crop.width, crop.height);
                worker ??= new Worker(new URL('./photoOcrWorker.mjs', import.meta.url), { type: 'module' });
                worker.onerror = () => finish('failed');
                worker.onmessage = ({ data }) => {
                    if (data.status === 'model-download') {
                        downloadingModel = true;
                        // Limit time without incoming bytes rather than total download time.
                        watch(90_000);
                        const megabytes = (data.bytes / 1_000_000).toFixed(1);
                        setNotice(status, `${label}正在下載辨識模型，已下載 ${megabytes} MB（約 28 MB）。`);
                    } else if (data.status === 'model-initializing') {
                        downloadingModel = false;
                        watch(240_000);
                        setNotice(status, label + '模型已下載，正在準備辨識…');
                    } else if (data.status === 'handwriting') {
                        finish({ word: data.word });
                    } else if (data.status === 'text-regions') {
                        textDiagnostics = data;
                        if (data.regionCount) setNotice(status, label + '正在辨識照片文字，首次使用需下載模型…');
                    } else if (data.status === 'text-done') {
                        finish({ ...textDiagnostics, ...data, photo, crop });
                    } else if (data.status === 'circles') {
                        for (const box of data.boxes) photoCards.push(addCard(box, crop, photo));
                        void loadReadingDictionary();
                        setNotice(status, `${label}找到 ${photoCards.length} 個候選。正在辨識文字，首次下載約 28 MB…`);
                    } else if (data.status === 'word') {
                        const card = photoCards[data.index];
                        if (!card || card.manualWord) return;
                        card.uncertain = data.uncertain;
                        if (isPhotoWord(data.word)) {
                            card.recognized = true;
                            card.word.value = data.word;
                            fillBlanks(card);
                        }
                        updateReading(card);
                    } else if (data.status === 'done') {
                        for (const [index, mark] of Object.entries(data.numbering ?? {})) {
                            const card = photoCards[index];
                            card.teacherNumber = mark.number;
                            card.inferred = mark.inferred;
                            card.numberInput.value = String(mark.number);
                        }
                        for (const [index, mark] of Object.entries(data.handwriting ?? {})) {
                            const card = photoCards[index];
                            if (card) applyHandwritingSuggestion(card, mark, crop, photo);
                        }
                        finish('done');
                    } else if (data.status === 'failed') {
                        finish('failed');
                    }
                };
                worker.postMessage({ image, scale: Math.max(source.width, source.height) / 1280,
                    direction: mode.value === 'text' ? direction.value : 'auto',
                    mode: handwritingRange ? 'handwriting' : mode.value }, [image.data.buffer]);
            } catch {
                finish('failed');
            }
        });
    }

    async function scanPhotos() {
        if (scan.disabled) return;
        const textMode = mode.value === 'text';
        const range = numberRange();
        if (!textMode && rangeEdited && range.invalid) {
            showRangeError(range.message);
            range.invalid.focus();
            return;
        }
        if (!textMode) clearReview();
        selectingText = false;
        updateMode();
        const version = scanVersion;
        const issues = [];
        const textResults = [];
        const fallbacks = [];
        scanning = true;
        refreshButtons();
        for (const photo of photos) {
            const label = photos.length > 1 ? `照片 ${photo.number}：` : '';
            setNotice(status, label + (textMode ? '正在找文字範圍…' : '正在找圈選範圍…'));
            const result = await scanOnePhoto(photo, label);
            if (version !== scanVersion) return;
            if (result === 'failed') issues.push(label + '辨識未完成。');
            if (result === 'download-failed') issues.push(label + '模型下載未完成。請檢查網路後用這張照片重試。');
            if (typeof result === 'object') textResults.push({ ...result, label });
        }
        scanning = false;
        review.hidden = false;
        const circleCards = textMode ? [] : cards.filter(card => !card.text && card.box);
        const circles = circleCards.length;
        const recognized = circleCards.filter(card => card.recognized).length;
        if (!textMode && !rangeEdited) {
            const numbers = cards.map(card => card.teacherNumber).filter(number => number !== null);
            firstNumber.value = numbers.length ? String(Math.min(...numbers)) : '';
            lastNumber.value = numbers.length ? String(Math.max(...numbers)) : '';
        }
        let textCount = 0;
        diagnosticList.replaceChildren();
        if (circles) {
            diagnosticList.append(element('li', `找到 ${circles} 個紅圈，讀出 ${recognized} 筆圈詞。${circles === recognized ? '' : '其餘圈詞可依裁圖補填。'}`));
        }
        if (textResults.length) {
            const reasons = {
                'no-regions': '找不到清楚的文字區塊。請縮小框選範圍或手動新增。',
                'no-han': '有文字區塊，但沒有讀出可用的國字。請重新框選或手動新增。',
                'download-failed': '模型下載未完成。請檢查網路後用這張照片重試。',
                failed: '文字辨識未完成。可用這張照片重試。'
            };
            for (const result of textResults) {
                const { photo, crop, candidates, reason, label, circleCount, regionCount } = result;
                textCount += candidates.length;
                if (reason === 'recognized') {
                    const cropKey = [crop.x, crop.y, crop.width, crop.height].join(',');
                    cards = cards.filter(card => {
                        if (!card.text || card.photo !== photo || card.manualWord || card.manualReading ||
                            card.selected.checked || card.blanks.querySelector('input:not(:checked)')) return true;
                        card.row.remove();
                        return false;
                    });
                    for (const candidate of candidates) {
                        if (cards.some(card => card.text && card.photo === photo &&
                            card.sourceWord === candidate.word && card.cropKey === cropKey &&
                            card.box.x === candidate.box.x && card.box.y === candidate.box.y)) continue;
                        const card = addCard(candidate.box, crop, photo, null, true);
                        card.photo = photo;
                        card.cropKey = cropKey;
                        card.sourceWord = card.word.value = candidate.word;
                        card.uncertain = candidate.incomplete;
                        fillBlanks(card);
                        updateReading(card);
                    }
                }
                const circlesFound = circleCount === null ? '圈選偵測已略過' : `找到 ${circleCount} 個紅圈`;
                if (circleCount === 0) fallbacks.push(label + '已改用一般文字辨識。');
                diagnosticList.append(element('li', `${label}${circlesFound}，找到 ${regionCount} 個文字區塊，產生 ${candidates.length} 筆候選。${reasons[reason] ?? ''}`));
                if (reasons[reason]) issues.push(label + reasons[reason]);
            }
            if (!circles && !textMode) {
                mode.value = 'text';
                updateMode();
            }
        }
        diagnostics.hidden = !diagnosticList.childElementCount;
        if (mode.value === 'circles') describeOrder(true);
        else refreshButtons();
        const summary = circles ? `找到 ${circles} 個圈，已帶入 ${recognized} 個詞語。請對照裁圖核對。` : '';
        const textSummary = textCount ? `已帶入 ${textCount} 筆一般文字候選。請核對詞語和注音。` : '';
        if (!textResults.length && issues.length) issues.push('可調整裁切重試，或手動新增詞語。');
        setNotice(status, [summary, ...fallbacks, textSummary, ...issues].filter(Boolean).join(' '), issues.length > 0);
    }

    function closeHandwriting() {
        const card = handwritingCard;
        setHandwritingMode(null);
        return card;
    }

    async function scanRedCharacter() {
        if (scanHandwriting.disabled) return;
        const range = handwritingEdges;
        if (range.right - range.left > 55 || range.bottom - range.top > 65) {
            setNotice(status, '請把框縮到要補進的一個紅色國字。', true);
            return;
        }
        const card = handwritingCard;
        const position = handwritingPosition.value;
        const version = scanVersion;
        scanning = true;
        refreshButtons();
        setNotice(status, '正在辨識框內的紅色手寫字…');
        const result = await scanOnePhoto(photos[Number(preview.value)], '', range);
        if (version !== scanVersion) return;
        scanning = false;
        refreshButtons();
        if (!result?.word) {
            setNotice(status, '這個框沒有辨識出清楚的紅色國字。請縮小範圍重試，或回到詞語欄手動補字。', true);
            return;
        }
        const original = card.word.value.trim();
        const prefix = position === 'before';
        const combined = prefix ? result.word + original : original + result.word;
        if (!isPhotoWord(combined)) {
            setNotice(status, '請回到詞語欄核對，合併後須為 1 到 10 個國字。', true);
            return;
        }
        const previousBlanks = [...card.blanks.querySelectorAll('input:checked')].map(input => Number(input.value));
        const newPosition = prefix ? 1 : [...combined].length;
        card.word.value = combined;
        card.word.dispatchEvent(new Event('input'));
        for (const input of card.blanks.querySelectorAll('input')) {
            const index = Number(input.value);
            input.checked = index === newPosition || previousBlanks.includes(prefix ? index - 1 : index);
        }
        closeHandwriting();
        setNotice(status, `已補進「${result.word}」，詞語為「${combined}」。請核對詞語和注音。`);
        card.word.focus();
    }

    camera.addEventListener('change', () => {
        const file = camera.files[0];
        camera.value = '';
        if (file) void openPhotos([file], true);
    });
    photoFile.addEventListener('change', () => {
        const files = Array.from(photoFile.files);
        photoFile.value = '';
        void openPhotos(files);
    });
    clear.addEventListener('click', () => {
        reset();
        camera.focus();
    });
    preview.addEventListener('change', showPreview);
    edges.addEventListener('input', changeCrop);
    mode.addEventListener('change', () => {
        selectingText = false;
        cropDrag = null;
        updateMode();
        showPreview();
        setNotice(status, '');
    });
    drawText.addEventListener('click', () => {
        selectingText = !selectingText;
        updateMode();
        if (selectingText) cropFrame.scrollIntoView({ block: 'nearest' });
    });
    cropFrame.addEventListener('pointerdown', event => {
        if ((!handwritingCard && !selectingText) || scanning || saving || !event.isPrimary || event.button !== 0) return;
        cropDrag = { id: event.pointerId, start: previewPoint(event) };
        cropFrame.setPointerCapture(event.pointerId);
    });
    cropFrame.addEventListener('pointermove', event => {
        if (cropDrag?.id === event.pointerId) drawCropBox(event);
    });
    cropFrame.addEventListener('pointerup', event => {
        if (cropDrag?.id !== event.pointerId) return;
        const range = drawCropBox(event);
        cropDrag = null;
        if (!range) return;
        if (handwritingCard) handwritingEdges = range;
        else {
            photos[Number(preview.value)].edges = range;
            selectingText = false;
            updateMode();
        }
    });
    cropFrame.addEventListener('lostpointercapture', () => {
        if (cropDrag) showPreview();
        cropDrag = null;
    });
    resetCrop.addEventListener('click', () => {
        for (const input of sliders) input.value = input.defaultValue;
        updateCrop();
    });
    scan.addEventListener('click', scanPhotos);
    clearResults.addEventListener('click', () => {
        clearReview();
        setNotice(status, '');
        scan.focus();
    });
    scanHandwriting.addEventListener('click', scanRedCharacter);
    cancelHandwriting.addEventListener('click', () => {
        if (scanning) {
            scanVersion++;
            cancelScan?.();
            scanning = false;
        }
        const card = closeHandwriting();
        setNotice(status, '');
        card?.word.focus();
    });
    add.addEventListener('click', () => {
        const card = addCard();
        refreshButtons();
        card.word.focus();
    });
    sort.addEventListener('click', () => describeOrder(true));
    for (const rangeInput of [firstNumber, lastNumber]) {
        rangeInput.addEventListener('input', () => {
            rangeEdited = Boolean(firstNumber.value.trim() || lastNumber.value.trim());
            showRangeError(numberRange().message ?? '');
            if (!review.hidden) describeOrder();
        });
    }
    selectAll.addEventListener('change', () => {
        for (const card of cards) card.selected.checked = selectAll.checked && (!(card.gap || card.text) || gapFilled(card));
        refreshButtons();
    });
    review.addEventListener('submit', async event => {
        event.preventDefault();
        if (save.disabled) return;
        const book = currentBook();
        const selected = orderPhotoCards(cards).sorted.filter(card => card.selected.checked);
        if (!book || !selected.length) return;
        let entries;
        try {
            entries = selected.map(card => {
                try {
                    return makeWord({ id: crypto.randomUUID(), bookId: book.id, lesson: review.elements.lesson.value,
                        word: card.word.value, pronunciation: card.pronunciation.value, confirmed: true,
                        blanks: [...card.blanks.querySelectorAll('input:checked')].map(input => Number(input.value)) });
                } catch (error) {
                    card.word.focus();
                    const label = card.teacherNumber === null ? `候選 ${card.number}` : `第 ${card.teacherNumber} 號`;
                    throw new Error(`${label}　${error.message}`);
                }
            });
        } catch (error) {
            setNotice(saveStatus, error.message, true);
            return;
        }
        saving = true;
        refreshButtons();
        try {
            const saved = await persist(state => {
                for (const entry of entries) saveWord(state, entry);
            });
            if (!saved) return;
            reset();
            setNotice(status, `已${cloud ? '同步' : '加入'} ${entries.length} 個詞語到「${book.name}」。`);
        } finally {
            saving = false;
            refreshButtons();
        }
    });
    updateMode();
    refreshButtons();
    return { reset };
}
