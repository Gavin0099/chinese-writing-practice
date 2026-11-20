import { findCircledWords, findGlyphColumn, findTextRegions, glyphRows, isolateTextInk, redInkCrop, removeCircleInk } from './photoOcrGeometry.mjs';
import { cleanRecognizedWord } from './photoOcrText.mjs';
import { groupNumberPatches, inkComponents, matchPhotoNumbers, numberDistance, numberPatchBounds, numberPatches } from './photoOcrNumbers.mjs';

const assets = new URL('./photo-ocr-assets/', import.meta.url);
let recognizer;

async function loadRecognizer() {
    const received = new Map();
    let lastUpdate = 0;
    function showProgress() {
        const now = performance.now();
        if (now - lastUpdate < 1000) return;
        lastUpdate = now;
        const bytes = [...received.values()].reduce((sum, count) => sum + count, 0);
        self.postMessage({ status: 'model-download', bytes });
    }
    self.postMessage({ status: 'model-download', bytes: 0 });
    const ort = await import(new URL('ort.wasm.min.mjs', assets));
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmPaths = assets.href;
    async function loadBinary(name) {
        const response = await fetch(new URL(name, assets));
        if (!response.ok) throw new Error('無法下載辨識模型。');
        if (!response.body) return response.arrayBuffer();
        const reader = response.body.getReader();
        const chunks = [];
        let bytes = 0;
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            chunks.push(value);
            bytes += value.byteLength;
            received.set(name, bytes);
            showProgress();
        }
        const buffer = new Uint8Array(bytes);
        let offset = 0;
        for (const chunk of chunks) {
            buffer.set(chunk, offset);
            offset += chunk.byteLength;
        }
        return buffer.buffer;
    }
    async function loadCharacters() {
        const response = await fetch(new URL('ppocr-v5-characters.json', assets));
        if (!response.ok) throw new Error('無法下載辨識字表。');
        return response.json();
    }
    const [buffer, characters, wasm] = await Promise.all([
        loadBinary('ppocr-v5-rec-mobile.onnx'),
        loadCharacters(),
        loadBinary('ort-wasm-simd-threaded.wasm')
    ]);
    self.postMessage({ status: 'model-initializing' });
    ort.env.wasm.wasmBinary = wasm;
    const session = await ort.InferenceSession.create(buffer, { executionProviders: ['wasm'] });
    return { ort, session, alphabet: ['', ...characters, ' '] };
}

function prepare(source, circle, scale, blueOnly = false) {
    const { width: sourceWidth, data } = source;
    const { x, y, height, projection } = circle;
    const { left, width } = findGlyphColumn(projection, scale);
    const pixels = new Uint8Array(width * height * 3);
    const counts = new Uint16Array(height);
    const inside = blueOnly ? new Set(circle.interior) : null;
    for (let row = 0; row < height; row++) {
        for (let column = 0; column < width; column++) {
            const start = 4 * ((y + row) * sourceWidth + x + left + column);
            const dest = 3 * (row * width + column);
            const red = data[start];
            const green = data[start + 1];
            const blue = data[start + 2];
            const isBlue = Math.min(blue - red, green - red) > 18;
            const within = !inside || inside.has(start / 4);
            if (isBlue && within) counts[row]++;
            const skip = red - green > 32 || (inside && (!isBlue || !within));
            pixels[dest] = skip ? 255 : red;
            pixels[dest + 1] = skip ? 255 : green;
            pixels[dest + 2] = skip ? 255 : blue;
        }
    }
    const rows = glyphRows(counts, scale);
    const glyphHeight = Math.max(24, Math.round(36 * scale));
    const stripWidth = 16 + rows.length * (width + 8);
    const stripHeight = glyphHeight + 8;
    const strip = new Uint8Array(stripWidth * stripHeight * 3).fill(255);
    for (const [index, [from, to]] of rows.entries()) {
        const start = Math.max(0, from - 2);
        const length = Math.min(height, to + 2) - start;
        const fitted = Math.min(glyphHeight, length);
        const left = 11 + index * (width + 8);
        const top = 4 + Math.floor((glyphHeight - fitted) / 2);
        for (let row = 0; row < fitted; row++) {
            const sourceOffset = 3 * width * (start + Math.floor(row * length / fitted));
            const targetOffset = 3 * ((top + row) * stripWidth + left);
            strip.set(pixels.subarray(sourceOffset, sourceOffset + 3 * width), targetOffset);
        }
    }
    return { pixels: strip, width: stripWidth, height: stripHeight, glyphCount: rows.length };
}

function toTensor(strip, Tensor) {
    const height = 48;
    const fitted = Math.ceil(height * strip.width / strip.height);
    const width = Math.max(320, fitted);
    const area = height * width;
    const channels = new Float32Array(3 * area);
    for (let y = 0; y < height; y++) {
        const sy = Math.max(0, (y + .5) * strip.height / height - .5);
        const top = Math.floor(sy);
        const bottom = Math.min(top + 1, strip.height - 1);
        const fy = sy - top;
        for (let x = 0; x < fitted; x++) {
            const sx = Math.max(0, (x + .5) * strip.width / fitted - .5);
            const left = Math.floor(sx);
            const right = Math.min(left + 1, strip.width - 1);
            const fx = sx - left;
            const index = y * width + x;
            for (let channel = 0; channel < 3; channel++) {
                const pixel = 2 - channel;
                const nw = strip.pixels[3 * (top * strip.width + left) + pixel];
                const ne = strip.pixels[3 * (top * strip.width + right) + pixel];
                const sw = strip.pixels[3 * (bottom * strip.width + left) + pixel];
                const se = strip.pixels[3 * (bottom * strip.width + right) + pixel];
                const value = (nw * (1 - fx) + ne * fx) * (1 - fy) + (sw * (1 - fx) + se * fx) * fy;
                channels[channel * area + index] = value / 127.5 - 1;
            }
        }
    }
    return new Tensor('float32', channels, [1, 3, height, width]);
}

function decode(output, alphabet) {
    const classes = output.dims[2];
    if (classes !== alphabet.length) throw new Error('辨識模型字表不相符。');
    let text = '';
    let previous = 0;
    const scores = [];
    for (let offset = 0; offset < output.data.length; offset += classes) {
        let index = 0;
        for (let candidate = 1; candidate < classes; candidate++) {
            if (output.data[offset + candidate] > output.data[offset + index]) index = candidate;
        }
        if (index && index !== previous) {
            text += alphabet[index];
            scores.push(output.data[offset + index]);
        }
        previous = index;
    }
    return { text: text.trim(), confidence: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0 };
}

function prepareInk(group, box, sourceWidth, padX = 6, padY = 4, horizontalScale = 1) {
    const inkWidth = box.right - box.x;
    const inkHeight = box.bottom - box.y;
    const mask = new Uint8Array(inkWidth * inkHeight);
    for (const part of group) {
        for (const point of part.points) {
            const x = point % sourceWidth;
            const y = (point - x) / sourceWidth;
            mask[(y - box.y) * inkWidth + x - box.x] = 1;
        }
    }
    const scaledWidth = Math.max(1, Math.round(inkWidth * horizontalScale));
    const width = scaledWidth + padX * 2;
    const height = inkHeight + padY * 2;
    const pixels = new Uint8Array(width * height * 3).fill(255);
    for (let y = 0; y < inkHeight; y++) {
        for (let x = 0; x < scaledWidth; x++) {
            if (mask[y * inkWidth + Math.floor(x * inkWidth / scaledWidth)]) {
                const offset = ((y + padY) * width + x + padX) * 3;
                pixels.fill(0, offset, offset + 3);
            }
        }
    }
    return { pixels, width, height };
}

async function recognizeNumbers(image, circles, ink, scale, recognize) {
    removeCircleInk(ink, image, circles, scale);
    const parts = numberPatches(ink, image.width, image.height, scale);
    const marks = [];
    const groups = groupNumberPatches(parts, scale).flatMap(group => {
        const box = numberPatchBounds(group);
        const distance = Math.min(...circles.map(circle => numberDistance(circle, box, scale)));
        return Number.isFinite(distance) ? [{ group, box, distance }] : [];
    });
    groups.sort((a, b) => a.distance - b.distance);
    for (const { group, box } of groups.slice(0, 100)) {
        // Plain upright strokes often come back as I, l, or blank in the model.
        const ones = group.every(({ w, h }) => w / h < .36);
        const { text, confidence } = ones ? { text: '1'.repeat(group.length), confidence: .77 }
            : await recognize(prepareInk(group, box, image.width));
        const digits = text.normalize('NFKC').replace(/\s+/gu, '').replace(/^[Il](?=[0-9]$)/u, '1');
        if (/^[1-9][0-9]?$/u.test(digits)) marks.push({ ...box, group, number: Number(digits), confidence });
    }
    return matchPhotoNumbers(circles, marks, scale);
}

async function getRecognizer() {
    if (!recognizer) recognizer = loadRecognizer().catch(error => { recognizer = null; throw error; });
    const { ort, session, alphabet } = await recognizer;
    return async strip => {
        const tensor = toTensor(strip, ort.Tensor);
        const outputs = await session.run({ [session.inputNames[0]]: tensor });
        return decode(outputs[session.outputNames[0]], alphabet);
    };
}

async function recognizePrintedWord(image, circle, scale, recognize) {
    const primary = prepare(image, circle, scale);
    const clean = prepare(image, circle, scale, true);
    const expected = clean.glyphCount;
    async function read(strip) {
        const { text, confidence } = await recognize(strip);
        const word = cleanRecognizedWord(text);
        return { word: [...word].length === expected ? word : '', confidence };
    }

    const first = await read(primary);
    // Check short results against the isolated ink before treating them as reliable.
    if (first.word && first.confidence >= .85 && primary.glyphCount === expected && expected > 1) {
        return { word: first.word, uncertain: false };
    }
    const isolated = await read(clean);
    if (first.word && first.word === isolated.word) return { word: first.word, uncertain: false };

    const circleScale = circle.width / 62;
    const retryScale = Math.abs(circleScale - scale) > scale * .12 ? circleScale : scale * 1.2;
    const retry = await read(prepare(image, circle, Math.max(.45, Math.min(2.4, retryScale)), true));
    if (retry.word && (retry.word === isolated.word || retry.word === first.word)) {
        return { word: retry.word, uncertain: false };
    }
    const best = [isolated, retry, first].filter(reading => reading.word)
        .sort((a, b) => b.confidence - a.confidence)[0];
    return { word: best?.confidence >= .72 ? best.word : '', uncertain: true };
}

async function recognizeHandwriting(image) {
    const ink = redInkCrop(image);
    if (!ink || ink.width < 9 || ink.height < 9) return '';
    const recognize = await getRecognizer();
    const readings = new Set();
    for (const paddingRatio of [.05, .12, .18]) {
        const pad = Math.max(4, Math.round(Math.max(ink.width, ink.height) * paddingRatio));
        const width = ink.width + pad * 2, height = ink.height + pad * 2;
        const pixels = new Uint8Array(width * height * 3).fill(255);
        for (let y = 0; y < ink.height; y++) {
            for (let x = 0; x < ink.width; x++) {
                if (!ink.mask[(ink.top + y) * image.width + ink.left + x]) continue;
                const offset = 3 * ((y + pad) * width + x + pad);
                pixels.fill(0, offset, offset + 3);
            }
        }
        const { text, confidence } = await recognize({ pixels, width, height });
        if (!/^\p{Script=Han}$/u.test(text) || confidence < .82) continue;
        readings.add(cleanRecognizedWord(text));
    }
    return readings.size === 1 ? readings.keys().next().value : '';
}

function nearbyCircle(box, circle, scale) {
    const width = box.right - box.x;
    const height = box.bottom - box.y;
    const horizontal = Math.abs(box.x + width * .42 - circle.x - circle.width * .4) / scale;
    const below = box.y - (circle.y + circle.height);
    const above = circle.y - box.bottom;
    const before = above > below;
    const gap = (before ? above : below) / scale;
    if (horizontal > 91 || gap < -16 || gap > 60 ||
        (before && box.y + height / 2 >= circle.y) || (!before && box.bottom <= circle.y + circle.height)) return null;
    return { before, distance: horizontal * .8 + Math.abs(gap) + (before ? 11 : 0) };
}

async function readRedGroup(group, box, sourceWidth, recognize) {
    const size = Math.max(box.right - box.x, box.bottom - box.y);
    const votes = new Map();
    let numeric = 0;
    for (const [padding, widthScale] of [[.06, 1], [.15, 1], [.09, .78]]) {
        const pad = Math.max(4, Math.round(size * padding));
        const { text, confidence } = await recognize(prepareInk(group, box, sourceWidth, pad, pad, widthScale));
        if (/^\d{1,2}$/u.test(text.normalize('NFKC')) && confidence >= .55) numeric++;
        if (!/^\p{Script=Han}$/u.test(text) || confidence < .78) continue;
        const word = cleanRecognizedWord(text);
        votes.set(word, (votes.get(word) ?? 0) + 1);
    }
    const [word, votesForWord] = votes.size === 1 ? votes.entries().next().value : ['', 0];
    return { word, reliable: votesForWord >= 2, numeric: numeric > 0 && !votes.size };
}

async function matchHandwriting(image, circles, ink, scale, recognize) {
    removeCircleInk(ink, image, circles, scale, 5);
    const parts = inkComponents(ink, image.width, image.height, (w, h, area) =>
        w >= 5 * scale && w <= 170 * scale && h >= 7 * scale && h <= 116 * scale && area >= 35 * scale ** 2);
    const big = part => part.w >= 32 * scale && part.h >= 38 * scale && part.points.length >= 350 * scale ** 2;
    const groups = [];
    const majors = parts.filter(big);
    for (const [i, part] of majors.entries()) {
        for (const right of majors.slice(i + 1)) {
            if (right.x - part.right > 9 * scale) break;
            const overlap = Math.min(part.bottom, right.bottom) - Math.max(part.y, right.y);
            const box = numberPatchBounds([part, right]);
            const maxHeight = Math.max(part.h, right.h);
            if (Math.min(part.h, right.h) < maxHeight * .63 ||
                overlap < maxHeight * .62 || part.right - right.x > Math.min(part.w, right.w) * .35 ||
                (box.right - box.x) / (box.bottom - box.y) > 1.65) continue;
            groups.push([part, right]);
        }
    }
    for (const part of majors) {
        const nearby = parts.filter(dot => dot !== part && !big(dot) &&
            dot.x >= part.x && dot.right <= part.right + 19 * scale &&
            dot.y >= part.y && dot.bottom <= part.bottom + 3 * scale &&
            dot.points.length < part.points.length * .22);
        groups.push(nearby.length ? [part, ...nearby] : [part]);
        if (nearby.length) groups.push([part]);
    }
    const candidates = groups.flatMap(group => {
        const box = numberPatchBounds(group);
        const matches = circles.flatMap((circle, index) => {
            const match = nearbyCircle(box, circle, scale);
            return match ? [{ ...match, index }] : [];
        }).sort((a, b) => a.distance - b.distance);
        return matches.length ? [{ group, box, matches }] : [];
    });
    // Test whole characters before isolated radicals, and limit work per photo.
    const reliableParts = new Set();
    const uncertain = [];
    const byCircle = new Map();
    for (const { group, box, matches } of candidates.slice(0, 48)) {
        if (group.some(part => reliableParts.has(part))) continue;
        const { word, reliable, numeric } = await readRedGroup(group, box, image.width, recognize);
        if (numeric) continue;
        const [nearest, second] = matches;
        const confident = reliable && !nearest.before && (!second || second.distance - nearest.distance >= 15);
        const mark = { ...box, word, before: nearest.before, confident };
        if (confident) {
            for (const part of group) reliableParts.add(part);
            const choices = byCircle.get(nearest.index) ?? [];
            choices.push(mark);
            byCircle.set(nearest.index, choices);
        } else if (reliable || nearest.distance <= 66) {
            uncertain.push({ index: nearest.index, group, mark });
        }
    }
    for (const { index, group, mark } of uncertain) {
        if (!byCircle.has(index) && !group.some(part => reliableParts.has(part))) byCircle.set(index, [mark]);
    }
    return Object.fromEntries([...byCircle].map(([index, choices]) => [
        index, { ...choices[0], confident: choices.length === 1 && choices[0].confident }
    ]));
}

function textStrip({ normalized, width, height }, box, strengthen) {
    const margin = Math.max(4, Math.round(Math.min(box.width, box.height) * .16));
    const left = Math.max(0, box.x - margin), top = Math.max(0, box.y - margin);
    const right = Math.min(width, box.x + box.width + margin), bottom = Math.min(height, box.y + box.height + margin);
    const stripWidth = right - left + 8, stripHeight = bottom - top + 8;
    const pixels = new Uint8Array(stripWidth * stripHeight * 3).fill(255);
    const radius = Math.max(1, Math.min(3, Math.round(Math.min(box.width, box.height) / 75)));
    for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
            let tone = normalized[y * width + x];
            if (strengthen) {
                for (let dy = -radius; dy <= radius; dy++) {
                    const row = Math.max(top, Math.min(bottom - 1, y + dy));
                    for (let dx = -radius; dx <= radius; dx++) {
                        const col = Math.max(left, Math.min(right - 1, x + dx));
                        tone = Math.min(tone, normalized[row * width + col]);
                    }
                }
            }
            const offset = 3 * ((y - top + 4) * stripWidth + x - left + 4);
            pixels.fill(tone, offset, offset + 3);
        }
    }
    return { pixels, width: stripWidth, height: stripHeight };
}

async function readTextRegions(ink, regions, recognize, vertical) {
    const candidates = [];
    for (const { box, glyphs } of regions) {
        let word = '';
        let missed = 0;
        for (const glyph of glyphs.slice(0, 10)) {
            if (glyph.width > glyph.height * 25) {
                missed++;
                continue;
            }
            const read = async strengthen => {
                const { text, confidence } = await recognize(textStrip(ink, glyph, strengthen));
                const word = cleanRecognizedWord(text);
                return { word: vertical && [...word].length !== 1 ? '' : word, confidence };
            };
            let best = await read(false);
            if (!best.word || best.confidence < .8) {
                const alternative = await read(true);
                if (alternative.word && (!best.word || alternative.confidence > best.confidence)) {
                    best = alternative;
                }
            }
            if (best.word && best.confidence >= .38) word += best.word;
            else missed++;
        }
        if (word && [...word].length <= 10) candidates.push({ box, word, incomplete: missed > 0 || glyphs.length > 10 });
    }
    return candidates;
}

async function recognizeText(image, direction, circleCount) {
    const ink = isolateTextInk(image);
    const columns = direction === 'horizontal' ? [] : findTextRegions(ink, true);
    const lines = direction === 'vertical' ? [] : findTextRegions(ink, false);
    const tallestColumn = Math.max(0, ...columns.map(({ box }) => box.height));
    const longestLine = Math.max(0, ...lines.map(({ box }) => box.width));
    const horizontalRows = lines.filter(({ box }) => box.width >= box.height * 1.65);
    const looksVertical = tallestColumn > longestLine * 1.12;
    const useVertical = direction === 'vertical' || (direction === 'auto' &&
        (columns.length === 1 || horizontalRows.length < 2) && looksVertical);
    let regions = useVertical ? columns : lines;
    self.postMessage({ status: 'text-regions', circleCount, regionCount: regions.length });
    if (!regions.length) {
        self.postMessage({ status: 'text-done', reason: 'no-regions', candidates: [] });
        return;
    }
    const recognize = await getRecognizer();
    let candidates = await readTextRegions(ink, regions, recognize, useVertical);

    // Zhuyin alongside a vertical word can make each character look like a wide row.
    // Keep the horizontal result unless a vertical reading recovers at least as much Han text.
    if (direction === 'auto' && !useVertical && looksVertical && candidates.every(({ word }) => [...word].length === 1)) {
        const vertical = await readTextRegions(ink, columns, recognize, true);
        const hanCount = vertical.reduce((count, { word }) => count + [...word].length, 0);
        if (hanCount >= candidates.length && vertical.some(({ word, incomplete }) => !incomplete && [...word].length > 1)) {
            regions = columns;
            candidates = vertical;
        }
    }
    self.postMessage({
        status: 'text-done', reason: candidates.length ? 'recognized' : 'no-han',
        regionCount: regions.length, candidates
    });
}

self.onmessage = async ({ data: { image, scale, mode, direction = 'auto' } }) => {
    let boxes = [];
    try {
        if (mode === 'handwriting') {
            const word = await recognizeHandwriting(image);
            self.postMessage({ status: 'handwriting', word });
            return;
        }
        if (mode === 'text') {
            await recognizeText(image, direction, null);
            return;
        }
        const { circles, remainingInk } = findCircledWords(image);
        boxes = circles.map(({ x, y, width, height }) => ({ x, y, width, height }));
        if (!circles.length) {
            await recognizeText(image, direction, 0);
            return;
        }
        self.postMessage({ status: 'circles', boxes });
        const recognize = await getRecognizer();
        for (const [index, circle] of circles.entries()) {
            const result = await recognizePrintedWord(image, circle, scale, recognize);
            self.postMessage({ status: 'word', index, ...result });
        }
        let numbering = {};
        let handwriting = {};
        const handwritingInk = remainingInk.slice();
        try {
            numbering = await recognizeNumbers(image, circles, remainingInk, scale, recognize);
        } catch (error) {
            console.warn('Photo numbering did not finish.', error);
        }
        try {
            handwriting = await matchHandwriting(image, circles, handwritingInk, scale, recognize);
        } catch (error) {
            console.warn('Photo handwriting pairing did not finish.', error);
        }
        self.postMessage({ status: 'done', numbering, handwriting });
    } catch (error) {
        console.error('Photo OCR did not finish.', error);
        self.postMessage({ status: 'failed', boxes });
    }
};
