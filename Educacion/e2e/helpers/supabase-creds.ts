import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadEnvLocal } from './load-env-local';

loadEnvLocal();

const DEFAULT_PROJECT_REF = 'fbhdxugyqtsmicopjhet';

function envOrDefault(key: string, fallback: string): string {
  const value = process.env[key]?.trim();
  return value ? value : fallback;
}

function isPlaceholder(url: string | undefined): boolean {
  return !url || url.includes('placeholder');
}

async function fetchFromSupabaseCli(): Promise<{
  url: string;
  serviceRoleKey: string;
  anonKey: string;
}> {
  const tokenPath = path.join(os.homedir(), '.supabase', 'access-token');
  if (!fs.existsSync(tokenPath)) {
    throw new Error('No hay ~/.supabase/access-token para obtener credenciales E2E.');
  }
  const token = fs.readFileSync(tokenPath, 'utf8').trim();
  const projectRef = envOrDefault('SUPABASE_PROJECT_REF', DEFAULT_PROJECT_REF);
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Supabase API keys HTTP ${res.status}`);
  }
  const keys = (await res.json()) as Array<{ name?: string; api_key?: string }>;
  const serviceRoleKey =
    keys.find((k) => k.name === 'service_role')?.api_key ??
    keys.find((k) => k.name?.includes('service'))?.api_key;
  const anonKey = keys.find((k) => k.name === 'anon')?.api_key;
  if (!serviceRoleKey) {
    throw new Error('No se encontró service_role en Supabase API keys');
  }
  if (!anonKey) {
    throw new Error('No se encontró anon key en Supabase API keys');
  }
  return {
    url: `https://${projectRef}.supabase.co`,
    serviceRoleKey,
    anonKey,
  };
}

export async function resolveSupabaseCreds(): Promise<{
  url: string;
  serviceRoleKey: string;
  anonKey: string;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !isPlaceholder(url) &&
    serviceRoleKey &&
    !serviceRoleKey.includes('placeholder') &&
    anonKey &&
    !anonKey.includes('placeholder')
  ) {
    return { url: url!, serviceRoleKey, anonKey };
  }

  return fetchFromSupabaseCli();
}
