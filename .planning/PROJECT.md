# Scolaria — Le copilote éducatif des familles

## Vision
Application mobile React Native pour les familles — suivi scolaire, communication avec les enseignants, et copilote IA (Aria) pour les parents.

## Stack
- React Native / Expo 55
- Supabase (Auth + BDD + Storage)
- NativeWind v4 / Gluestack UI v3
- TypeScript

## Principes non-négociables
- Design system "Premium Modern" (CLAUDE.md)
- Zéro fond blanc pur, zéro font système
- Aria ne diagnostique jamais — elle suggère et informe
- Confirmation obligatoire avant toute action Aria
- Un parent ne voit jamais les données d'un autre
- La signature des mots de liaison est réservée au parent

## Utilisateurs
- Parent principal (accès complet)
- Parent secondaire (accès configurable)
- Enfant maternelle/primaire (PIN, pas de compte autonome)
- Enfant collège/lycée (compte autonome)

## État actuel
- Navigation complète, 4 onglets, design system unifié
- EAS Build SUCCESS (Android APK)
- TypeScript: 0 erreurs
- Services existants: absenceService, liaisonService, messagerieStore, teacherService, ariaApi
