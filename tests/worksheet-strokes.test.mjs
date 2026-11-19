import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

function readScript(path) {
    const window = {};
    runInNewContext(readFileSync(new URL(path, import.meta.url), 'utf8'), { window });
    return window;
}

const { characters, publishedStrokeCounts } = readScript('../stroke-data/verified-tw.js').VERIFIED_TW_STROKES;

test('published worksheet records include checked Taiwan counts and exclude known mismatches', () => {
    for (const [char, count] of Object.entries({ 母: 5, 我: 7, 花: 8, 骨: 10, 三: 3, 裡: 12, 祖: 9, 袍: 10 })) {
        assert.equal(characters[char]?.strokeCount, count, char);
        assert.equal(characters[char]?.strokes.length, count, char);
    }
    assert.equal(characters.皮?.strokeCount, 5);
    assert.equal(characters.皮?.sourcePath, 'svgsJa/30382.svg', 'use the approved alternate for the swapped Taiwan variants');
    assert.equal(characters.為?.strokeCount, 9);
    const sixthStroke = characters.為?.sourceParts.find(part => part.sourceStrokeRange[0] === 6);
    assert.deepEqual([...sixthStroke.affineScaleXScaleYTranslateXTranslateY], [-1, 1, 624, 0]);
    // 瞞 uses the independently reviewed full-hint/dictionary baseline of sixteen.
    assert.equal(characters.瞞.strokeCount, 16);
    assert.equal(characters.瞞.strokes.length, 16);
    const referenceConflict = characters.瞞.sourceAdjustment.sourceReferenceConflict;
    assert.equal(referenceConflict.rawOfficialCount, 17);
    assert.equal(referenceConflict.selectedTeachingCount, 16);
    assert.equal(referenceConflict.rawOfficialXmlSha256,
        '1f66199bd3425b0d2047cb61a844de24a14a90e050b4f0fdd9cb7fe934914242');
    assert.deepEqual([...referenceConflict.excludedOriginalStrokeIndices], [17]);
    assert.deepEqual([...referenceConflict.selectedReferenceStrokeIndices],
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    assert.equal(createHash('sha256').update(characters.飾.strokes[2]).digest('hex'),
        '7319b367358a5b5c3861c76aecef8959ebc7edcc7b3c1a1a0063992bdd124c71');
    assert.equal(characters.飾.sourceAdjustment.shortHorizontalPlacement.sourceCharacter, '飯');
    assert.equal(characters.飾.sourceAdjustment.shortHorizontalPlacement.sourceStroke, 3);
    assert.equal(characters.飾.sourceAdjustment.shortHorizontalPlacement.otherTwelvePathsLiteralEqual, true);
});

test('published index counts preserve the separate worksheet demonstration steps', () => {
    const examples = { 被: 11, 初: 8, 裡: 13, 裙: 13, 襬: 21, 懂: 17, 袂: 10, 祖: 10, 袍: 11 };
    for (const [char, count] of Object.entries(examples)) {
        assert.equal(publishedStrokeCounts[char], count, char);
        if (characters[char]) {
            assert.equal(characters[char].strokes.length, count - 1, char);
        }
    }
    assert.equal(publishedStrokeCounts.母, undefined);
});

test('initial and expanded lessons have reviewed stroke data for every character', () => {
    const curriculum = readScript('../curriculum_data.js').CURRICULUM_DATA;
    for (const [grade, semester, lesson, count] of [
        ['1', 'A', 1, 9], ['1', 'A', 2, 11], ['1', 'A', 3, 14], ['1', 'A', 4, 13], ['1', 'A', 5, 14], ['1', 'A', 6, 13],
        ['1', 'B', 1, 13], ['1', 'B', 2, 16], ['1', 'B', 3, 16], ['1', 'B', 4, 16], ['1', 'B', 5, 16],
        ['1', 'B', 6, 16], ['1', 'B', 7, 15], ['1', 'B', 8, 16], ['1', 'B', 9, 16], ['1', 'B', 10, 16],
        ['1', 'B', 11, 16], ['1', 'B', 12, 16], ['2', 'A', 1, 20], ['2', 'A', 6, 20], ['2', 'A', 7, 20],
        ['2', 'A', 8, 20], ['2', 'A', 10, 19], ['2', 'A', 12, 20], ['2', 'B', 3, 20], ['2', 'B', 4, 19], ['2', 'B', 5, 20],
        ['2', 'B', 6, 20], ['2', 'B', 7, 20], ['3', 'A', 7, 14], ['3', 'A', 9, 17], ['3', 'A', 10, 16],
        ['3', 'B', 4, 18], ['4', 'B', 9, 15], ['5', 'A', 3, 3],
    ]) {
        const { vocab } = curriculum[grade][semester].find(record => record.lesson === lesson);
        assert.equal(vocab.length, count);
        assert.deepEqual([...vocab].filter(char => !characters[char]?.strokes.length), []);
    }
});

test('reviewed derived outlines keep their stroke counts and traceable inputs', () => {
    for (const [char, count] of Object.entries({
        埡: 11, 粿: 14, 痠: 12, 蠎: 18, 顧: 21, 虯: 8, 襬: 20, 搧: 13, 吔: 6, 綁: 13, 迫: 9, 慌: 13, 葵: 13, 計: 9, 幸: 8, 粽: 14,
    })) {
        assert.equal(characters[char].strokeCount, count, char);
        assert.equal(characters[char].strokes.length, count, char);
    }
    assert.equal(characters.埡.sourcePath, 'hanzi-writer-data@2.0.1/埡.json');
    for (const char of '粿痠蠎虯襬吔') assert.equal(characters[char].sourceParts.length, 2, char);
    assert.equal(characters.搧.sourceParts.length, 3);
    assert.equal(characters.綁.sourceParts.length, 4);
    assert.equal(characters.迫.sourceParts.length, 2);
    assert.equal(characters.慌.sourceParts.length, 6);
    assert.equal(characters.葵.sourceParts.length, 2);
    assert.equal(characters.計.sourceAdjustment.stroke, 1);
    // Independently reviewed 2026-11-18 correction keeps 幸's fourth point joined to both bars.
    assert.equal(createHash('sha256').update(characters.幸.strokes[3]).digest('hex'),
        '49196204ae5e6a46a13f548e344795f5280c0ad9980a16349ee56ec8a5d65738');
    assert.equal(characters.幸.sourceAdjustment.previousRecordSha256,
        '8ee4738c3ca3aa3955cb0510144e5a5f178176da6b4e92308e09cd09bccadb64');
    // The reviewed Taiwan 宗 supplies 粽's unhooked central 示 stroke.
    assert.equal(createHash('sha256').update(characters.粽.strokes[11]).digest('hex'),
        'a6032b39c9be094dc2a67ca6a855ee30caf05dc48aa85088105cbca510909b2a');
    assert.equal(characters.粽.sourceParts[1].character, '宗');
    assert.deepEqual(Array.from(characters.粽.sourceParts[1].sourceStrokeRange), [1, 8]);
    assert.equal(characters.箏.sourcePath, 'hanzi-writer-data@2.0.1/箏.json');
    assert.equal(characters.望.strokeCount, 11);
    assert.equal(characters.之.sourceAdjustment.verifiedFor, 'static_cumulative_steps');
    assert.deepEqual(Object.keys(characters.准.sourceAdjustment.joins), ['6', '7', '8']);
    assert.deepEqual(Object.keys(characters.進.sourceAdjustment.joins), ['4', '5', '6']);
    assert.equal(characters.進.sourceAdjustment.dot.outputStroke, 3);
    for (const [char, fold] of Object.entries({ 芽: 6, 呀: 5, 穿: 7, 訝: 9, 鴉: 2 })) {
        const join = characters[char].sourceAdjustment;
        assert.equal(join.outputStroke, fold, char);
        assert.equal(join.contactStroke, fold - 1, char);
    }
    assert.equal(characters.鴉.sourceAdjustment.birdEyeContact.outputStroke, 8);
    assert.equal(characters.鴉.sourceAdjustment.birdEyeContact.contactStroke, 7);
    assert.equal(characters.顯.sourceAdjustment.modifiedStroke, 22);
    assert.equal(characters.顯.sourceAdjustment.contactStroke, 21);
    assert.equal(characters.攻.sourcePath, 'svgsJa/25915.svg');
    assert.deepEqual([...characters.顧.sourceAdjustment.outputOrderFromSource.slice(0, 5)], [1, 4, 2, 3, 5]);
    assert.deepEqual([...characters.來.sourceAdjustment.outputOrderFromSource], [1, 6, 2, 3, 4, 5, 7, 8]);
    assert.deepEqual([...characters.過.sourceAdjustment.outputOrderFromSource.slice(0, 5)], [1, 2, 4, 3, 5]);
    assert.deepEqual([...characters.狸.sourceAdjustment.outputOrderFromSource.slice(7, 9)], [9, 8]);
    assert.deepEqual([...characters.識.sourceAdjustment.outputOrderFromSource.slice(-2)], [19, 18]);
    for (const [char, count] of Object.entries({ 啊: 11, 踏: 15 })) {
        assert.equal(characters[char].strokes.length, count, char);
        assert.equal(characters[char].sourceAdjustment.verifiedFor, 'static_cumulative_steps', char);
    }
});

test('reviewed bars reach their checked stems and preserve the small-cell gap', () => {
    // These independently reviewed outlines reject the earlier wrong roof connection.
    for (const [char, strokeIndex, digest] of [
        ['夏', 4, '472c2b8f2cad6de05ed89d748d26ff92f5b6e7c5a2126445edeec4914ddee056'],
        ['覺', 15, 'f67619f6a45770d29b338df0630a54a8519c3af1468ae3fd904c102bc7a17ffc'],
        ['覺', 16, 'b6c949dde2d20887f385e3d54a70d7b838026a08d5bf7f299e12c61b3cd2f347'],
        ['垂', 4, 'bd2edbe4a322c8a25d59e63e53082e2d1d95c2577a2a695649115008e3d85d99'],
        ['歡', 13, '64f67f5acd381b3ab4adb374cda80e9d17166657743b70e9c11fe06181dfcfeb'],
        ['歡', 14, '19804a4a95b0e5d5be8cf261218e08443825afde08f3b0f0d310958d2ffcb653'],
        ['歡', 15, 'a8b705bc390093b164e029430eedcb07b6d5c0865d77def32fb6a672c959ac66'],
    ]) {
        assert.equal(createHash('sha256').update(characters[char].strokes[strokeIndex]).digest('hex'), digest, char);
    }
    assert.equal(characters.夏.sourceAdjustment.localizedEndpoints['5'].target, 4);
    assert.equal(characters.夏.sourceAdjustment.localizedEndpoints['5'].targetSegment,
        'right vertical within the original horizontal cap height band');
    assert.equal(characters.垂.sourceAdjustment.localizedEndpoints['5-readable-white'].firstIntegerRetraction, 28);
    assert.equal(characters.歡.sourceAdjustment.previousRecordSha256,
        '9273c91d1d377465e5c8106cc98c7b3bb6935d22f89fb5ef4f128d278897f9fb');
    for (const [stroke, target] of [[14, 11], [15, 12], [16, 12]]) {
        assert.equal(characters.歡.sourceAdjustment.localizedEndpoints[`${stroke}-left-cap`].target, target);
    }
});

test('reviewed points and nearby strokes keep the corrected outlines', () => {
    for (const [char, strokeIndex, digest] of [
        ['吳', 6, 'd75d1a54cf4b5c21d76a9483a4cdadc0dde06d62839566db0624c2c52648d7ad'],
        ['映', 8, 'd2f7dc2bce3247083ac36b4d20569dd4e0fdd82bfb220af728df52a47e4404de'],
        ['瘦', 4, '5739935071997ade15eb01e3e3845e88a496a4a67eb09cffd7a7354e56a0f827'],
        ['額', 5, 'e3e7a5ad89582641908086b99b92920aa2c1e90f34b48947906b1831e6532a60'],
        ['爆', 0, 'da37ab9da128d2534ad49fb9733375287d973814c275399e5f37d8b9c34650ef'],
        ['嬉', 10, 'ffe25948cad9378c94791c1ec11ab5d9b73f2ce82d2d1cce607687614c870d9f'],
        ['喜', 6, '652102935cfecb463857011781196a59f183d6f77ab217a6920a952c298551f8'],
        ['鳳', 10, '21ed64056ee2003fef13cd2b2efc28f13223bdd58c1cb5069a7ed6ca9085e31a'],
    ]) {
        assert.equal(createHash('sha256').update(characters[char].strokes[strokeIndex]).digest('hex'), digest, char);
    }
    for (const char of '吳映') {
        assert.equal(characters[char].sourceAdjustment.finalPointComposition.sourceCharacter, '小', char);
        assert.equal(characters[char].sourceAdjustment.finalPointComposition.sourceStroke, 3, char);
    }
    const clearance = characters.瘦.sourceAdjustment.localizedEndpoints['5-rising-tail'].smallCellWhiteGap;
    assert.equal(clearance.length, 2);
    assert.equal(clearance.every(row => row.minimumChebyshevDistance >= 2), true);
    assert.equal(characters.額.sourceAdjustment.finalPointComposition.sourceCharacter, '額');
    assert.equal(characters.額.sourceAdjustment.finalPointComposition.sourceStroke, 6);
    assert.equal(characters.額.sourceAdjustment.finalPointComposition.otherSeventeenPathsLiteralEqual, true);
    assert.equal(characters.爆.sourceAdjustment.fireFirstPointOrientation.sourceCharacter, '熄');
    assert.equal(characters.爆.sourceAdjustment.fireFirstPointOrientation.sourceStroke, 1);
    assert.equal(characters.爆.sourceAdjustment.fireFirstPointOrientation.otherEighteenPathsLiteralEqual, true);
    assert.equal(characters.嬉.sourceAdjustment.localizedEndpoints['11'].target, 9);
    assert.equal(characters.喜.sourceAdjustment.previousRecordSha256,
        '865e4d8a00497446cb09cf25bc469c650f4f051c9dd827e8d787cd895bf6357f');
    assert.equal(characters.喜.sourceAdjustment.localizedEndpoints['7'].target, 4);
    assert.equal(characters.鳳.sourceAdjustment.fireFirstPointOrientation.sourceCharacter, '鳳');
    assert.equal(characters.鳳.sourceAdjustment.fireFirstPointOrientation.sourceStroke, 11);
    assert.equal(characters.鳳.sourceAdjustment.fireFirstPointOrientation.otherThirteenPathsLiteralEqual, true);
});

test('the grade 2 sports day worksheet has verified strokes for every character', () => {
    const curriculum = readScript('../curriculum_data.js').CURRICULUM_DATA;
    const { vocab } = curriculum['2'].A.find(record => record.lesson === 4);
    assert.equal(vocab.length, 20);
    assert.deepEqual([...vocab].filter(char => !characters[char]?.strokes.length), []);
    for (const [char, count] of Object.entries({ 運: 13, 動: 11, 飄: 20, 熱: 15, 鬧: 15, 舞: 14, 拔: 8 })) {
        assert.equal(characters[char].strokeCount, count, char);
        assert.equal(characters[char].strokes.length, count, char);
    }
    assert.equal(characters.拔.sourcePath, 'svgsJa/25300.svg');
    assert.equal(characters.飄.sourcePath, 'svgsJa/39108.svg');
    assert.equal(characters.飄.modifiedStroke.number, 14);
    assert.equal(characters.飄.modifiedStroke.sourcePath, 'svgsZhHant/39080.svg#z39080d3');
});
