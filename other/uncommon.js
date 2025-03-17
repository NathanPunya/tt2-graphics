import { tiny } from './untiny-graphics.js';
import { defs as shapes } from './uncommon-shapes.js';
import { defs as shaders } from './uncommon-shaders.js';
import { defs as components } from './uncommon-components.js';

const defs = { ...shapes, ...shaders, ...components };

export { tiny, defs };
