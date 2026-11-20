/**
 * useAnneesEnfant — les années scolaires de l'enfant (année active + archives) pour le menu de la pilule d'année de
 * l'en-tête du carnet. Démo : parcours de démo de l'enfant ; compte réel : academic_years.
 * Un enfant = un carnet : changer d'enfant vide la liste AVANT le chargement ; un échec n'est jamais pris pour « aucune
 * année » (`erreur`), et ne laisse jamais les années d'un autre enfant.
 * (Même lecture que le bouton année du Suivi.)
 */

import { useEffect, useState } from 'react';
import { getAcademicYears } from '../services/database';
import { classerErreur, type TypeErreur } from '../services/erreurs';
import { getAnneesDemo, type AnneeParcours } from '../data/demo/parcours';

export function useAnneesEnfant(childId: string | undefined, isDemo: boolean, version = 0) {
  const [annees, setAnnees] = useState<AnneeParcours[]>([]);
  const [erreur, setErreur] = useState<TypeErreur | null>(null);

  useEffect(() => {
    let annule = false;
    setAnnees([]);
    setErreur(null);
    if (!childId) return;
    if (isDemo) {
      setAnnees(getAnneesDemo(childId));
      return;
    }
    getAcademicYears(childId)
      .then(({ data, error }) => {
        if (annule) return;
        if (error) {
          setErreur(classerErreur(error));
          return;
        }
        setAnnees(
          (data ?? []).map((a) => ({
            id: a.id,
            annee: a.annee_scolaire,
            niveau: a.niveau,
            etablissement: a.etablissement ?? '',
            statut: a.statut,
          })),
        );
      })
      .catch((e) => {
        if (!annule) setErreur(classerErreur(e));
      });
    return () => {
      annule = true;
    };
  }, [childId, isDemo, version]);

  const enCours = annees.find((a) => a.statut === 'active');
  const archives = annees.filter((a) => a.statut !== 'active').sort((a, b) => b.annee.localeCompare(a.annee));
  return { annees, enCours, archives, erreur };
}
