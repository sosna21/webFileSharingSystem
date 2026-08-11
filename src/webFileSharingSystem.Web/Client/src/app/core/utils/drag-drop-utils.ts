export class DragDropUtils {
  static isTrueDragLeave(event: DragEvent): boolean {
    const current = event.currentTarget as HTMLElement;
    const related = event.relatedTarget as HTMLElement | null;
    return !related || !current.contains(related);
  }

  static preventAndStop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }
}
