import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanRecognizedWord, suggestPhotoReading } from '../photoOcrText.mjs';

globalThis.window = globalThis;
await import('../db_core.js');
const dictionary = globalThis.MOE_DATA;

test('keeps the recognized Han when punctuation or adjacent zhuyin slips into the crop', () => {
    assert.equal(cleanRecognizedWord('13「叫 好」 ㄏㄠˇ'), '叫好');
    assert.equal(cleanRecognizedWord('近海。'), '近海');
    assert.equal(cleanRecognizedWord('等'), '等');
    assert.equal(cleanRecognizedWord('带'), '帶');
    assert.equal(cleanRecognizedWord('「12 ㄏㄠˇ」'), '');
    assert.equal(cleanRecognizedWord('近X海'), '');
    assert.equal(cleanRecognizedWord('天'.repeat(11)), '');
});

test('offers contextual or local dictionary readings, and flags unresolved alternate readings', () => {
    assert.deepEqual(suggestPhotoReading('叫好', dictionary), { reading: 'ㄐㄧㄠˋ ㄏㄠˇ', ambiguous: [] });
    assert.deepEqual(suggestPhotoReading('近海', dictionary), { reading: 'ㄐㄧㄣˋ ㄏㄞˇ', ambiguous: [] });
    assert.deepEqual(suggestPhotoReading('暑假', dictionary), { reading: 'ㄕㄨˇ ㄐㄧㄚˋ', ambiguous: [] });
    assert.deepEqual(suggestPhotoReading('好', dictionary), { reading: 'ㄏㄠˇ', ambiguous: ['好'] });
    assert.deepEqual(suggestPhotoReading('認識', dictionary), { reading: 'ㄖㄣˋ ㄕˋ', ambiguous: ['識'] });
    assert.deepEqual(suggestPhotoReading('近海', undefined), { reading: '', ambiguous: [] });
    assert.deepEqual(suggestPhotoReading('近㐀', dictionary), { reading: '', ambiguous: [] });
});
