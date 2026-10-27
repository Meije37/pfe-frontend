import { Pipe, PipeTransform } from '@angular/core';

/** Libellés lisibles des codes techniques renvoyés par l'API. */
export const LIBELLES_STATUT: Record<string, string> = {
  OUVERTE: 'Ouverte',
  EN_COURS: 'En cours',
  RESOLUE: 'Résolue',
  REJETEE: 'Rejetée',
  FERMEE: 'Fermée',
  ANNULEE: 'Annulée',
};

export const LIBELLES_PRIORITE: Record<string, string> = {
  CRITIQUE: 'Critique',
  HAUTE: 'Haute',
  MOYENNE: 'Moyenne',
  BASSE: 'Basse',
};

export function libelleStatut(code?: string | null): string {
  return code ? (LIBELLES_STATUT[code] ?? code) : '—';
}

export function libellePriorite(code?: string | null): string {
  return code ? (LIBELLES_PRIORITE[code] ?? code) : '—';
}

/** {{ rec.statut | statutLibelle }} → « En cours » au lieu de « EN_COURS ». */
@Pipe({ name: 'statutLibelle', standalone: true })
export class StatutLibellePipe implements PipeTransform {
  transform(code?: string | null): string { return libelleStatut(code); }
}

/** {{ rec.priorite | prioriteLibelle }} → « Critique » au lieu de « CRITIQUE ». */
@Pipe({ name: 'prioriteLibelle', standalone: true })
export class PrioriteLibellePipe implements PipeTransform {
  transform(code?: string | null): string { return libellePriorite(code); }
}
