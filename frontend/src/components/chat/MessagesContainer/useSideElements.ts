import { useEffect, useRef } from 'react';
import type { SetterOrUpdater } from 'recoil';

import type { IMessageElement } from '@chainlit/react-client';

type SideView = { title: string; elements: IMessageElement[] } | undefined;

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
      setSideView(undefined);
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
      setSideView((current) =>
        current || shouldOpen
          ? {
              title: sideElements[sideElements.length - 1].name,
              elements: sideElements
            }
          : current
      );
    }
  }, [elements, setSideView]);
}
