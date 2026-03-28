/**
 * PDF Export Service — Generates a beautiful "Passeport Scolaire" PDF
 * using expo-print and expo-sharing.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

// ─── Types ─────────────────────────────────────────────

interface ChildData {
  name: string;
  avatar: string;
  classe: string;
  scolariaId: string;
  age: number;
  superPower: string;
  superPowerEmoji: string;
  superPowerDescription: string;
}

interface Competence {
  label: string;
  value: number;
  emoji: string;
}

interface Activity {
  name: string;
  emoji: string;
  category: string;
  level: string;
  progressPercent: number;
  since: string;
}

interface JoyDay {
  day: number;
  score: number;
}

export interface PDFExportData {
  child: ChildData;
  competences: Competence[];
  activities: Activity[];
  joyHistory: JoyDay[];
  generatedDate: string;
}

// ─── HTML Template ──────────────────────────────────────

function generateHTML(data: PDFExportData): string {
  const { child, competences, activities, joyHistory } = data;

  const avgJoy = joyHistory.length > 0
    ? (joyHistory.reduce((s, d) => s + d.score, 0) / joyHistory.length).toFixed(1)
    : '—';

  const recentJoy = joyHistory.length >= 7
    ? (joyHistory.slice(-7).reduce((s, d) => s + d.score, 0) / 7).toFixed(1)
    : avgJoy;

  const compBars = competences.map(c => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <span style="font-size:20px;width:30px;">${c.emoji}</span>
      <span style="flex:1;font-weight:600;color:#37352F;font-size:13px;">${c.label}</span>
      <div style="width:120px;height:8px;background:#E8E5E0;border-radius:4px;overflow:hidden;">
        <div style="width:${c.value * 10}%;height:100%;background:linear-gradient(to right,#6D28D9,#22D3EE);border-radius:4px;"></div>
      </div>
      <span style="font-weight:800;color:#37352F;font-size:14px;width:30px;text-align:right;">${c.value}/10</span>
    </div>
  `).join('');

  const actRows = activities.map(a => `
    <tr>
      <td style="padding:10px 12px;font-size:18px;">${a.emoji}</td>
      <td style="padding:10px 12px;font-weight:600;color:#37352F;">${a.name}</td>
      <td style="padding:10px 12px;color:#787774;">${a.category}</td>
      <td style="padding:10px 12px;color:#37352F;font-weight:600;">${a.level}</td>
      <td style="padding:10px 12px;">
        <div style="width:80px;height:6px;background:#E8E5E0;border-radius:3px;overflow:hidden;">
          <div style="width:${a.progressPercent}%;height:100%;background:#6D28D9;border-radius:3px;"></div>
        </div>
      </td>
      <td style="padding:10px 12px;color:#787774;font-size:12px;">Depuis ${a.since}</td>
    </tr>
  `).join('');

  const joySparkline = joyHistory.slice(-30).map((d, i) => {
    const h = d.score * 8;
    const color = d.score >= 7 ? '#0F7B6C' : d.score >= 5 ? '#D9730D' : '#EB5757';
    return `<div style="flex:1;display:flex;align-items:flex-end;height:80px;">
      <div style="width:100%;height:${h}px;background:${color};border-radius:2px;min-height:3px;"></div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 40px; size: A4; }
    body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #37352F; margin: 0; padding: 0; }
    .header { background: linear-gradient(135deg, #6D28D9 0%, #22D3EE 100%); padding: 40px; border-radius: 0 0 24px 24px; color: white; text-align: center; }
    .header h1 { font-size: 28px; margin: 0 0 4px 0; font-weight: 900; }
    .header .subtitle { opacity: 0.8; font-size: 14px; }
    .header .avatar { font-size: 56px; margin-bottom: 12px; }
    .header .id-badge { display: inline-block; background: rgba(0,0,0,0.2); padding: 6px 16px; border-radius: 20px; font-family: monospace; font-size: 12px; margin-top: 12px; letter-spacing: 1px; }
    .body { padding: 30px 40px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 16px; font-weight: 700; color: #37352F; margin-bottom: 14px; border-bottom: 2px solid #E8E5E0; padding-bottom: 6px; }
    .superpower { background: linear-gradient(135deg, #F3E5F7 0%, #E8F0FE 100%); border-radius: 16px; padding: 20px; display: flex; gap: 16px; align-items: center; border: 1px solid #E8E5E0; }
    .superpower .emoji { font-size: 40px; }
    .superpower .info h3 { margin: 0 0 4px 0; font-size: 18px; color: #6D28D9; }
    .superpower .info p { margin: 0; font-size: 13px; color: #787774; line-height: 1.5; }
    .stats-grid { display: flex; gap: 12px; }
    .stat-card { flex: 1; background: #F7F7F5; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #E8E5E0; }
    .stat-value { font-size: 28px; font-weight: 800; color: #37352F; }
    .stat-label { font-size: 11px; color: #787774; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    table thead th { text-align: left; padding: 8px 12px; font-size: 11px; color: #787774; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E8E5E0; }
    table tbody tr { border-bottom: 1px solid #F0EEED; }
    .joy-chart { display: flex; gap: 2px; align-items: flex-end; height: 80px; padding: 8px 0; }
    .footer { text-align: center; padding: 20px 40px; color: #B4B0AC; font-size: 11px; border-top: 1px solid #E8E5E0; margin-top: 10px; }
    .footer .logo { font-size: 14px; font-weight: 800; color: #6D28D9; }
  </style>
</head>
<body>
  <div class="header">
    <div class="avatar">${child.avatar}</div>
    <h1>${child.name}</h1>
    <div class="subtitle">${child.classe} • ${child.age} ans</div>
    <div class="id-badge">${child.scolariaId}</div>
  </div>

  <div class="body">
    <!-- Superpower -->
    <div class="section">
      <div class="section-title">Super-pouvoir</div>
      <div class="superpower">
        <div class="emoji">${child.superPowerEmoji}</div>
        <div class="info">
          <h3>${child.superPower}</h3>
          <p>${child.superPowerDescription}</p>
        </div>
      </div>
    </div>

    <!-- Stats overview -->
    <div class="section">
      <div class="section-title">Vue d'ensemble</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${avgJoy}</div>
          <div class="stat-label">Score de Joie moyen</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${recentJoy}</div>
          <div class="stat-label">7 derniers jours</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${competences.length}</div>
          <div class="stat-label">Compétences évaluées</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${activities.length}</div>
          <div class="stat-label">Activités</div>
        </div>
      </div>
    </div>

    <!-- Competences -->
    <div class="section">
      <div class="section-title">Compétences</div>
      ${compBars}
    </div>

    <!-- Joy History -->
    <div class="section">
      <div class="section-title">Historique du Score de Joie (30 jours)</div>
      <div class="joy-chart">${joySparkline}</div>
    </div>

    <!-- Portfolio -->
    <div class="section">
      <div class="section-title">Portfolio d'activités</div>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Activité</th>
            <th>Catégorie</th>
            <th>Niveau</th>
            <th>Progression</th>
            <th>Depuis</th>
          </tr>
        </thead>
        <tbody>${actRows}</tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    <div class="logo">Scolaria</div>
    <div>Passeport scolaire numérique — Généré le ${data.generatedDate}</div>
    <div style="margin-top:4px;">Ce document est confidentiel et protégé par le RGPD.</div>
  </div>
</body>
</html>`;
}

// ─── Export function ──────────────────────────────────────

export async function exportProfilePDF(data: PDFExportData): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const html = generateHTML(data);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Passeport scolaire — ${data.child.name}`,
        UTI: 'com.adobe.pdf',
      });
    } else if (Platform.OS === 'web') {
      // On web, open in new tab
      window.open(uri, '_blank');
    }

    return { success: true, uri };
  } catch (error: any) {
    console.error('PDF export error:', error);
    return { success: false, error: error.message || 'Erreur lors de l\'export' };
  }
}

// ─── Memo de bienvenue (transition scolaire) ─────────────

export interface TransitionMemoData {
  child: ChildData;
  competences: Competence[];
  activities: Activity[];
  joyAverage: number;
  fromSchool: string;
  toSchool: string;
  teacherName: string;
  personalNote?: string;
}

function generateMemoHTML(data: TransitionMemoData): string {
  const { child, competences, activities, fromSchool, toSchool, teacherName, personalNote, joyAverage } = data;

  const topComps = [...competences].sort((a, b) => b.value - a.value).slice(0, 3);
  const compList = topComps.map(c => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#F7F7F5;border-radius:10px;margin-bottom:6px;">
      <span style="font-size:22px;">${c.emoji}</span>
      <div style="flex:1;">
        <div style="font-weight:700;color:#37352F;font-size:14px;">${c.label}</div>
        <div style="font-size:12px;color:#787774;">Niveau ${c.value}/10</div>
      </div>
      <div style="display:flex;gap:2px;">
        ${Array.from({ length: 10 }, (_, i) => `<div style="width:8px;height:8px;border-radius:4px;background:${i < c.value ? '#6D28D9' : '#E8E5E0'};"></div>`).join('')}
      </div>
    </div>
  `).join('');

  const actList = activities.slice(0, 4).map(a => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F0EEED;">
      <span style="font-size:20px;">${a.emoji}</span>
      <span style="font-weight:600;color:#37352F;flex:1;">${a.name}</span>
      <span style="font-size:12px;color:#787774;background:#F7F7F5;padding:3px 10px;border-radius:8px;">${a.level}</span>
    </div>
  `).join('');

  const joyEmoji = joyAverage >= 7 ? '☀️' : joyAverage >= 5 ? '⛅' : '🌧️';
  const joyLabel = joyAverage >= 7 ? 'Épanoui' : joyAverage >= 5 ? 'Correct' : 'Attention';
  const joyColor = joyAverage >= 7 ? '#0F7B6C' : joyAverage >= 5 ? '#D9730D' : '#EB5757';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 40px; size: A4; }
    body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #37352F; margin: 0; }
    .banner { background: linear-gradient(135deg, #22D3EE 0%, #6D28D9 100%); padding: 30px 40px; color: white; display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 20px 20px; }
    .banner-left h1 { font-size: 22px; margin: 0; font-weight: 900; }
    .banner-left p { margin: 4px 0 0 0; opacity: 0.8; font-size: 13px; }
    .banner-right { text-align: right; }
    .banner-right .avatar { font-size: 48px; }
    .banner-right .name { font-weight: 800; font-size: 18px; }
    .body { padding: 28px 40px; }
    .intro { background: #F3E5F7; border-radius: 14px; padding: 18px; margin-bottom: 24px; border-left: 4px solid #6D28D9; }
    .intro p { margin: 0; font-size: 14px; line-height: 1.6; color: #37352F; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #37352F; display: flex; align-items: center; gap: 8px; }
    .joy-card { display: flex; align-items: center; gap: 16px; background: #F7F7F5; border-radius: 14px; padding: 16px 20px; border: 1px solid #E8E5E0; }
    .joy-emoji { font-size: 36px; }
    .joy-score { font-size: 32px; font-weight: 800; }
    .joy-label { font-size: 13px; color: #787774; }
    .note-box { background: #FFF8E1; border-radius: 14px; padding: 18px; border-left: 4px solid #D9730D; }
    .note-box p { margin: 0; font-size: 13px; line-height: 1.6; color: #37352F; font-style: italic; }
    .footer { text-align: center; padding: 20px 40px; color: #B4B0AC; font-size: 11px; border-top: 1px solid #E8E5E0; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="banner">
    <div class="banner-left">
      <h1>📋 Mémo de bienvenue</h1>
      <p>Transition scolaire ${fromSchool} → ${toSchool}</p>
    </div>
    <div class="banner-right">
      <div class="avatar">${child.avatar}</div>
      <div class="name">${child.name}</div>
    </div>
  </div>

  <div class="body">
    <div class="intro">
      <p>
        Ce mémo accompagne <strong>${child.name}</strong> dans sa transition de
        <strong>${fromSchool}</strong> vers <strong>${toSchool}</strong>.
        Il présente un aperçu de son parcours, ses points forts et son bien-être
        pour faciliter son accueil dans sa nouvelle classe.
      </p>
    </div>

    <!-- Bien-être -->
    <div class="section">
      <div class="section-title">🌤️ Bien-être général</div>
      <div class="joy-card">
        <div class="joy-emoji">${joyEmoji}</div>
        <div>
          <div class="joy-score" style="color:${joyColor};">${joyAverage.toFixed(1)}<span style="font-size:16px;color:#787774;">/10</span></div>
          <div class="joy-label">${joyLabel} — Score de Joie moyen sur 30 jours</div>
        </div>
      </div>
    </div>

    <!-- Points forts -->
    <div class="section">
      <div class="section-title">⭐ Points forts (Top 3)</div>
      ${compList}
    </div>

    <!-- Activités -->
    <div class="section">
      <div class="section-title">🎯 Activités extra-scolaires</div>
      ${actList}
    </div>

    <!-- Super-pouvoir -->
    <div class="section">
      <div class="section-title">${child.superPowerEmoji} Super-pouvoir identifié</div>
      <div style="background:#E8F0FE;border-radius:14px;padding:16px;border:1px solid #B8D4FE;">
        <div style="font-size:18px;font-weight:800;color:#2383E2;margin-bottom:4px;">${child.superPower}</div>
        <div style="font-size:13px;color:#37352F;line-height:1.5;">${child.superPowerDescription}</div>
      </div>
    </div>

    ${personalNote ? `
    <div class="section">
      <div class="section-title">✍️ Note de l'enseignant</div>
      <div class="note-box">
        <p>${personalNote}</p>
        <p style="margin-top:8px;font-style:normal;color:#787774;">— ${teacherName}</p>
      </div>
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <div style="font-size:14px;font-weight:800;color:#6D28D9;">Scolaria</div>
    <div>Passeport scolaire numérique — Document de transition</div>
    <div style="margin-top:4px;">Confidentiel — Transmis avec le consentement de la famille.</div>
  </div>
</body>
</html>`;
}

export async function exportTransitionMemo(data: TransitionMemoData): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const html = generateMemoHTML(data);

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Mémo de bienvenue — ${data.child.name}`,
        UTI: 'com.adobe.pdf',
      });
    } else if (Platform.OS === 'web') {
      window.open(uri, '_blank');
    }

    return { success: true, uri };
  } catch (error: any) {
    console.error('Memo export error:', error);
    return { success: false, error: error.message || 'Erreur lors de l\'export' };
  }
}
