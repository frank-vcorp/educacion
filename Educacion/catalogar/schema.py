"""
schema.py — Modelos pydantic v2 para validar JSON contra el esquema E14 §5.

El JSON crudo y el curado deben pasar estas validaciones antes de generar SQL.
Cualquier fallo se reporta como requiere_revision_humana.
"""

from datetime import date, datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator


# === Tablas núcleo (E14 §5.1) ===

class CatalogoVersion(BaseModel):
    id: Optional[int] = None
    codigo: str = Field(..., description="Ej: 'PLAN_2022_ED_2025_FASE_2'")
    nombre: str
    fecha_vigencia: date
    fuente_dof: str
    fuente_sha256: str = Field(..., min_length=64, max_length=64, description="SHA256 hex del PDF fuente")
    fecha_carga: Optional[datetime] = None
    cargado_por: Optional[str] = None
    metadata: Optional[dict] = None


class CampoFormativo(BaseModel):
    id: Optional[int] = None
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    orden: Optional[int] = None
    catalogo_version_id: Optional[int] = None


class EjeArticulador(BaseModel):
    id: Optional[int] = None
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    orden: Optional[int] = None
    catalogo_version_id: Optional[int] = None


class Fase(BaseModel):
    id: Optional[int] = None
    codigo: str
    numero: int
    nombre: str
    rango_edad: Optional[str] = None
    catalogo_version_id: Optional[int] = None


class PDA(BaseModel):
    id: Optional[int] = None
    codigo: str = Field(..., description="Ej: 'PDA-F2-LNG-001'")
    texto: Optional[str] = None
    catalogo_version_id: Optional[int] = None
    fuente_dof_pagina: Optional[int] = None
    fuente_dof_sha: Optional[str] = Field(None, min_length=64, max_length=64)
    activo: bool = True
    requiere_revision_humana: bool = False
    razon_revision: Optional[str] = None
    campos_asociados: List[str] = Field(default_factory=list, description="Códigos de campo_formativo")
    ejes_asociados: List[str] = Field(default_factory=list, description="Códigos de eje_articulador")


class Contenido(BaseModel):
    id: Optional[int] = None
    codigo: str
    texto: Optional[str] = None
    fase_id: Optional[int] = None
    campo_id: Optional[int] = None
    catalogo_version_id: Optional[int] = None
    fuente_dof_pagina: Optional[int] = None
    requiere_revision_humana: bool = False
    razon_revision: Optional[str] = None


class PDAporCampoFase(BaseModel):
    pda_codigo: str
    fase_codigo: str = "FASE_2"
    campo_codigo: str


class PDAEjes(BaseModel):
    pda_codigo: str
    eje_codigo: str


class ReferenciaLibroConaliteg(BaseModel):
    id: Optional[int] = None
    grado: str = Field(..., description="Ej: '1° preescolar'")
    campo: str
    titulo_libro: Optional[str] = None
    url_publica: Optional[str] = None
    isbn: Optional[str] = None
    edicion: Optional[str] = None
    fecha_acceso: Optional[date] = None
    notas: Optional[str] = None
    fase_id: Optional[int] = None
    campo_id: Optional[int] = None
    url_estado: Optional[Literal["viva", "caida", "no_verificada"]] = None
    requiere_revision_humana: bool = False


class AuditoriaCarga(BaseModel):
    id: Optional[int] = None
    fecha: Optional[datetime] = None
    catalogo_version_id: Optional[int] = None
    pda_codigo: Optional[str] = None
    accion: Literal["revisado", "corregido", "agregado", "marcado_inactivo"]
    observacion: Optional[str] = None
    autor: Optional[str] = None


# === Modelo agregado: catálogo completo (entrada de build-sql y audit) ===

class CatalogoFase2(BaseModel):
    catalogo_version: CatalogoVersion
    campos_formativos: List[CampoFormativo] = Field(default_factory=list)
    ejes_articuladores: List[EjeArticulador] = Field(default_factory=list)
    fases: List[Fase] = Field(default_factory=list)
    pdas: List[PDA] = Field(default_factory=list)
    contenidos: List[Contenido] = Field(default_factory=list)
    pda_por_campo_fase: List[PDAporCampoFase] = Field(default_factory=list)
    pda_ejes: List[PDAEjes] = Field(default_factory=list)
    referencias_conaliteg: List[ReferenciaLibroConaliteg] = Field(default_factory=list)
    auditoria_carga: List[AuditoriaCarga] = Field(default_factory=list)

    @field_validator("pdas")
    @classmethod
    def codigos_pda_unicos(cls, v: List[PDA]) -> List[PDA]:
        codigos = [p.codigo for p in v]
        if len(codigos) != len(set(codigos)):
            dups = {c for c in codigos if codigos.count(c) > 1}
            raise ValueError(f"Códigos PDA duplicados: {dups}")
        return v

    def pdas_requieren_revision(self) -> List[PDA]:
        return [p for p in self.pdas if p.requiere_revision_humana or not p.texto]

    def contenidos_requieren_revision(self) -> List[Contenido]:
        return [c for c in self.contenidos if c.requiere_revision_humana or not c.texto]

    def referencias_requieren_revision(self) -> List[ReferenciaLibroConaliteg]:
        return [r for r in self.referencias_conaliteg if r.requiere_revision_humana or not r.url_publica]
