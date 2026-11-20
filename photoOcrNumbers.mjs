// Work in the same pixel space as the red circles. The mask contains red ink
// only, with circle outlines removed by the geometry pass.
export function inkComponents(mask, width, height, accepts) {
    const visited = new Uint8Array(mask.length);
    const queue = new Int32Array(mask.length);
    const components = [];
    for (let pixel = 0; pixel < mask.length; pixel++) {
        if (!mask[pixel] || visited[pixel]) continue;
        let end = 0;
        const visit = index => {
            if (mask[index] && !visited[index]) {
                visited[index] = 1;
                queue[end++] = index;
            }
        };
        visit(pixel);
        let x = width, y = height, right = 0, bottom = 0;
        for (let head = 0; head < end; head++) {
            const index = queue[head];
            const col = index % width;
            const row = (index - col) / width;
            x = Math.min(x, col);
            y = Math.min(y, row);
            right = Math.max(right, col + 1);
            bottom = Math.max(bottom, row + 1);
            for (let dy = Math.max(-1, -row); dy <= Math.min(1, height - 1 - row); dy++) {
                for (let dx = Math.max(-1, -col); dx <= Math.min(1, width - 1 - col); dx++) {
                    visit(index + dy * width + dx);
                }
            }
        }
        const w = right - x;
        const h = bottom - y;
        if (!accepts(w, h, end)) continue;
        components.push({ x, y, right, bottom, w, h, points: queue.slice(0, end) });
    }
    return components.sort((a, b) => a.x - b.x);
}

export function numberPatches(mask, width, height, scale) {
    return inkComponents(mask, width, height, (w, h, area) =>
        area >= 38 * scale ** 2 && h >= 14 * scale && h <= 66 * scale && w >= 3 * scale && w <= 65 * scale);
}

function horizontalGap(a, b) {
    return Math.max(a.x - b.right, b.x - a.right, 0);
}

// Group side-by-side digits. Vertical overlap rejects nearby notes and circles
// on adjacent rows, while still accepting two digits with different baselines.
export function groupNumberPatches(parts, scale) {
    const groups = [];
    for (const [i, first] of parts.entries()) {
        groups.push([first]);
        for (let j = i + 1; j < parts.length; j++) {
            const second = parts[j];
            if (second.x - first.right > 14 * scale) break;
            const overlap = Math.min(first.bottom, second.bottom) - Math.max(first.y, second.y);
            if (overlap >= Math.min(first.h, second.h) * .52 &&
                Math.abs(first.bottom - second.bottom) <= 17 * scale &&
                horizontalGap(first, second) <= 14 * scale &&
                second.right - first.x <= 69 * scale) groups.push([first, second]);
        }
    }
    return groups;
}

export function numberPatchBounds(group) {
    return {
        x: Math.min(...group.map(part => part.x)),
        y: Math.min(...group.map(part => part.y)),
        right: Math.max(...group.map(part => part.right)),
        bottom: Math.max(...group.map(part => part.bottom))
    };
}

export function numberDistance(box, mark, scale) {
    const x = (mark.x + mark.right) / 2;
    const horizontal = Math.max(0, box.x - x, x - box.x - box.width);
    const vertical = box.y - mark.bottom;
    if (horizontal > 45 * scale || vertical < -25 * scale || vertical > 122 * scale) return Infinity;
    return (horizontal * 1.25 + Math.abs(vertical) + Math.abs(x - box.x - box.width * .75) * .18) / scale;
}

export function readingOrder(circles, scale) {
    const columns = [];
    for (const index of circles.keys()) {
        const circle = circles[index];
        const x = circle.x + Math.min(circle.width * .35, 24 * scale);
        const column = columns.find(existing => Math.abs(existing.x - x) <= 23 * scale);
        if (column) column.indices.push(index);
        else columns.push({ x, indices: [index] });
    }
    return columns.sort((a, b) => b.x - a.x)
        .flatMap(column => column.indices.sort((a, b) => circles[a].y - circles[b].y));
}

// Use the visible numbers as anchors. A page's right-to-left columns can fill
// a missing label when enough independent labels agree with a consecutive run.
export function matchPhotoNumbers(circles, marks, scale) {
    // A clear two-digit read takes precedence over isolated digits from the
    // same pen strokes. Otherwise 13 can be counted again as an anchor for 3.
    const combined = marks.filter(mark => mark.number >= 10 && mark.group.length === 2 && mark.confidence >= .68);
    marks = marks.filter(mark => mark.group.length !== 1 ||
        !combined.some(whole => whole.group.includes(mark.group[0]) && whole.confidence + .15 >= mark.confidence));
    const order = readingOrder(circles, scale);
    const choices = order.map(index => marks.flatMap(mark => {
        const distance = numberDistance(circles[index], mark, scale);
        return Number.isFinite(distance) ? [{ ...mark, distance }] : [];
    }));
    const bestFor = (options, number) => options.filter(mark => mark.number === number)
        .sort((a, b) => markScore(b) - markScore(a))[0];
    const markScore = mark => mark.confidence - mark.distance / 180;
    const isAnchor = mark => mark && mark.confidence >= .68 && mark.distance <= (mark.confidence >= .94 ? 80 : 59);
    const runs = [];
    for (let start = 1; start + order.length - 1 <= 99; start++) {
        const matches = choices.map((options, position) => bestFor(options, start + position));
        const anchors = matches.filter(isAnchor);
        const score = anchors.reduce((sum, mark) => sum + markScore(mark), 0);
        runs.push({ start, matches, anchors: anchors.length, score });
    }
    runs.sort((a, b) => b.anchors - a.anchors || b.score - a.score);
    const [run, alternative] = runs;
    const coherent = run && order.length >= 4 && run.anchors >= Math.max(3, Math.ceil(order.length * .5)) &&
        run.anchors >= (alternative?.anchors ?? 0) + 2;
    if (coherent) {
        return Object.fromEntries(order.flatMap((index, position) => {
            const mark = run.matches[position];
            const number = run.start + position;
            if (isAnchor(mark)) return [[index, { number, inferred: false }]];
            const previous = run.matches.slice(0, position).findLastIndex(isAnchor);
            const next = run.matches.findIndex((candidate, i) => i > position && isAnchor(candidate));
            const conflict = choices[position].some(candidate => candidate.number !== number &&
                candidate.distance <= 27 && candidate.confidence >= .88);
            // Do not extend beyond the visible numbering or guess across a large gap.
            if (previous >= 0 && next >= 0 && next - previous <= 3 && !conflict) {
                return [[index, { number, inferred: true }]];
            }
            return [];
        }));
    }

    const candidates = choices.flatMap((options, position) => options
        .filter(mark => mark.confidence >= .81 && mark.distance <= 27)
        .map(mark => ({ ...mark, index: order[position] })));
    candidates.sort((a, b) => markScore(b) - markScore(a));
    const result = {};
    const used = new Set();
    for (const mark of candidates) {
        if (result[mark.index] || mark.group.some(part => used.has(part))) continue;
        if (candidates.some(other => other !== mark && other.index === mark.index && other.number !== mark.number &&
            Math.abs(markScore(other) - markScore(mark)) < .17)) continue;
        for (const part of mark.group) used.add(part);
        result[mark.index] = { number: mark.number, inferred: false };
    }
    return result;
}

export function orderPhotoCards(cards) {
    const occurrences = new Map();
    for (const { teacherNumber } of cards) {
        if (teacherNumber !== null) occurrences.set(teacherNumber, (occurrences.get(teacherNumber) ?? 0) + 1);
    }
    const duplicates = new Set([...occurrences].filter(([, count]) => count > 1).map(([number]) => number));
    const rank = card => card.teacherNumber !== null && !duplicates.has(card.teacherNumber) ? card.teacherNumber : Infinity;
    return { sorted: [...cards].sort((a, b) => rank(a) - rank(b)), duplicates };
}
