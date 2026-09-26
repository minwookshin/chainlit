import { useEffect, useRef } from 'react';
import type { SetterOrUpdater } from 'recoil';

import type { IMessageElement } from '@chainlit/react-client';

type SideView = { title: string; elements: IMessageElement[] } | undefined;

// The shared view can outlive this hook during navigation between threads.
const messageSideViews = new WeakSet<NonNullable<SideView>>();

export function createMessageSideView(elements: IMessageElement[]) {
  const view = {
    title: elements[elements.length - 1].name,
    elements
  };
  if (elements.some((element) => element.display === 'side')) {
    messageSideViews.add(view);
  }
  return view;
}

export function useSideElements(
  elements: IMessageElement[],
  setSideView: SetterOrUpdater<SideView>
) {
  const knownSideElementsRef = useRef<Map<string, IMessageElement>>(new Map());
  const knownSideOrderRef = useRef<string[]>([]);

  useEffect(() => {
    const sideElements = elements.filter((e) => e.display === 'side');

    if (sideElements.length === 0) {
      knownSideElementsRef.current = new Map();
      knownSideOrderRef.current = [];
      // Other callers, such as ElementSidebar, share this view state.
      setSideView((current) =>
        current && messageSideViews.has(current) ? undefined : current
      );
      return;
    }

    const prevMap = knownSideElementsRef.current;
    const prevOrder = knownSideOrderRef.current;
    const currentIds = sideElements.map((e) => e.id);

    const hasChanged =
      currentIds.length !== prevOrder.length ||
      currentIds.some((id, i) => prevOrder[i] !== id) ||
      sideElements.some((e) => prevMap.get(e.id) !== e);

    if (hasChanged) {
      const newMap = new Map<string, IMessageElement>();
      sideElements.forEach((e) => newMap.set(e.id, e));
      knownSideElementsRef.current = newMap;
      knownSideOrderRef.current = currentIds;
      const shouldOpen = sideElements.some(
        (element) =>
          prevMap.get(element.id) !== element && element.autoExpand !== false
      );
      const nextView = createMessageSideView(sideElements);
      setSideView((current) => (current || shouldOpen ? nextView : current));
    }
  }, [elements, setSideView]);
}
