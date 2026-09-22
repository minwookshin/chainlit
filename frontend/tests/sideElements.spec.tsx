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
      }>();
      useSideElements(elements, setPanel);
      return {
        panel,
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
});
