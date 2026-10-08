/**
 * PastilleCategorie — pastille teintée + icône lucide (COMPONENTS §18.1).
 * Sert uniquement à CLASSER (discipline, type de contenu, institution) : jamais à évaluer.
 * Décorative : masquée aux lecteurs d'écran (le texte voisin porte le sens).
 */

import { View } from 'react-native';
import {
  Activity, Backpack, BookOpen, Building2, Compass, FileText, Image as ImageIcone, Languages, MessageCircle,
  Palette, Pencil, Scale, Shapes,
} from 'lucide-react-native';
import { TEINTES, type Categorie, type IconeCategorie } from '../theme/categories';

const ICONES: Record<IconeCategorie, typeof Pencil> = {
  'message-circle': MessageCircle,
  shapes: Shapes,
  compass: Compass,
  scale: Scale,
  languages: Languages,
  palette: Palette,
  activity: Activity,
  'book-open': BookOpen,
  pencil: Pencil,
  image: ImageIcone,
  'file-text': FileText,
  backpack: Backpack,
  'building-2': Building2,
};

export default function PastilleCategorie({
  categorie,
  taille = 38,
  rayon = 12,
  tailleIcone = 20,
}: {
  categorie: Categorie;
  taille?: number;
  rayon?: number;
  tailleIcone?: number;
}) {
  const teinte = TEINTES[categorie.teinte];
  const Icone = ICONES[categorie.icone];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: taille,
        height: taille,
        borderRadius: rayon,
        backgroundColor: teinte.fond,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icone size={tailleIcone} strokeWidth={2} color={teinte.icone} />
    </View>
  );
}
