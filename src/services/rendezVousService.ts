/**
 * rendezVousService — rendez-vous fixes hebdomadaires d'un enfant (lot 4c, M43).
 *
 * - Un enfant = un carnet : toujours UN child_id.
 * - Tout responsable de l'enfant lit, crée et coche ; seul le FOYER DE L'AUTEUR modifie et supprime (RLS M43, règle
 *   du 21 nov.). « Ajouté par » : rendez_vous_auteurs, que la base ne rend qu'au foyer de l'auteur (hors foyer : rien).
 * - Coches « À prévoir » par semaine (lundi), partagées ; auteur et heure lus dans rendez_vous_coches_auteurs, que la
 *   base ne rend qu'au foyer de l'auteur (règle des parents séparés) → hors foyer, « Fait ».
 * - Zone de vacances : école de l'année active (code UAI, ville), zone B par défaut (utils/vacances).
 * - Démo : état en mémoire (stores/rendezVousStore), jamais en base. Base sans M43 : aucune donnée, rien ne casse.
 */
import { supabase } from './supabase';
import { classerErreur, leverSiErreur } from './erreurs';
import { chargerAuteursCoche } from './devoirsService';
import type { AuteursCoche } from '../utils/devoirs';
import type { AuteurCocheRdv, CocheLueRdv, RendezVous } from '../utils/rendezVous';
import { zoneDepuisEcole, type Zone } from '../utils/vacances';
import { etatDemo, majDemo, signalerRendezVous, type EtatDemo } from '../stores/rendezVousStore';

export class ErreurRendezVous extends Error {}

export interface DonneesRendezVous {
  rdvs: RendezVous[];
  coches: CocheLueRdv[];
  auteursCoches: AuteurCocheRdv[];
  /** Prénoms des responsables (« vous » pour soi), pour « Ajouté par » et « Coché par ». */
  noms: AuteursCoche;
  zone: Zone;
}

const MOI_DEMO = 'demo-moi';

function erreurEcriture(error: unknown, defaut: string): ErreurRendezVous {
  const type = classerErreur(error);
  if (type === 'reseau') return new ErreurRendezVous('Pas de connexion : rien n’a été enregistré. Réessayez quand le réseau est revenu.');
  if (type === 'session') return new ErreurRendezVous('Votre session a expiré : reconnectez-vous, puis recommencez.');
  return new ErreurRendezVous(defaut);
}

/** Table absente (base sans M43). */
function tableAbsente(error: { code?: string } | null): boolean {
  return !!error && (error.code === 'PGRST205' || error.code === '42P01');
}

function initialDemo(childId: string): EtatDemo<RendezVous, AuteurCocheRdv> {
  return {
    rdvs: [
      { id: `demo-rdv-piscine-${childId}`, child_id: childId, titre: 'Piscine', jour_semaine: 4, categorie: 'eps', a_prevoir: ['Maillot', 'Bonnet', 'Serviette'], cree_par: MOI_DEMO, peut_modifier: true },
      { id: `demo-rdv-biblio-${childId}`, child_id: childId, titre: 'Bibliothèque', jour_semaine: 2, categorie: null, a_prevoir: ['Livre à rendre'], cree_par: MOI_DEMO, peut_modifier: true },
    ],
    coches: [],
  };
}

/** Zone de vacances de l'école de l'année active (zone B si l'école est inconnue ou illisible). */
async function zoneEnfant(childId: string): Promise<Zone> {
  const { data: annee } = await supabase.from('academic_years').select('classe_id').eq('student_id', childId).eq('statut', 'active').maybeSingle();
  if (!annee?.classe_id) return 'B';
  const { data: classe } = await supabase.from('classes').select('ecole_id').eq('id', annee.classe_id).maybeSingle();
  if (!classe?.ecole_id) return 'B';
  const { data: ecole } = await supabase.from('ecoles').select('code_uai, ville').eq('id', classe.ecole_id).maybeSingle();
  return zoneDepuisEcole(ecole);
}

/** Rendez-vous fixes de l'enfant, coches et auteurs visibles, prénoms, zone. Lève en cas d'échec réel. */
export async function chargerRendezVous(childId: string, demo: boolean): Promise<DonneesRendezVous> {
  if (demo) {
    const e = etatDemo<RendezVous, AuteurCocheRdv>(childId, () => initialDemo(childId));
    return { rdvs: e.rdvs, coches: e.coches, auteursCoches: e.coches, noms: { [MOI_DEMO]: 'vous' }, zone: 'B' };
  }
  const r = await supabase.from('rendez_vous_fixes').select('id, child_id, titre, jour_semaine, heure, categorie, a_prevoir').eq('child_id', childId).order('jour_semaine');
  if (tableAbsente(r.error)) return { rdvs: [], coches: [], auteursCoches: [], noms: {}, zone: 'B' };
  leverSiErreur(r.error);
  const lignes = (r.data ?? []) as any[];
  const ids = lignes.map((x) => String(x.id));
  // Auteurs que la base me rend (foyer de l'auteur, ou auteur parti) : « Ajouté par » et droit de modifier.
  const auteursRdv = ids.length ? await supabase.from('rendez_vous_auteurs').select('rdv_id, cree_par').in('rdv_id', ids) : { data: [], error: null };
  leverSiErreur(auteursRdv.error);
  const visibles = new Map(((auteursRdv.data ?? []) as any[]).map((a) => [String(a.rdv_id), a.cree_par ? String(a.cree_par) : null]));
  const rdvs = lignes.map((x) => ({
    ...x,
    a_prevoir: Array.isArray(x.a_prevoir) ? x.a_prevoir.map(String) : [],
    cree_par: visibles.get(String(x.id)) ?? null,
    peut_modifier: visibles.has(String(x.id)),
  })) as RendezVous[];
  const [coches, auteurs, noms, zone] = await Promise.all([
    ids.length ? supabase.from('rendez_vous_coches').select('rdv_id, semaine, item').in('rdv_id', ids) : Promise.resolve({ data: [], error: null }),
    ids.length ? supabase.from('rendez_vous_coches_auteurs').select('rdv_id, semaine, item, fait_par, fait_le').in('rdv_id', ids) : Promise.resolve({ data: [], error: null }),
    chargerAuteursCoche(childId),
    zoneEnfant(childId).catch(() => 'B' as Zone),
  ]);
  leverSiErreur(coches.error);
  leverSiErreur(auteurs.error);
  return {
    rdvs,
    coches: (coches.data ?? []) as CocheLueRdv[],
    auteursCoches: (auteurs.data ?? []) as AuteurCocheRdv[],
    noms,
    zone,
  };
}

export interface SaisieRendezVous {
  titre: string;
  jourSemaine: number;
  aPrevoir: string[];
}

export async function creerRendezVous(childId: string, s: SaisieRendezVous, demo: boolean): Promise<void> {
  if (demo) {
    const e = etatDemo<RendezVous, AuteurCocheRdv>(childId, () => initialDemo(childId));
    majDemo(childId, { ...e, rdvs: [...e.rdvs, { id: `demo-rdv-${Date.now()}`, child_id: childId, titre: s.titre, jour_semaine: s.jourSemaine, a_prevoir: s.aPrevoir, cree_par: MOI_DEMO, peut_modifier: true }] });
    return;
  }
  const { error } = await supabase.from('rendez_vous_fixes').insert({ child_id: childId, titre: s.titre, jour_semaine: s.jourSemaine, a_prevoir: s.aPrevoir });
  if (error) throw erreurEcriture(error, 'Le rendez-vous n’a pas pu être enregistré. Réessayez.');
  signalerRendezVous(childId);
}

export async function modifierRendezVous(rdv: RendezVous, s: SaisieRendezVous, demo: boolean): Promise<void> {
  if (demo) {
    const e = etatDemo<RendezVous, AuteurCocheRdv>(rdv.child_id, () => initialDemo(rdv.child_id));
    majDemo(rdv.child_id, { ...e, rdvs: e.rdvs.map((x) => (x.id === rdv.id ? { ...x, titre: s.titre, jour_semaine: s.jourSemaine, a_prevoir: s.aPrevoir } : x)) });
    return;
  }
  const { data, error } = await supabase.from('rendez_vous_fixes')
    .update({ titre: s.titre, jour_semaine: s.jourSemaine, a_prevoir: s.aPrevoir }).eq('id', rdv.id).select('id');
  if (error || !data?.length) throw error ? erreurEcriture(error, 'Modification impossible. Réessayez.') : new ErreurRendezVous('Seul le foyer qui a ajouté ce rendez-vous peut le modifier.');
  signalerRendezVous(rdv.child_id);
}

export async function supprimerRendezVous(rdv: RendezVous, demo: boolean): Promise<void> {
  if (demo) {
    const e = etatDemo<RendezVous, AuteurCocheRdv>(rdv.child_id, () => initialDemo(rdv.child_id));
    majDemo(rdv.child_id, { rdvs: e.rdvs.filter((x) => x.id !== rdv.id), coches: e.coches.filter((c) => c.rdv_id !== rdv.id) });
    return;
  }
  const { data, error } = await supabase.from('rendez_vous_fixes').delete().eq('id', rdv.id).select('id');
  if (error) throw erreurEcriture(error, 'Suppression impossible. Réessayez.');
  if (!data?.length) throw new ErreurRendezVous('Seul le foyer qui a ajouté ce rendez-vous peut le supprimer.');
  signalerRendezVous(rdv.child_id);
}

/** Coche ou décoche un élément « À prévoir » pour la semaine (lundi). */
export async function cocherAPrevoir(rdv: RendezVous, semaine: string, item: string, coche: boolean, demo: boolean): Promise<void> {
  if (demo) {
    const e = etatDemo<RendezVous, AuteurCocheRdv>(rdv.child_id, () => initialDemo(rdv.child_id));
    const sans = e.coches.filter((c) => !(c.rdv_id === rdv.id && c.semaine === semaine && c.item === item));
    majDemo(rdv.child_id, { ...e, coches: coche ? [...sans, { rdv_id: rdv.id, semaine, item, fait_par: MOI_DEMO, fait_le: new Date().toISOString() }] : sans });
    return;
  }
  const { error } = coche
    ? await supabase.from('rendez_vous_coches').insert({ rdv_id: rdv.id, semaine, item })
    : await supabase.from('rendez_vous_coches').delete().eq('rdv_id', rdv.id).eq('semaine', semaine).eq('item', item);
  // Déjà coché par un autre responsable entre-temps : l'état voulu est atteint.
  if (error && error.code !== '23505') throw erreurEcriture(error, 'La coche n’a pas pu être enregistrée. Réessayez.');
  signalerRendezVous(rdv.child_id);
}
