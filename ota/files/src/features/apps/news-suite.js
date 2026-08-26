import { newsResilientRenderers } from './news-resilient.js';
import { renderNovaAIV6Phase1 } from './nova-ai-v6-phase1.js';

export const newsSuiteRenderers = Object.freeze({
  ...newsResilientRenderers,
  ai: renderNovaAIV6Phase1
});
