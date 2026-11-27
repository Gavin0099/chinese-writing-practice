import { mkdtempSync, renameSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultTargetPath = fileURLToPath(new URL('../cloudConfig.mjs', import.meta.url));

function readBoolean(env, name) {
    switch ((env[name] ?? '').toLowerCase()) {
        case 'true':
        case '1':
            return true;
        case 'false':
        case '0':
        case '':
            return false;
        default:
            throw new Error(`${name} must be true, 1, false, 0, or empty.`);
    }
}

export function buildCloudConfigSource(env) {
    const url = (env.SUPABASE_URL ?? '').trim();
    const key = env.SUPABASE_PUBLISHABLE_KEY ?? '';

    if (!url && !key) return null;
    if (!url || !key) {
        throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set together.');
    }
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
        throw new Error('SUPABASE_URL must be an HTTPS project URL in the form https://<project>.supabase.co.');
    }
    if (key.startsWith('sb_secret_') || key.startsWith('eyJ')) {
        throw new Error('SUPABASE_PUBLISHABLE_KEY does not accept secret keys or JWTs.');
    }
    if (!key.startsWith('sb_publishable_') || !/^[A-Za-z0-9._-]+$/.test(key)) {
        throw new Error('SUPABASE_PUBLISHABLE_KEY must start with sb_publishable_ and contain only letters, digits, dots, underscores, or hyphens.');
    }

    const allowGoogleLink = readBoolean(env, 'ALLOW_GOOGLE_LINK');
    const photoImport = readBoolean(env, 'PHOTO_IMPORT');
    const offlineSync = readBoolean(env, 'OFFLINE_SYNC');

    return `// Set the project URL and publishable key in the deployment copy of this file.
// OAuth client secrets are configured in Supabase Auth.
export const deploymentCloud = {
    url: ${JSON.stringify(url)},
    key: ${JSON.stringify(key)},
    allowGoogleLink: ${allowGoogleLink},
    photoImport: ${photoImport},
    offlineSync: ${offlineSync}
};
`;
}

export function runBuildPagesConfig({ env = process.env, targetPath = defaultTargetPath } = {}) {
    const source = buildCloudConfigSource(env);
    if (source === null) return false;

    const temporaryDirectory = mkdtempSync(join(dirname(targetPath), '.pages-config-'));
    const temporaryPath = join(temporaryDirectory, 'cloudConfig.mjs');
    try {
        writeFileSync(temporaryPath, source, 'utf8');
        renameSync(temporaryPath, targetPath);
    } finally {
        rmSync(temporaryPath, { force: true });
        rmdirSync(temporaryDirectory);
    }

    return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    try {
        const written = runBuildPagesConfig();
        console.log(written ? 'Generated cloudConfig.mjs.' : 'Supabase config unset; cloudConfig.mjs unchanged.');
    } catch (error) {
        console.error(`Pages config build failed: ${error.message}`);
        process.exitCode = 1;
    }
}
