import packageJson from '../package.json'

const version = packageJson.version

export const appVersion = version.startsWith('v') ? version : `v${version}`
