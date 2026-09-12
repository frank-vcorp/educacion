import { describe, it, expect } from 'vitest';
import {
  hrefToEmbedPath,
  isPlaneacionEditorPath,
} from '@/lib/navigation/planeacion-editor-path';

describe('planeacion-editor-path', () => {
  it('detecta vista de edición de planeación', () => {
    expect(isPlaneacionEditorPath('/planeaciones/85a80e01-8471-4294-a801-f4036516f0c3')).toBe(true);
    expect(isPlaneacionEditorPath('/planeaciones/nueva')).toBe(false);
    expect(isPlaneacionEditorPath('/planeaciones/uuid/entregar')).toBe(false);
  });

  it('mapea href a ruta embed', () => {
    expect(hrefToEmbedPath('/biblioteca')).toBe('/embed/biblioteca');
    expect(hrefToEmbedPath('/alumnos')).toBe('/embed/alumnos');
    expect(hrefToEmbedPath('/recursos-aula')).toBe('/embed/recursos-aula');
  });
});
