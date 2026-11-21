/**
 * SimpleMarkdown — lightweight Markdown renderer for React Native.
 *
 * Supports: **bold**, *italic*, ## headings, - bullet lists, numbered lists.
 * Numéros d'aide du protocole d'urgence (3114, 3018, 119, 112) : cliquables → appel (tel:).
 * No external dependencies — pure RN Text components.
 */

import { Fragment } from 'react';
import { Linking, type TextStyle } from 'react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text } from '../ui';

interface Props {
  children: string;
  baseStyle?: TextStyle;
}

const HELP_NUMBER_STYLE: TextStyle = {
  fontFamily: FontFamily.sansBold,
  color: '#4338CA',
  textDecorationLine: 'underline',
};

/**
 * Render inline formatting: **bold**, *italic*, and help numbers as tel: links
 */
function renderInline(text: string, baseStyle: TextStyle): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match **bold**, *italic*, or a help number (whole token only: pas « 1190 » ni « 3018,5 »)
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|(?<!\d|\d[,.])\b(3114|3018|119|112)\b(?![,.]?\d))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`t-${lastIndex}`} style={baseStyle}>
          {text.slice(lastIndex, match.index)}
        </Text>,
      );
    }

    if (match[2]) {
      // **bold**
      parts.push(
        <Text key={`b-${match.index}`} style={[baseStyle, { fontFamily: FontFamily.sansBold }]}>
          {match[2]}
        </Text>,
      );
    } else if (match[3]) {
      // *italic*
      parts.push(
        <Text key={`i-${match.index}`} style={[baseStyle, { fontStyle: 'italic' }]}>
          {match[3]}
        </Text>,
      );
    } else if (match[4]) {
      // Numéro d'aide → appel direct
      const number = match[4];
      parts.push(
        <Text
          key={`tel-${match.index}`}
          style={[baseStyle, HELP_NUMBER_STYLE]}
          onPress={() => Linking.openURL(`tel:${number}`)}
          accessibilityRole="link"
          accessibilityLabel={`Appeler le ${number}`}
        >
          {number}
        </Text>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(
      <Text key={`t-${lastIndex}`} style={baseStyle}>
        {text.slice(lastIndex)}
      </Text>,
    );
  }

  return parts.length > 0 ? parts : [<Text key="full" style={baseStyle}>{text}</Text>];
}

export default function SimpleMarkdown({ children, baseStyle = {} }: Props) {
  const lines = children.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ## Heading 2
    if (line.startsWith('## ')) {
      elements.push(
        <Text key={i} style={[baseStyle, { fontFamily: FontFamily.displayBold, fontSize: 16, marginTop: 8, marginBottom: 4 }]}>
          {renderInline(line.slice(3), { ...baseStyle, fontFamily: FontFamily.displayBold, fontSize: 16 })}
        </Text>,
      );
      continue;
    }

    // ### Heading 3
    if (line.startsWith('### ')) {
      elements.push(
        <Text key={i} style={[baseStyle, { fontFamily: FontFamily.displayBold, fontSize: 15, marginTop: 6, marginBottom: 2 }]}>
          {renderInline(line.slice(4), { ...baseStyle, fontFamily: FontFamily.displayBold, fontSize: 15 })}
        </Text>,
      );
      continue;
    }

    // - Bullet list
    if (/^[-*] /.test(line)) {
      elements.push(
        <Text key={i} style={[baseStyle, { marginLeft: 8, marginVertical: 1 }]}>
          {'  \u2022  '}
          {renderInline(line.slice(2), baseStyle)}
        </Text>,
      );
      continue;
    }

    // 1. Numbered list
    const numMatch = line.match(/^(\d+)\.\s/);
    if (numMatch) {
      elements.push(
        <Text key={i} style={[baseStyle, { marginLeft: 8, marginVertical: 1 }]}>
          {`  ${numMatch[1]}.  `}
          {renderInline(line.slice(numMatch[0].length), baseStyle)}
        </Text>,
      );
      continue;
    }

    // Empty line = spacing
    if (line.trim() === '') {
      elements.push(<Text key={i} style={{ height: 6 }}>{' '}</Text>);
      continue;
    }

    // Normal paragraph with inline formatting
    elements.push(
      <Text key={i} style={baseStyle}>
        {renderInline(line, baseStyle)}
      </Text>,
    );
  }

  return <Fragment>{elements}</Fragment>;
}
