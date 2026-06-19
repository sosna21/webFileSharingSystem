import path from 'path';

export function getUniqueName(existing: Set<string>, fileName: string): string {
  if (!existing.has(fileName)) {
    return fileName;
  }

  const parsed = path.parse(fileName);
  let counter = 1;
  let candidate = '';

  do {
    candidate = `${parsed.name} (${counter})${parsed.ext}`;
    counter += 1;
  } while (existing.has(candidate));

  return candidate;
}
