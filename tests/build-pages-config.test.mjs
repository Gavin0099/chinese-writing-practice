import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { buildCloudConfigSource, runBuildPagesConfig } from '../scripts/build-pages-config.mjs';

const validEnv = {
    SUPABASE_URL: 'https://writing-practice.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo.A-1_2'
};
const originalSource = '// Existing cloud configuration.\n';

function existingTarget(t) {
    const directory = mkdtempSync(join(tmpdir(), 'build-pages-config-'));
    const targetPath = join(directory, 'cloudConfig.mjs');
    t.after(() => {
        rmSync(targetPath, { force: true });
        rmdirSync(directory);
    });
    writeFileSync(targetPath, originalSource, 'utf8');
    return targetPath;
}

function assertRejectedWithoutWriting(targetPath, env, expectedError) {
    assert.throws(() => runBuildPagesConfig({ env, targetPath }), expectedError);
    assert.equal(readFileSync(targetPath, 'utf8'), originalSource);
}

test('leaves the target untouched when both Supabase settings are unset or empty', (t) => {
    const targetPath = existingTarget(t);
    for (const env of [{}, { SUPABASE_URL: ' \t ', SUPABASE_PUBLISHABLE_KEY: '' }]) {
        assert.equal(buildCloudConfigSource(env), null);
        assert.equal(runBuildPagesConfig({ env, targetPath }), false);
        assert.equal(readFileSync(targetPath, 'utf8'), originalSource);
    }
});

test('rejects either partial Supabase configuration', (t) => {
    const targetPath = existingTarget(t);
    for (const name of Object.keys(validEnv)) {
        assertRejectedWithoutWriting(targetPath, { [name]: validEnv[name] }, /must be set together/);
    }
});

test('rejects a non-HTTPS URL, an arbitrary domain, and a URL with a path', (t) => {
    const targetPath = existingTarget(t);
    for (const url of ['http://example.supabase.co', 'https://example.com', 'https://example.supabase.co/path']) {
        assertRejectedWithoutWriting(targetPath, { ...validEnv, SUPABASE_URL: url }, /SUPABASE_URL must be/);
    }
});

test('rejects secret keys, JWTs, and malformed publishable keys', (t) => {
    const targetPath = existingTarget(t);
    for (const key of ['sb_secret_demo', 'eyJhbGci.demo.signature']) {
        assertRejectedWithoutWriting(targetPath, { ...validEnv, SUPABASE_PUBLISHABLE_KEY: key }, /does not accept secret keys or JWTs/);
    }
    for (const key of ['wrong_prefix_demo', 'sb_publishable_demo\n', 'sb_publishable_demo with spaces', 'sb_publishable_demo";']) {
        assertRejectedWithoutWriting(targetPath, { ...validEnv, SUPABASE_PUBLISHABLE_KEY: key }, /must start with sb_publishable_/);
    }
});

test('rejects an invalid value for any feature flag', (t) => {
    const targetPath = existingTarget(t);
    for (const name of ['ALLOW_GOOGLE_LINK', 'PHOTO_IMPORT', 'OFFLINE_SYNC']) {
        assertRejectedWithoutWriting(targetPath, { ...validEnv, [name]: 'maybe' }, new RegExp(`${name} must be`));
    }
});

test('writes valid ESM with the exact deployment configuration', async (t) => {
    const targetPath = existingTarget(t);
    const env = {
        ...validEnv,
        SUPABASE_URL: ` ${validEnv.SUPABASE_URL}\t`,
        ALLOW_GOOGLE_LINK: 'TrUe',
        PHOTO_IMPORT: '1',
        OFFLINE_SYNC: 'FaLsE'
    };

    assert.equal(runBuildPagesConfig({ env, targetPath }), true);
    const { deploymentCloud } = await import(pathToFileURL(targetPath).href);
    assert.deepEqual(deploymentCloud, {
        url: validEnv.SUPABASE_URL,
        key: validEnv.SUPABASE_PUBLISHABLE_KEY,
        allowGoogleLink: true,
        photoImport: true,
        offlineSync: false
    });
});

test('uses false for zero, empty, and unset feature flags', async (t) => {
    const targetPath = existingTarget(t);
    const env = { ...validEnv, ALLOW_GOOGLE_LINK: '0', PHOTO_IMPORT: '' };

    runBuildPagesConfig({ env, targetPath });
    const { deploymentCloud } = await import(pathToFileURL(targetPath).href);
    assert.deepEqual(deploymentCloud, {
        url: validEnv.SUPABASE_URL,
        key: validEnv.SUPABASE_PUBLISHABLE_KEY,
        allowGoogleLink: false,
        photoImport: false,
        offlineSync: false
    });
});
