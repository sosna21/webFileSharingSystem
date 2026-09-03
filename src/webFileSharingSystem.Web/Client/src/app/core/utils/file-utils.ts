export function generateUniqueDirName(currentNames: Set<string>): string {
  const baseName = $localize`New folder`;
  let dirName = baseName;
  let counter = 0;
  while (currentNames.has(dirName)) {
    dirName = `${baseName} (${++counter})`;
  }
  return dirName;
}
