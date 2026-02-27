export function generateUniqueDirName(currentNames: Set<string>): string {
  let dirName = 'New folder';
  let counter = 0;
  while (currentNames.has(dirName)) {
    dirName = `New folder (${++counter})`;
  }
  return dirName;
}
