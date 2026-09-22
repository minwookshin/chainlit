import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import type { IMessageElement } from '@chainlit/react-client';

import { useSideElements } from '../src/components/chat/MessagesContainer/useSideElements';

const element = (id: string, autoExpand?: boolean): IMessageElement => ({
  id,
  name: id,
  type: 'text',
  display: 'side',
  forId: 'message',
  url: 'https://example.com/text',
  autoExpand
});

function renderPanel(elements: IMessageElement[]) {
  return renderHook(
    ({ elements }) => {
      const [panel, setPanel] = useState<{
        title: string;
        elements: IMessageElement[];
        key?: string;
      }>();
      useSideElements(elements, setPanel);
      return {
        panel,
        setPanel,
        close: () => setPanel(undefined),
        open: (el: IMessageElement) =>
          setPanel({ title: el.name, elements: [el] })
      };
    },
    { initialProps: { elements } }
  );
}

describe('side element arrivals', () => {
  it('opens new elements by default', () => {
    const { result } = renderPanel([element('source')]);
    expect(result.current.panel?.title).toBe('source');
  });

  it('keeps a closed panel closed while opt-out sources arrive or update', () => {
    const first = element('first');
    const { result, rerender } = renderPanel([first]);
    act(() => result.current.close());
    const second = element('second', false);
    rerender({ elements: [first, second] });
    expect(result.current.panel).toBeUndefined();
    rerender({ elements: [first, { ...second, name: 'updated' }] });
    expect(result.current.panel).toBeUndefined();
  });

  it('allows an explicit open and keeps an open panel updated', () => {
    const first = element('first', false);
    const { result, rerender } = renderPanel([first]);
    expect(result.current.panel).toBeUndefined();
    act(() => result.current.open(first));
    const updated = { ...first, name: 'updated' };
    rerender({ elements: [updated] });
    expect(result.current.panel?.elements).toEqual([updated]);
  });

  it('opens a mixed batch when a changed element opts in', () => {
    const { result, rerender } = renderPanel([]);
    rerender({ elements: [element('quiet', false), element('default')] });
    expect(result.current.panel?.elements).toHaveLength(2);
  });

  it('clears side content on reset and ignores inline arrivals', () => {
    const { result, rerender } = renderPanel([element('first')]);
    rerender({ elements: [{ ...element('inline'), display: 'inline' }] });
    expect(result.current.panel).toBeUndefined();
    rerender({ elements: [element('quiet', false)] });
    expect(result.current.panel).toBeUndefined();
  });

  it.each(['inline', 'page'] as const)(
    'preserves a sidebar opened by title when a %s element arrives',
    (display) => {
      const { result, rerender } = renderPanel([]);
      const sidebar = { title: 'API sidebar', elements: [] };
      act(() => result.current.setPanel(sidebar));

      rerender({ elements: [{ ...element('arrival'), display }] });

      expect(result.current.panel).toBe(sidebar);
    }
  );

  it.each(['inline', 'page'] as const)(
    'preserves programmatic sidebar elements when a %s element arrives or updates',
    (display) => {
      const content: IMessageElement = {
        ...element('api-content'),
        display: 'inline'
      };
      const { result, rerender } = renderPanel([content]);
      const sidebar = { title: 'API sidebar', elements: [content], key: 'api' };
      act(() => result.current.setPanel(sidebar));
      const arrival: IMessageElement = { ...element('arrival'), display };

      rerender({ elements: [content, arrival] });
      expect(result.current.panel).toBe(sidebar);

      rerender({ elements: [content, { ...arrival, name: 'updated' }] });
      expect(result.current.panel).toBe(sidebar);
    }
  );

  it.each(['api-content', 'tracked'])(
    'preserves a replacement sidebar (%s) when tracked side content is removed',
    (id) => {
      const tracked = element('tracked');
      const content: IMessageElement = { ...element(id), display: 'inline' };
      const { result, rerender } = renderPanel([tracked]);
      const sidebar = { title: 'API sidebar', elements: [content], key: 'api' };
      act(() => result.current.setPanel(sidebar));

      rerender({ elements: [content] });

      expect(result.current.panel).toBe(sidebar);
    }
  );

  it('clears an explicitly opened side element when it is removed', () => {
    const quiet = element('quiet', false);
    const { result, rerender } = renderPanel([quiet]);
    act(() => result.current.open(quiet));

    rerender({ elements: [] });

    expect(result.current.panel).toBeUndefined();
  });
});
