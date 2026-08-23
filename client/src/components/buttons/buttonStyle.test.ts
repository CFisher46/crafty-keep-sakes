import fs from 'fs';
import path from 'path';

const srcRoot = path.resolve(__dirname, '../..');

const getTsxFiles = (directory: string): string[] => {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return getTsxFiles(fullPath);
    }

    return entry.name.endsWith('.tsx') ? [fullPath] : [];
  });
};

const getButtonTags = (content: string) => {
  const tags: string[] = [];
  let searchIndex = 0;

  while (searchIndex < content.length) {
    const startIndex = content.indexOf('<Button', searchIndex);
    if (startIndex === -1) {
      break;
    }

    let index = startIndex + 7;
    let depthParen = 0;
    let depthBrace = 0;
    let depthBracket = 0;
    let quote: string | null = null;

    while (index < content.length) {
      const ch = content[index];

      if (quote) {
        if (ch === quote && content[index - 1] !== '\\') {
          quote = null;
        }
        index += 1;
        continue;
      }

      if (ch === '"' || ch === "'") {
        quote = ch;
        index += 1;
        continue;
      }

      if (ch === '(') depthParen += 1;
      else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
      else if (ch === '{') depthBrace += 1;
      else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
      else if (ch === '[') depthBracket += 1;
      else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);
      else if (ch === '>' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
        tags.push(content.slice(startIndex, index + 1));
        searchIndex = index + 1;
        break;
      }

      index += 1;
    }

    if (index >= content.length) {
      break;
    }
  }

  return tags;
};

const shouldSkipFile = (relativePath: string) =>
  relativePath.includes('test_integrations') ||
  relativePath.includes('.test.') ||
  relativePath.endsWith('.test.tsx');

describe('button styling guard', () => {
  it('uses the shared custom style for app action buttons', () => {
    const offenders: string[] = [];
    const files = getTsxFiles(srcRoot).filter((file) => !shouldSkipFile(path.relative(srcRoot, file)));

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const buttonTags = getButtonTags(content);

      for (const tag of buttonTags) {
        const attributes = tag.replace(/\s+/g, ' ');
        const hasCustomStyle =
          attributes.includes('buttonStyles.default') ||
          attributes.includes('buttonStyles.activeButtons');
        const hasPlainIconButton = /\bplain\b/.test(attributes) || /\bicon\s*=/.test(attributes);
        const hasLabel = /\blabel\s*=/.test(attributes) || /<Button\b[^>]*>\s*[^<]+/.test(tag);

        if (hasLabel && !hasPlainIconButton && !hasCustomStyle) {
          offenders.push(`${path.relative(srcRoot, file)}: ${tag.slice(0, 120)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
