import { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScanLine } from 'lucide-react-native';
import NotesGraph from '../components/notes/NotesGraph';
import { SCREEN_BACKGROUND } from '../constants/colors';

type Trimestre = 'T1' | 'T2' | 'T3';
type MatiereId = 'maths' | 'francais' | 'anglais' | 'histoire' | 'svt';

const demoMatieres: { id: MatiereId; nom: string }[] = [
  { id: 'maths', nom: 'Mathématiques' },
  { id: 'francais', nom: 'Français' },
  { id: 'anglais', nom: 'Anglais' },
  { id: 'histoire', nom: 'Histoire-Géo' },
  { id: 'svt', nom: 'SVT' },
];

type Note = { id: string; intitule: string; date: string; coeff: number; valeur: number; matiereId: MatiereId; trimestre: Trimestre };

const demoNotes: Note[] = [
  { id: '1', matiereId: 'maths', trimestre: 'T2', intitule: "Géométrie dans l'espace", date: '12 mars', coeff: 2, valeur: 14 },
  { id: '2', matiereId: 'maths', trimestre: 'T2', intitule: 'Équations du 2nd degré', date: '28 fév.', coeff: 1, valeur: 15 },
  { id: '3', matiereId: 'maths', trimestre: 'T2', intitule: 'Statistiques', date: '14 fév.', coeff: 1, valeur: 11 },
  { id: '4', matiereId: 'anglais', trimestre: 'T2', intitule: 'Compréhension écrite', date: '6 mars', coeff: 1, valeur: 16 },
  { id: '5', matiereId: 'francais', trimestre: 'T2', intitule: 'Rédaction', date: '18 fév.', coeff: 1, valeur: 13 },
];

const graphByTrimestre: Record<Trimestre, { x: number; y: number }[]> = {
  T1: [
    { x: 1, y: 12.6 },
    { x: 2, y: 12.8 },
    { x: 3, y: 13.1 },
    { x: 4, y: 13.0 },
    { x: 5, y: 13.2 },
  ],
  T2: [
    { x: 1, y: 13.1 },
    { x: 2, y: 13.4 },
    { x: 3, y: 13.7 },
    { x: 4, y: 13.8 },
    { x: 5, y: 14.0 },
  ],
  T3: [
    { x: 1, y: 13.8 },
    { x: 2, y: 14.0 },
    { x: 3, y: 14.2 },
    { x: 4, y: 14.1 },
    { x: 5, y: 14.4 },
  ],
};

function NoteItem({ note }: { note: Note }) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(15,23,42,0.05)',
      }}
      activeOpacity={0.85}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Figtree_500Medium', fontSize: 12, color: '#0F172A' }} numberOfLines={2}>
          {note.intitule}
        </Text>
        <Text style={{ fontFamily: 'Figtree_400Regular', fontSize: 10, color: 'rgba(15,23,42,0.55)', marginTop: 1 }}>
          {note.date} · Coeff. {note.coeff}
        </Text>
      </View>
      <Text style={{ fontFamily: 'Figtree_900Black', fontSize: 16, color: '#0F172A' }}>
        {note.valeur}
        <Text style={{ fontFamily: 'Figtree_600SemiBold', fontSize: 10, color: 'rgba(15,23,42,0.55)' }}>/20</Text>
      </Text>
    </TouchableOpacity>
  );
}

export default function NotesScreen() {
  const insets = useSafeAreaInsets();

  const [activeTrimestre, setActiveTrimestre] = useState<Trimestre>('T2');
  const [activeMatiere, setActiveMatiere] = useState<MatiereId>('maths');

  const notesForSelection = useMemo(() => {
    return demoNotes.filter((n) => n.trimestre === activeTrimestre && n.matiereId === activeMatiere);
  }, [activeTrimestre, activeMatiere]);

  const moyenne = useMemo(() => {
    const all = demoNotes.filter((n) => n.trimestre === activeTrimestre);
    if (all.length === 0) return '0.0';
    const avg = all.reduce((s, n) => s + n.valeur, 0) / all.length;
    return (Math.round(avg * 10) / 10).toFixed(1);
  }, [activeTrimestre]);

  const lastNote = useMemo(() => {
    const all = demoNotes.filter((n) => n.trimestre === activeTrimestre);
    return all[0] ?? null;
  }, [activeTrimestre]);

  const pointFort = useMemo(() => {
    const all = demoNotes.filter((n) => n.trimestre === activeTrimestre);
    if (all.length === 0) return null;
    const byMat = new Map<MatiereId, number[]>();
    for (const n of all) {
      const arr = byMat.get(n.matiereId) ?? [];
      arr.push(n.valeur);
      byMat.set(n.matiereId, arr);
    }
    let best: { id: MatiereId; avg: number } | null = null;
    for (const [id, vals] of byMat.entries()) {
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      if (!best || avg > best.avg) best = { id, avg };
    }
    const nom = demoMatieres.find((m) => m.id === best!.id)?.nom ?? '';
    return { nom, avg: Math.round(best!.avg * 10) / 10 };
  }, [activeTrimestre]);

  return (
    <View style={{ flex: 1, backgroundColor: SCREEN_BACKGROUND }}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(15,23,42,0.05)',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {(['T1', 'T2', 'T3'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={{
                  height: 24,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  backgroundColor: activeTrimestre === t ? '#0F172A' : 'rgba(15,23,42,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => setActiveTrimestre(t)}
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    fontFamily: activeTrimestre === t ? 'Figtree_600SemiBold' : 'Figtree_500Medium',
                    fontSize: 10,
                    color: activeTrimestre === t ? '#FFFFFF' : 'rgba(15,23,42,0.45)',
                  }}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: 'rgba(15,23,42,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.85}
          >
            <ScanLine size={14} strokeWidth={2} color="rgba(15,23,42,0.55)" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
          <Text style={{ fontFamily: 'Figtree_900Black', fontSize: 38, letterSpacing: -2, lineHeight: 38 }}>
            {moyenne}
          </Text>
          <Text style={{ fontFamily: 'Figtree_700Bold', fontSize: 16, color: 'rgba(15,23,42,0.55)' }}>/20</Text>
          <View
            style={{
              height: 22,
              borderRadius: 999,
              paddingHorizontal: 8,
              backgroundColor: 'rgba(15,23,42,0.06)',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 4,
            }}
          >
            <Text style={{ fontFamily: 'Figtree_500Medium', fontSize: 10, color: 'rgba(15,23,42,0.55)' }}>
              ↗ +0.4 vs T1
            </Text>
          </View>
        </View>

        <NotesGraph data={graphByTrimestre[activeTrimestre]} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginTop: 8 }}>
        <View
          style={{
            flex: 1,
            borderRadius: 14,
            padding: 10,
            backgroundColor: SCREEN_BACKGROUND,
            borderWidth: 1,
            borderColor: 'rgba(15,23,42,0.05)',
          }}
        >
          <Text
            style={{
              fontFamily: 'Figtree_600SemiBold',
              fontSize: 7.5,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: 'rgba(15,23,42,0.55)',
              marginBottom: 3,
            }}
          >
            Dernière note
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
            <Text style={{ fontFamily: 'Figtree_900Black', fontSize: 18, letterSpacing: -0.8 }}>
              {lastNote?.valeur ?? '—'}
            </Text>
            <Text style={{ fontFamily: 'Figtree_600SemiBold', fontSize: 11, color: 'rgba(15,23,42,0.55)' }}>/20</Text>
          </View>
          <Text style={{ fontFamily: 'Figtree_400Regular', fontSize: 10, color: 'rgba(15,23,42,0.55)', marginTop: 1 }}>
            {lastNote ? `${lastNote.intitule} · ${lastNote.date}` : '—'}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            borderRadius: 14,
            padding: 10,
            backgroundColor: SCREEN_BACKGROUND,
            borderWidth: 1,
            borderColor: 'rgba(15,23,42,0.05)',
          }}
        >
          <Text
            style={{
              fontFamily: 'Figtree_600SemiBold',
              fontSize: 7.5,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: 'rgba(15,23,42,0.55)',
              marginBottom: 3,
            }}
          >
            Point fort
          </Text>
          <Text style={{ fontFamily: 'Figtree_700Bold', fontSize: 13, color: '#0F172A' }} numberOfLines={1}>
            {pointFort?.nom ?? '—'}
          </Text>
          <Text style={{ fontFamily: 'Figtree_900Black', fontSize: 18, color: '#0F172A', letterSpacing: -0.8 }}>
            {pointFort ? pointFort.avg.toFixed(1).replace(/\.0$/, '') : '—'}
            <Text style={{ fontFamily: 'Figtree_600SemiBold', fontSize: 11, color: 'rgba(15,23,42,0.55)' }}>/20</Text>
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 6, paddingVertical: 2 }}
        style={{ marginTop: 10 }}
      >
        {demoMatieres.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={{
              height: 28,
              borderRadius: 999,
              paddingHorizontal: 12,
              backgroundColor: activeMatiere === m.id ? '#0F172A' : 'rgba(15,23,42,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => setActiveMatiere(m.id)}
            activeOpacity={0.85}
          >
            <Text
              style={{
                fontFamily: activeMatiere === m.id ? 'Figtree_600SemiBold' : 'Figtree_500Medium',
                fontSize: 11,
                color: activeMatiere === m.id ? '#FFFFFF' : 'rgba(15,23,42,0.45)',
              }}
            >
              {m.nom}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1, marginTop: 6 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {notesForSelection.map((note) => (
          <NoteItem key={note.id} note={note} />
        ))}
        {notesForSelection.length === 0 ? (
          <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
            <Text style={{ fontFamily: 'Figtree_500Medium', fontSize: 12, color: 'rgba(15,23,42,0.55)' }}>
              Aucune note pour cette matière.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
