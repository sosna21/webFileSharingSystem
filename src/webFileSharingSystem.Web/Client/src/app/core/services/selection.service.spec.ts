import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SelectionService } from './selection.service';

describe('SelectionService touch interactions', () => {
  let service: SelectionService<{ id: number }>;

  const createPointerEvent = (
    type: string,
    overrides: Partial<PointerEvent> = {},
  ) =>
    Object.assign(new Event(type, { bubbles: true }), {
      pointerId: 0,
      pointerType: 'mouse',
      clientX: 0,
      clientY: 0,
      button: 0,
      ...overrides,
    }) as PointerEvent;

  const doTouchPress = (fileId: number, pointerId: number) => {
    service.handleFilePointerDown(
      createPointerEvent('pointerdown', {
        pointerType: 'touch',
        pointerId,
        button: 0,
        clientX: 10,
        clientY: 10,
      }),
      { id: fileId },
    );
  };

  const doTouchMove = (fileId: number, pointerId: number) => {
    service.handlePointerMove(
      createPointerEvent('pointermove', {
        pointerType: 'touch',
        pointerId,
        button: 0,
        clientX: fileId * 10,
        clientY: fileId * 10,
      }),
      fileId,
    );
  };

  const selectedIds = () => [...service.selectedIds()].sort((a, b) => a - b);

  const doTouchRelease = (pointerId: number) => {
    service.handlePointerUp(
      createPointerEvent('pointerup', {
        pointerType: 'touch',
        pointerId,
        button: 0,
        clientX: 10,
        clientY: 10,
      }),
    );
  };

  const doTouchClick = (fileId: number) => {
    service.handleClick(
      { id: fileId },
      Object.assign(new Event('click', { bubbles: true }), {
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      }) as MouseEvent,
    );
  };

  beforeEach(() => {
    vi.useFakeTimers();
    service = new SelectionService();
    service.init(
      signal([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
        { id: 5 },
        { id: 6 },
      ]),
    );
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('uses pointer type to choose the interaction mode', () => {
    expect(
      service.getSelectionMode(
        createPointerEvent('pointerdown', {
          pointerType: 'mouse',
          pointerId: 10,
          button: 0,
        }),
      ),
    ).toBe('pointer');

    expect(
      service.getSelectionMode(
        createPointerEvent('pointerdown', {
          pointerType: 'touch',
          pointerId: 11,
          button: 0,
        }),
      ),
    ).toBe('touch');

    expect(
      service.getSelectionMode(
        createPointerEvent('pointerdown', {
          pointerType: 'pen',
          pointerId: 12,
          button: 0,
        }),
      ),
    ).toBe('touch');
  });

  it('long press A produces [A]', () => {
    doTouchPress(1, 20);
    vi.advanceTimersByTime(501);
    expect(service.selectedIds()).toEqual(new Set([1]));
  });

  it('exposes the touch multi-selection state while it is active', () => {
    expect(service.isTouchMultiSelectionActive()).toBe(false);

    doTouchPress(1, 20);
    vi.advanceTimersByTime(501);
    expect(service.isTouchMultiSelectionActive()).toBe(true);

    doTouchRelease(20);
    service.clear();
    expect(service.isTouchMultiSelectionActive()).toBe(false);
  });

  it('long press A then short tap B adds B to the current selection', () => {
    doTouchPress(1, 20);
    vi.advanceTimersByTime(501);
    doTouchRelease(20);
    doTouchPress(2, 21);
    doTouchRelease(21);
    doTouchClick(2);

    expect(service.selectedIds()).toEqual(new Set([1, 2]));
  });

  it('long press A then taps B and C to build a multi-selection', () => {
    doTouchPress(1, 20);
    vi.advanceTimersByTime(501);
    doTouchRelease(20);

    doTouchPress(2, 21);
    doTouchRelease(21);
    doTouchClick(2);

    doTouchPress(3, 22);
    doTouchRelease(22);
    doTouchClick(3);

    expect(service.selectedIds()).toEqual(new Set([1, 2, 3]));
  });

  it('toggling a selected item off keeps the touch multi-selection active', () => {
    doTouchPress(1, 20);
    vi.advanceTimersByTime(501);
    doTouchRelease(20);

    doTouchPress(2, 21);
    doTouchRelease(21);
    doTouchClick(2);

    doTouchPress(2, 22);
    doTouchRelease(22);
    doTouchClick(2);

    expect(service.selectedIds()).toEqual(new Set([1]));
  });

  it('short tap before multi-selection remains exclusive', () => {
    doTouchPress(1, 20);
    doTouchRelease(20);
    doTouchClick(1);

    expect(service.selectedIds()).toEqual(new Set([1]));
  });

  it('empty-space tap clears selection and exits touch multi-selection', () => {
    doTouchPress(1, 20);
    vi.advanceTimersByTime(501);
    doTouchRelease(20);
    service.clear();

    doTouchPress(2, 21);
    doTouchRelease(21);
    doTouchClick(2);

    expect(service.selectedIds()).toEqual(new Set([2]));
  });

  it('mouse click behavior remains exclusive', () => {
    service.selectedIds.set(new Set([1]));

    service.handleClick(
      { id: 2 },
      Object.assign(new Event('click', { bubbles: true }), {
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      }) as MouseEvent,
    );

    expect(service.selectedIds()).toEqual(new Set([2]));
  });

  it('supports mouse Ctrl toggling and Shift range selection', () => {
    service.handleClick(
      { id: 2 },
      Object.assign(new Event('click'), {
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      }) as MouseEvent,
    );
    service.handleClick(
      { id: 5 },
      Object.assign(new Event('click'), {
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      }) as MouseEvent,
    );
    expect(selectedIds()).toEqual([2, 5]);

    service.handleClick(
      { id: 2 },
      Object.assign(new Event('click'), {
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      }) as MouseEvent,
    );
    service.handleClick(
      { id: 4 },
      Object.assign(new Event('click'), {
        ctrlKey: false,
        metaKey: false,
        shiftKey: true,
      }) as MouseEvent,
    );
    expect(selectedIds()).toEqual([2, 3, 4]);
  });

  it('clears a selection', () => {
    service.selectedIds.set(new Set([1, 2]));

    service.clear();

    expect(selectedIds()).toEqual([]);
  });

  it('toggles a selected touch file off while multi-selection is active', () => {
    service.selectedIds.set(new Set([1, 2]));
    doTouchPress(1, 20);
    vi.advanceTimersByTime(501);
    expect(selectedIds()).toEqual([2]);
    doTouchRelease(20);

    doTouchPress(2, 21);
    doTouchRelease(21);
    doTouchClick(2);

    expect(selectedIds()).toEqual([]);
    expect(service.isTouchMultiSelectionActive()).toBe(true);
  });

  it('rebuilds an additive range from the original selection when moving backward', () => {
    service.selectedIds.set(new Set([1, 6]));

    doTouchPress(3, 20);
    vi.advanceTimersByTime(501);
    expect(selectedIds()).toEqual([1, 3, 6]);

    doTouchMove(5, 20);
    expect(selectedIds()).toEqual([1, 3, 4, 5, 6]);

    doTouchMove(4, 20);
    expect(selectedIds()).toEqual([1, 3, 4, 6]);

    doTouchMove(2, 20);
    expect(selectedIds()).toEqual([1, 2, 3, 6]);
  });

  it('rebuilds a subtractive range from the original selection when moving backward', () => {
    service.selectedIds.set(new Set([1, 2, 3, 4, 5, 6]));

    doTouchPress(3, 20);
    vi.advanceTimersByTime(501);
    expect(selectedIds()).toEqual([1, 2, 4, 5, 6]);

    doTouchMove(5, 20);
    expect(selectedIds()).toEqual([1, 2, 6]);

    doTouchMove(4, 20);
    expect(selectedIds()).toEqual([1, 2, 5, 6]);

    doTouchMove(2, 20);
    expect(selectedIds()).toEqual([1, 4, 5, 6]);
  });

  it('supports additive ranges from the first and last file', () => {
    doTouchPress(1, 20);
    vi.advanceTimersByTime(501);
    doTouchMove(3, 20);
    expect(selectedIds()).toEqual([1, 2, 3]);
    doTouchRelease(20);

    service.clear();
    doTouchPress(3, 21);
    vi.advanceTimersByTime(501);
    service.selectedIds.set(new Set([3]));
    doTouchMove(1, 21);
    expect(selectedIds()).toEqual([1, 2, 3]);
  });

  it('keeps the anchor-only subtractive range empty at activation', () => {
    service.selectedIds.set(new Set([2]));

    doTouchPress(2, 20);
    vi.advanceTimersByTime(501);

    expect(selectedIds()).toEqual([]);
  });

  it('does not change the additive range when the endpoint remains on the anchor', () => {
    service.selectedIds.set(new Set([1, 6]));
    doTouchPress(3, 20);
    vi.advanceTimersByTime(501);
    doTouchMove(3, 20);

    expect(selectedIds()).toEqual([1, 3, 6]);
  });

  it('can select all files and clear them without a touch gesture', () => {
    service.toggleAll(true);
    expect(selectedIds()).toEqual([1, 2, 3, 4, 5, 6]);

    service.toggleAll(false);
    expect(selectedIds()).toEqual([]);
    service.clear();
    expect(service.isTouchMultiSelectionActive()).toBe(false);
  });

  it('preserves the resulting selection when a range gesture ends', () => {
    service.selectedIds.set(new Set([1]));
    doTouchPress(2, 20);
    vi.advanceTimersByTime(501);
    doTouchMove(4, 20);
    doTouchRelease(20);

    expect(selectedIds()).toEqual([1, 2, 3, 4]);
  });

  it('keeps persistent touch multi-selection active when a range gesture is cancelled', () => {
    doTouchPress(2, 20);
    vi.advanceTimersByTime(501);
    doTouchMove(3, 20);

    service.handlePointerCancel(
      createPointerEvent('pointercancel', {
        pointerType: 'touch',
        pointerId: 20,
        button: 0,
      }),
    );

    expect(service.isTouchMultiSelectionActive()).toBe(true);
    expect(selectedIds()).toEqual([2, 3]);
  });
});
