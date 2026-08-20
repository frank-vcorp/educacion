/**
 * Tipos públicos de la capa IA (SPEC_TEC_07 §4.2).
 * Aislados para que tanto el cliente como los route handlers los importen
 * sin acoplar a la implementación de `client.ts`.
 */

export interface IaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface IaChatOptions {
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
}

export type IaOrigen = 'ia' | 'cache' | 'fallback_vacio';

export interface IaChatResult {
  /** Texto devuelto por el proveedor (vacío si fallback). */
  text: string;
  origen: IaOrigen;
  latencyMs: number;
  provider?: string;
  model?: string;
}

export { iaChat } from './client';
export type { IaClient, IaClientConfig } from './client';