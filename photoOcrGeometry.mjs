function inkHue(red, green, blue, max, difference) {
    if (!difference) return 0;
    if (max === red) return ((green - blue) / difference + 6) % 6 * 30;
    if (max === green) return ((blue - red) / difference + 2) * 30;
    return ((red - green) / difference + 4) * 30;
}

export function isRedInk(red, green, blue, saturation, hue) {
    return saturation >= 110 && red >= 85 && (hue <= 13 || hue >= 169) && red - green > 46 && red - blue > 43;
}

export function redInkCrop({ data, width, height }) {
    const mask = new Uint8Array(width * height);
    let left = width, top = height, right = -1, bottom = -1;
    for (let point = 0; point < mask.length; point++) {
        const offset = 4 * point;
        const red = data[offset], green = data[offset + 1], blue = data[offset + 2];
        if (red - green <= 46 || red - blue <= 43) continue;
        const difference = red - Math.min(green, blue);
        if (!isRedInk(red, green, blue, difference * 255 / red, inkHue(red, green, blue, red, difference))) continue;
        mask[point] = 1;
        const x = point % width, y = Math.floor(point / width);
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
    }
    if (right < left || bottom < top) return null;
    return { mask, left, top, width: right - left + 1, height: bottom - top + 1 };
}

export function findCircledWords({ data, width, height }) {
    const size = width * height;
    const redInk = new Uint8Array(size);
    const blueInk = new Uint8Array(size);
    for (let index = 0; index < size; index++) {
        const offset = 4 * index;
        const red = data[offset];
        const green = data[offset + 1];
        const blue = data[offset + 2];
        const max = Math.max(red, green, blue);
        const difference = max - Math.min(red, green, blue);
        const saturation = max ? difference * 255 / max : 0;
        if (saturation < 95 || max < 70) continue;
        const hue = inkHue(red, green, blue, max, difference);
        if (isRedInk(red, green, blue, saturation, hue)) {
            redInk[index] = 1;
        }
        if (hue >= 87 && hue <= 119 && blue - red > 30 && green - red > 22) blueInk[index] = 1;
    }

    const remainingInk = redInk.slice();
    const queue = new Int32Array(size);
    const circles = [];
    for (let index = 0; index < size; index++) {
        if (redInk[index]) continue;
        let tail = 0;
        const visit = point => {
            if (redInk[point]) return;
            redInk[point] = 1;
            queue[tail++] = point;
        };
        visit(index);
        let left = width, top = height, right = -1, bottom = -1, blueCount = 0;
        for (let head = 0; head < tail; head++) {
            const point = queue[head];
            const x = point % width;
            const y = (point - x) / width;
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
            blueCount += blueInk[point];
            if (x > 0) visit(point - 1);
            if (x + 1 < width) visit(point + 1);
            if (y > 0) visit(point - width);
            if (y + 1 < height) visit(point + width);
        }
        const w = right - left + 1;
        const h = bottom - top + 1;
        if (left === 0 || right + 1 === width || top === 0 || bottom + 1 === height) continue;
        if (w < 16 || w > 200 || h < 12 || h > 240 || tail < w * h * .36 || blueCount < 20) continue;
        const projection = new Uint16Array(w);
        for (let head = 0; head < tail; head++) {
            const point = queue[head];
            if (blueInk[point]) projection[point % width - left]++;
        }
        circles.push({ x: left, y: top, width: w, height: h, projection, interior: queue.slice(0, tail) });
    }
    return { circles: circles.sort((a, b) => a.y - b.y || b.x - a.x).slice(0, 60), remainingInk };
}

export function removeCircleInk(ink, { width, height }, circles, scale, padding = 6) {
    const radius = Math.min(12, Math.max(3, Math.round(padding * scale)));
    const spans = Array.from({ length: 2 * radius + 1 }, (_, i) => {
        const dy = i - radius;
        return [dy, Math.round(Math.sqrt(radius ** 2 - dy ** 2))];
    });
    // Only the edge pixels need dilation. Interior pixels contain no red ink.
    for (const { interior } of circles) {
        const inside = new Set(interior);
        for (const point of interior) {
            if (inside.has(point - 1) && inside.has(point + 1) &&
                inside.has(point - width) && inside.has(point + width)) continue;
            const col = point % width;
            const row = (point - col) / width;
            for (const [dy, dx] of spans) {
                if (row + dy < 0 || row + dy >= height) continue;
                const start = (row + dy) * width;
                ink.fill(0, start + Math.max(0, col - dx), start + Math.min(width, col + dx + 1));
            }
        }
    }
}

export function cropPixels(width, height, { left, top, right, bottom }) {
    const x = Math.floor(width * left / 100);
    const y = Math.floor(height * top / 100);
    return { x, y, width: Math.ceil(width * right / 100) - x, height: Math.ceil(height * bottom / 100) - y };
}

// Compare each pixel with its local background so a shadow across the page
// does not become part of the text.
export function isolateTextInk({ data, width, height }) {
    const gray = new Uint8Array(width * height);
    const stride = width + 1;
    const sums = new Float64Array(stride * (height + 1));
    for (let y = 0; y < height; y++) {
        let row = 0;
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            gray[i] = Math.round((77 * data[i * 4] + 150 * data[i * 4 + 1] + 29 * data[i * 4 + 2]) / 256);
            row += gray[i];
            sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + row;
        }
    }
    const radius = Math.max(8, Math.min(26, Math.round(Math.min(width, height) / 7)));
    const normalized = new Uint8Array(gray.length);
    const ink = new Uint8Array(gray.length);
    for (let y = 0; y < height; y++) {
        const top = Math.max(0, y - radius), bottom = Math.min(height, y + radius + 1);
        for (let x = 0; x < width; x++) {
            const left = Math.max(0, x - radius), right = Math.min(width, x + radius + 1);
            const total = sums[bottom * stride + right] - sums[top * stride + right]
                - sums[bottom * stride + left] + sums[top * stride + left];
            const background = total / ((right - left) * (bottom - top));
            const i = y * width + x;
            normalized[i] = Math.min(255, Math.round(255 * gray[i] / Math.max(1, background)));
            ink[i] = background - gray[i] >= 22 && normalized[i] <= 207 ? 1 : 0;
        }
    }
    return { normalized, ink, width, height };
}

function inkSpans(counts, minimum, gap) {
    const spans = [];
    for (let i = 0; i < counts.length; i++) {
        if (counts[i] < minimum) continue;
        const previous = spans.at(-1);
        if (previous && i - previous[1] <= gap) previous[1] = i + 1;
        else spans.push([i, i + 1]);
    }
    return spans.filter(([start, end]) => end - start >= 4);
}

export function findTextRegions({ ink, width, height }, vertical) {
    const counts = new Uint16Array(vertical ? width : height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) counts[vertical ? x : y] += ink[y * width + x];
    }
    const bands = inkSpans(counts, 3, Math.max(4, Math.min(12, Math.round(counts.length / 90))));
    const regions = [];
    for (const [start, end] of vertical ? bands.reverse() : bands) {
        const cross = new Uint16Array(vertical ? height : width);
        for (let i = start; i < end; i++) {
            for (let j = 0; j < cross.length; j++) cross[j] += ink[vertical ? j * width + i : i * width + j];
        }
        const spans = inkSpans(cross, 2, Math.max(5, Math.min(13, Math.round((end - start) / 5))));
        if (!spans.length) continue;
        const near = spans[0][0], far = spans.at(-1)[1];
        if (end - start < 8 || far - near < 8) continue;
        const box = vertical ? { x: start, y: near, width: end - start, height: far - near }
            : { x: near, y: start, width: far - near, height: end - start };
        const glyphs = vertical ? spans.map(([top, bottom]) => ({ ...box, y: top, height: bottom - top })) : [box];
        regions.push({ box, glyphs });
        if (regions.length === 30) break;
    }
    return regions;
}

export function findGlyphColumn(projection, scale) {
    const peak = Math.max(...projection);
    const first = Math.max(0, projection.findIndex(value => value >= Math.max(2, peak * .25)) - 3);
    let best = { left: first, width: projection.length - first, score: -Infinity };
    for (const nominal of [29, 32, 35]) {
        const width = Math.max(14, Math.round(nominal * scale));
        for (let left = Math.max(0, first - 3); left <= first + 4 && left + width <= projection.length; left++) {
            const score = projection.subarray(left, left + width).reduce((sum, value) => sum + value, 0) - width * .75;
            if (score > best.score) best = { left, width, score };
        }
    }
    return best;
}

export function glyphRows(projection, scale) {
    const minimum = Math.max(6, Math.round(8 * scale));
    const gap = Math.max(3, Math.round(4 * scale));
    const maxGlyph = Math.max(23, Math.round(38 * scale));
    const ranges = [];
    let start = -1, last = -1;
    function addRange() {
        if (last - start < minimum) return;
        if (last - start + 1 <= maxGlyph) {
            ranges.push([start, last + 1]);
            return;
        }
        const margin = Math.max(10, Math.round(16 * scale));
        let cut = Math.floor((start + last + 1) / 2);
        for (let row = start + margin; row <= last - margin + 1; row++) {
            if (projection[row] < projection[cut] ||
                (projection[row] === projection[cut] && Math.abs(row - (start + last + 1) / 2) < Math.abs(cut - (start + last + 1) / 2))) {
                cut = row;
            }
        }
        ranges.push([start, cut], [cut, last + 1]);
    }
    for (let row = 0; row < projection.length; row++) {
        if (projection[row] < 2) continue;
        if (start < 0 || row - last > gap) {
            if (start >= 0) addRange();
            start = row;
        }
        last = row;
    }
    if (start >= 0) addRange();
    return ranges.length ? ranges : [[0, projection.length]];
}
