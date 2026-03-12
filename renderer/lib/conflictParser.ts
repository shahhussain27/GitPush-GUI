export interface ConflictBlock {
  id: string;
  isConflict: true;
  currentContent: string;
  incomingContent: string;
  currentLabel: string;
  incomingLabel: string;
}

export interface TextBlock {
  id: string;
  isConflict: false;
  content: string;
}

export type ParsedConflictElement = ConflictBlock | TextBlock;

export function parseConflictFile(content: string): ParsedConflictElement[] {
  const elements: ParsedConflictElement[] = [];
  const lines = content.split('\n');

  let inConflict = false;
  let inCurrent = false;
  let inIncoming = false;

  let currentText = [];
  let currentLabel = '';
  
  let incomingText = [];
  let incomingLabel = '';

  let regularText = [];

  const flushRegularText = () => {
    if (regularText.length > 0) {
      elements.push({
        id: crypto.randomUUID(),
        isConflict: false,
        content: regularText.join('\n')
      });
      regularText = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('<<<<<<< ')) {
      flushRegularText();
      inConflict = true;
      inCurrent = true;
      inIncoming = false;
      currentLabel = line.substring(8).trim();
      currentText = [];
      incomingText = [];
      incomingLabel = '';
      continue;
    }

    if (line.startsWith('=======')) {
      if (inConflict) {
        inCurrent = false;
        inIncoming = true;
        continue;
      }
    }

    if (line.startsWith('>>>>>>> ')) {
      if (inConflict) {
        incomingLabel = line.substring(8).trim();
        inIncoming = false;
        inConflict = false;

        elements.push({
          id: crypto.randomUUID(),
          isConflict: true,
          currentContent: currentText.join('\n'),
          incomingContent: incomingText.join('\n'),
          currentLabel,
          incomingLabel
        });

        currentText = [];
        incomingText = [];
      }
      continue;
    }

    if (inConflict) {
      if (inCurrent) {
        currentText.push(line);
      } else if (inIncoming) {
        incomingText.push(line);
      }
    } else {
      regularText.push(line);
    }
  }

  flushRegularText();

  return elements;
}
