import type { Router } from 'express';
/** Domain modules are registered here as they are added (catalog, learning, badges, commerce, ...). */
const registry: Array<[string, Router]> = [];
export function addModule(path: string, router: Router) { registry.push([path, router]); }
export function registerModules(api: Router) { for (const [p, r] of registry) api.use(p, r); }
