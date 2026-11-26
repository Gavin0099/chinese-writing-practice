import test from 'node:test';
import assert from 'node:assert/strict';
import { circledGlyphs, findCircledWords, glyphRows } from '../photoOcrGeometry.mjs';

const black = [43, 40, 37];
const blue = [47, 112, 153];
const red = [210, 25, 32];
const paper = [243, 241, 238];

function page(width, height) {
    const data = new Uint8ClampedArray(width * height * 4);
    function rect(x, y, w, h, color) {
        for (let row = y; row < y + h; row++) {
            for (let col = x; col < x + w; col++) data.set([...color, 255], (row * width + col) * 4);
        }
    }
    function outline(x, y, w, h) {
        rect(x, y, w, h, red);
        rect(x + 3, y + 3, w - 6, h - 6, paper);
    }
    // Strokes with an inset in the middle, so the glyph has real whitespace.
    function glyph(x, y, w, h, color) {
        rect(x, y, w, 3, color);
        rect(x + Math.floor(w / 2), y, 3, h, color);
        rect(x, y + h - 3, w, 3, color);
    }
    rect(0, 0, width, height, paper);
    return { data, width, height, rect, outline, glyph };
}

test('keeps a thin horizontal glyph and rejects short narrow specks', () => {
    const projection = new Uint16Array(58);
    projection.set([2, 2], 3);
    projection.set([17, 15], 10);
    projection.set([4, 9, 13, 11, 3, 2, 3, 7, 10, 16, 13, 7, 5, 6, 7, 4], 24);
    projection.set([3, 4], 49);
    assert.deepEqual(glyphRows(projection, 22), [[10, 12], [24, 40]]);
});

test('sizes the column from wide black and blue print and ignores red ink', () => {
    const image = page(148, 142);
    image.outline(9, 8, 113, 113);
    image.glyph(34, 19, 48, 39, black);
    image.glyph(34, 67, 48, 42, blue);
    image.rect(43, 61, 34, 3, red);
    const { circles } = findCircledWords(image);
    assert.equal(circles.length, 1);
    const glyphs = circledGlyphs(image, circles[0], .75);
    assert.deepEqual(glyphs.column, { left: 22, width: 48 });
    assert.deepEqual(glyphs.rows, [[8, 47], [56, 98]]);
    assert.equal(glyphs.tones[(61 - 11) * glyphs.width + 43 - 12], 255);
});

test('keeps a black-only circled word and excludes a dark illustrated enclosure', () => {
    const image = page(158, 80);
    image.outline(6, 6, 57, 61);
    image.glyph(19, 16, 22, 16, black);
    image.glyph(19, 39, 22, 16, black);
    image.outline(85, 6, 57, 61);
    image.rect(88, 9, 51, 55, [48, 116, 162]);
    const { circles } = findCircledWords(image);
    assert.equal(circles.length, 1);
    assert.equal(circles[0].x, 9);
    assert.deepEqual(circledGlyphs(image, circles[0], 1).rows, [[7, 23], [30, 46]]);
});

test('keeps adjacent circles isolated and allows a retry for a clipped end row', () => {
    const image = page(80, 120);
    image.outline(7, 5, 62, 46);
    image.outline(7, 48, 62, 64);
    image.glyph(21, 8, 23, 15, black);
    image.glyph(21, 30, 23, 18, blue);
    image.glyph(21, 51, 23, 12, black);
    image.glyph(21, 70, 23, 14, blue);
    image.glyph(21, 91, 23, 15, black);
    const { circles } = findCircledWords(image);
    assert.equal(circles.length, 2);
    const [upper, lower] = circles.map(circle => circledGlyphs(image, circle, 1));
    assert.deepEqual(upper.rows, [[0, 15], [22, 40]]);
    assert.deepEqual(upper.edgeTrims, []);
    assert.deepEqual(lower.rows, [[0, 12], [19, 33], [40, 55]]);
    assert.deepEqual(lower.edgeTrims, [[[19, 33], [40, 55]]]);
});

test('excludes an adjacent narrow zhuyin column with several stacked marks', () => {
    const image = page(103, 88);
    image.outline(6, 8, 87, 68);
    image.glyph(24, 20, 30, 29, blue);
    image.glyph(61, 24, 10, 10, blue);
    image.glyph(61, 37, 10, 11, blue);
    image.glyph(61, 51, 10, 10, black);
    const [circle] = findCircledWords(image).circles;
    const { column, rows } = circledGlyphs(image, circle, .8);
    assert.deepEqual(column, { left: 15, width: 30 });
    assert.deepEqual(rows, [[9, 38]]);
});
