/**
 * Distingue le MOTIF saisi par une personne (« Hors compétence ») des messages écrits par le
 * système (« Assignation automatique à l'agent Aziz »). Même règle que MotifsHistorique côté serveur.
 */
const DEBUTS_MESSAGES_SYSTEME = [
  'assignation automatique',
  'affectation manuelle',
  'statut mis à jour automatiquement',
  "mis à jour par l'agent",
];

export function estMessageSysteme(texte: string | null | undefined): boolean {
  if (!texte) return false;
  const t = texte.trim().toLowerCase();
  return DEBUTS_MESSAGES_SYSTEME.some(debut => t.startsWith(debut));
}
