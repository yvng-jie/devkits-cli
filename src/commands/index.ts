/**
 * Public entry point for the command registry.
 *
 * The registry lives in `src/registry.ts` (see the note there about import
 * cycles); this barrel keeps `./commands/index.js` imports working.
 */
export { commands, findCommand } from '../registry.js'
