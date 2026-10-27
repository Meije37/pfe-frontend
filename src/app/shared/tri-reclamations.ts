/**
 * Tri des listes de réclamations (admin et agent) : une seule logique, partagée.
 * Le tri porte sur la liste COMPLÈTE, avant filtres et pagination : la page 1 contient donc
 * toujours les premières lignes de tout le tableau, pas seulement des lignes déjà affichées.
 */
export type ColonneTri =
  | 'reference' | 'titre' | 'citoyen' | 'categorie'
  | 'priorite' | 'statut' | 'score' | 'date' | 'assignation';

export type SensTri = 'asc' | 'desc';

// Ordres métier (et non alphabétiques) pour les colonnes à valeurs fixes.
const ORDRE_PRIORITE: Record<string, number> = { BASSE: 1, MOYENNE: 2, HAUTE: 3, CRITIQUE: 4 };
const ORDRE_STATUT: Record<string, number> = {
  OUVERTE: 1, EN_COURS: 2, RESOLUE: 3, FERMEE: 4, REJETEE: 5, ANNULEE: 6
};

// Assignation : automatique, manuelle, puis les dossiers vus uniquement via une intervention.
// Rang numérique (et non le texte) : les symboles se classent AVANT les lettres dans l'ordre
// alphabétique du navigateur, ce qui mettait ces lignes en premier.
const ORDRE_ASSIGNATION: Record<string, number> = { AUTOMATIQUE: 1, MANUELLE: 2 };

/** Sens proposé au premier clic : l'information la plus utile d'abord (récent, critique, urgent). */
export function sensInitial(colonne: ColonneTri): SensTri {
  return colonne === 'date' || colonne === 'priorite' || colonne === 'score' ? 'desc' : 'asc';
}

function cle(r: any, colonne: ColonneTri): string | number {
  switch (colonne) {
    case 'reference':   return r.reference ?? '';
    case 'titre':       return r.titre ?? '';
    case 'citoyen':     return `${r.citoyen?.nom ?? ''} ${r.citoyen?.prenom ?? ''}`.trim();
    case 'categorie':   return r.categorie?.nom ?? r.categorieNom ?? '';
    case 'priorite':    return ORDRE_PRIORITE[r.priorite] ?? 0;
    case 'statut':      return ORDRE_STATUT[r.statut] ?? 99;
    case 'score':       return r.scoreUrgence ?? 0;
    case 'assignation': return ORDRE_ASSIGNATION[r.modeAffectation] ?? 3;
    default:            return Date.parse(r.dateCreation) || 0;
  }
}

/** Renvoie une NOUVELLE liste triée (la liste d'origine n'est pas modifiée). */
export function trierReclamations(liste: any[], colonne: ColonneTri, sens: SensTri): any[] {
  const s = sens === 'asc' ? 1 : -1;
  return [...liste].sort((a, b) => {
    const ka = cle(a, colonne);
    const kb = cle(b, colonne);
    // Valeur absente (ex : citoyen ou catégorie manquants) : toujours en bas, quel que soit le sens.
    const videA = ka === '';
    const videB = kb === '';
    if (videA !== videB) return videA ? 1 : -1;
    const c = typeof ka === 'number' && typeof kb === 'number'
      ? ka - kb
      : String(ka).localeCompare(String(kb), 'fr', { sensitivity: 'base', numeric: true });
    if (c !== 0) return s * c;
    // Égalité : toujours les plus récentes d'abord, puis l'id : l'ordre reste stable.
    return (Date.parse(b.dateCreation) || 0) - (Date.parse(a.dateCreation) || 0)
        || (b.id ?? 0) - (a.id ?? 0);
  });
}
