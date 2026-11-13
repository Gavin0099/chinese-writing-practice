// Set the project URL and publishable key in the deployment copy of this file.
// OAuth client secrets are configured in Supabase Auth.
export const deploymentCloud = {
    url: '',
    key: '',
    allowGoogleLink: false,
    photoImport: false
};

// Keep the managed development preview on the existing Google callback origin.
if (globalThis.location?.origin === 'http://127.0.0.1:8765' && !deploymentCloud.url) {
    try {
        const { default: config } = await import('./cloudConfig.local.mjs');
        if (/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config?.url) && config?.key?.startsWith('sb_publishable_')) {
            Object.assign(deploymentCloud, { url: config.url, key: config.key });
        }
    } catch {
        // The loopback configuration is optional; local practice remains available.
    }
}
