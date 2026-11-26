import test from 'node:test';
import assert from 'node:assert/strict';
import { removeCircleInk } from '../photoOcrGeometry.mjs';
import { groupNumberPatches, matchPhotoNumbers, numberDistance, numberPatches } from '../photoOcrNumbers.mjs';

function label(x, y, right, bottom, number, confidence = .98) {
    return { x, y, right, bottom, number, confidence, group: [{ x, y, right, bottom }] };
}

test('matches an upper-right label and a right-side label to their circles', () => {
    const circles = [
        { x: 40, y: 20, width: 38, height: 90 },
        { x: 135, y: 120, width: 36, height: 90 }
    ];
    const side = label(81, 35, 91, 70, 31);
    const corner = label(169, 106, 182, 139, 24);
    assert.deepEqual(matchPhotoNumbers(circles, [side, corner], 1), {
        0: { number: 31, inferred: false },
        1: { number: 24, inferred: false }
    });
    assert.equal(numberDistance(circles[0], label(80, 88, 93, 109, 2), 1), Infinity);
    assert.equal(numberDistance(circles[0], label(21, 31, 32, 63, 2), 1), Infinity);
});

test('requires high confidence and a unique circle for a distant upper-right label', () => {
    const circle = { x: 20, y: 135, width: 93, height: 54 };
    const other = { x: 115, y: 122, width: 82, height: 57 };
    const distant = label(108, 29, 136, 64, 32);
    assert.deepEqual(matchPhotoNumbers([circle], [distant], .75), {
        0: { number: 32, inferred: false }
    });
    assert.deepEqual(matchPhotoNumbers([circle], [{ ...distant, confidence: .9 }], .75), {});
    assert.deepEqual(matchPhotoNumbers([circle, other], [distant], .75), {});
});

test('retains a tall label next to a circle after outline removal', () => {
    const width = 130, height = 125;
    const ink = new Uint8Array(width * height);
    const interior = [];
    for (let y = 45; y < 100; y++) {
        for (let x = 25; x < 75; x++) interior.push(y * width + x);
    }
    for (let y = 44; y <= 100; y++) ink[y * width + 24] = ink[y * width + 75] = 1;
    for (let y = 10; y < 84; y++) ink.fill(1, y * width + 81, y * width + 86);
    removeCircleInk(ink, { width, height }, [{ interior }], 1);
    const parts = numberPatches(ink, width, height, 1);
    assert.deepEqual(parts.map(({ x, y, w, h }) => [x, y, w, h]), [[81, 10, 5, 74]]);
    assert.deepEqual(groupNumberPatches(parts, 1), [[parts[0]]]);
});
