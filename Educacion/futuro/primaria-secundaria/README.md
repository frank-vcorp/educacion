# Primaria y secundaria (futuro)

Este directorio conserva referencias para **sistemas independientes** de primaria y secundaria.
No importar desde la app activa del MVP preescolar.

## Estrategia

- **MVP actual:** solo preescolar (`lib/nivel-educativo/scope.ts`).
- **Después:** repos o despliegues separados por nivel, reutilizando patrones de este monorepo.
- **Base de datos:** el esquema conserva `nivel in ('preescolar','primaria','secundaria')` para no romper migraciones; la app activa fuerza `preescolar`.

## Contenido

- `niveles.ts` — constantes y grados por nivel para cuando se retome primaria/secundaria.

## Catálogo NEM

El seed actual (`0016_seed_catalogo.sql`) es **Fase 2 preescolar**. Primaria/secundaria requerirán catálogos Fase 1/Fase 3 propios en sus sistemas.
