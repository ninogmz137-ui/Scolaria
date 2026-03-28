import { Box, Text, HStack } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import type { AcademicYearStatut } from '../../services/database';

interface Props {
  anneeScolaire: string;
  statut: AcademicYearStatut;
}

export default function ArchiveBanner({ anneeScolaire, statut }: Props) {
  const isImported = statut === 'importée';

  return (
    <HStack
      className="items-center gap-2 mx-5 mb-4 px-3.5 py-2.5 rounded-xl"
      style={{
        backgroundColor: isImported ? Colors.cyan + '08' : 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: isImported ? Colors.cyan + '20' : 'rgba(255,255,255,0.08)',
      }}
    >
      <Ionicons
        name={isImported ? 'cloud-download-outline' : 'archive-outline'}
        size={16}
        color={isImported ? Colors.cyan : Colors.gray}
      />
      <Text
        className="flex-1 text-[13px] font-bold"
        style={{ color: isImported ? Colors.cyan : Colors.gray }}
      >
        {isImported ? 'Importée' : 'Archive'} · {anneeScolaire}
      </Text>
      <HStack
        className="items-center gap-1 px-2 py-0.5 rounded-lg"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      >
        <Ionicons name="lock-closed" size={10} color={Colors.gray} />
        <Text className="text-[10px] font-semibold" style={{ color: Colors.gray }}>
          Lecture seule
        </Text>
      </HStack>
    </HStack>
  );
}
