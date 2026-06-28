import type { Locator, Page } from '@playwright/test';

export type DragDropEntry = {
  path: string;
  content: string;
  mimeType?: string;
};

type TreeNode = {
  name: string;
  file?: { content: string; mimeType?: string };
  children?: Map<string, TreeNode>;
};

export type DragDropSession = {
  drop(): Promise<void>;
  dragLeave(): Promise<void>;
};

export async function dragDropEntries(
  page: Page,
  target: Locator,
  entries: DragDropEntry[],
): Promise<void> {
  const session = await startDragDropEntries(page, target, entries);

  await session.drop();
}

export async function startDragDropEntries(
  page: Page,
  target: Locator,
  entries: DragDropEntry[],
): Promise<DragDropSession> {
  const element = await target.elementHandle();

  if (!element) {
    throw new Error('Target element not found');
  }

  await page.evaluate(
    ({ element, entries }) => {
      const root = new Map<string, TreeNode>();

      // Build folder tree
      for (const entry of entries) {
        const parts = entry.path.split('/').filter(Boolean);
        let current = root;

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isLast = i === parts.length - 1;

          let node = current.get(part);

          if (!node) {
            node = {
              name: part,
              children: new Map(),
            };
            current.set(part, node);
          }

          if (isLast) {
            node.file = {
              content: entry.content,
              mimeType: entry.mimeType,
            };
          } else {
            node.children ??= new Map();
            current = node.children;
          }
        }
      }

      function buildEntry(node: TreeNode): any {
        if (node.children && node.children.size > 0) {
          const childEntries = Array.from(node.children.values()).map(
            buildEntry,
          );

          return {
            isFile: false,
            isDirectory: true,
            name: node.name,

            createReader: () => {
              let alreadyRead = false;

              return {
                readEntries: (callback: (entries: any[]) => void) => {
                  if (alreadyRead) {
                    callback([]);
                  } else {
                    alreadyRead = true;
                    callback(childEntries);
                  }
                },
              };
            },
          };
        }

        const file = new File([node.file?.content ?? ''], node.name, {
          type: node.file?.mimeType ?? 'text/plain',
        });

        return {
          isFile: true,
          isDirectory: false,
          name: node.name,
          file: (callback: (file: File) => void) => callback(file),
        };
      }

      const rootEntries = Array.from(root.values()).map(buildEntry);

      const allFiles = entries.map((entry) => {
        const name = entry.path.split('/').pop()!;

        return new File([entry.content], name, {
          type: entry.mimeType ?? 'text/plain',
        });
      });

      const dataTransfer = {
        types: ['Files'],
        files: allFiles,
        items: rootEntries.map((entry) => ({
          kind: 'file',
          type: 'application/octet-stream',

          getAsFile: () =>
            new File([''], entry.name, {
              type: 'application/octet-stream',
            }),

          webkitGetAsEntry: () => entry,
        })),
      };

      // Store DataTransfer on window so subsequent evaluate calls
      // can reuse the same drag operation.
      (window as any).__playwrightDragDataTransfer = dataTransfer;

      function dispatch(type: string) {
        const event = new DragEvent(type, {
          bubbles: true,
          cancelable: true,
        });

        Object.defineProperty(event, 'dataTransfer', {
          configurable: true,
          value: dataTransfer,
        });

        element.dispatchEvent(event);
      }

      dispatch('dragenter');
      dispatch('dragover');
    },
    { element, entries },
  );

  return {
    async drop(): Promise<void> {
      await page.evaluate((element) => {
        const dataTransfer = (window as any).__playwrightDragDataTransfer;

        const event = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
        });

        Object.defineProperty(event, 'dataTransfer', {
          configurable: true,
          value: dataTransfer,
        });

        element.dispatchEvent(event);
      }, element);
    },

    async dragLeave(): Promise<void> {
      await page.evaluate((element) => {
        const dataTransfer = (window as any).__playwrightDragDataTransfer;

        const event = new DragEvent('dragleave', {
          bubbles: true,
          cancelable: true,
        });

        Object.defineProperty(event, 'dataTransfer', {
          configurable: true,
          value: dataTransfer,
        });

        element.dispatchEvent(event);
      }, element);
    },
  };
}
