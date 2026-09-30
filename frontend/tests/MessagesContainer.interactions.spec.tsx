import { fireEvent, render, screen } from '@testing-library/react';
import { RecoilRoot, useRecoilState } from 'recoil';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  IMessageElement,
  sideViewState,
  useChatData
} from '@chainlit/react-client';

import MessagesContainer from '@/components/chat/MessagesContainer';

vi.mock('@chainlit/react-client', async () => {
  const actual = await vi.importActual<typeof import('@chainlit/react-client')>(
    '@chainlit/react-client'
  );
  const { atom } = await import('recoil');
  return {
    ...actual,
    // The library and app have separate pnpm installations of Recoil in Vitest.
    messagesState: atom({ key: 'review-messages', default: [] }),
    sessionIdState: atom({ key: 'review-session', default: undefined }),
    sideViewState: atom({ key: 'review-side-view', default: undefined }),
    useChatData: vi.fn(),
    useChatInteract: () => ({ uploadFile: vi.fn() }),
    useChatMessages: () => ({ messages: [] }),
    useConfig: () => ({ config: { features: {} } })
  };
});

vi.mock('@/components/chat/Messages', async () => {
  const { ElementRef } = await import('@/components/Elements/ElementRef');
  return {
    Messages: ({ elements }: { elements: IMessageElement[] }) => (
      <div>
        {elements.map((element) => (
          <ElementRef key={element.id} element={element} />
        ))}
      </div>
    )
  };
});

vi.mock('@/components/i18n/Translator', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

function element(id: string, name = id): IMessageElement {
  return {
    id,
    name,
    display: 'side',
    type: 'text',
    forId: 'review-message'
  };
}

function setElements(elements: IMessageElement[]) {
  vi.mocked(useChatData).mockReturnValue({
    elements,
    actions: [],
    loading: false
  } as ReturnType<typeof useChatData>);
}

function SideView() {
  const [view, setView] = useRecoilState(sideViewState);
  return view ? (
    <aside aria-label="Element preview" data-sidebar-key={view.key}>
      <p>{view.title}</p>
      <output aria-label="Preview URL">{view.elements[0]?.url}</output>
      <output aria-label="Selected elements">
        {view.elements.map((selected) => selected.id).join(',')}
      </output>
      <button onClick={() => setView(undefined)}>Close preview</button>
    </aside>
  ) : null;
}

function App() {
  return (
    <RecoilRoot>
      <MessagesContainer />
      <SideView />
    </RecoilRoot>
  );
}

describe('MessagesContainer explicit preview intent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens only the selected element through the real element reference', () => {
    setElements([element('First'), element('Second')]);
    render(<App />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'First' }));
    expect(screen.getByRole('complementary')).toHaveTextContent('First');
    expect(screen.getByRole('complementary')).not.toHaveTextContent('Second');
  });

  it('preserves a manual close across incoming updates and allows reopening', () => {
    setElements([element('First')]);
    const { rerender } = render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'First' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    setElements([element('First'), element('Second')]);
    rerender(<App />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Second' }));
    expect(screen.getByRole('complementary')).toHaveTextContent('Second');
  });

  it('does not replace a user-selected preview when another source arrives', () => {
    setElements([element('First')]);
    const { rerender } = render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'First' }));
    setElements([element('First'), element('Second')]);
    rerender(<App />);
    expect(screen.getByRole('complementary')).toHaveTextContent('First');
    expect(screen.getByRole('complementary')).not.toHaveTextContent('Second');
  });

  it('clears the old preview when a new empty thread replaces the elements', () => {
    setElements([element('First')]);
    const { rerender } = render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'First' }));
    setElements([]);
    rerender(<App />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('clears a preview when its selected element is removed', () => {
    setElements([element('First'), element('Second')]);
    const { rerender } = render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'First' }));

    setElements([element('Second')]);
    rerender(<App />);

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Second' })).toBeInTheDocument();
  });

  it('refreshes an open preview when the selected element is updated', () => {
    setElements([{ ...element('First'), url: '/version-1.txt' }]);
    const { rerender } = render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'First' }));
    expect(screen.getByLabelText('Preview URL')).toHaveTextContent(
      '/version-1.txt'
    );
    setElements([{ ...element('First'), url: '/version-2.txt' }]);
    rerender(<App />);
    expect(screen.getByLabelText('Preview URL')).toHaveTextContent(
      '/version-2.txt'
    );
  });

  it.each([0, 1])(
    'removes selected element %i while retaining the other selection',
    (removed) => {
      const selected = [element('First'), element('Second')];
      setElements(selected);
      const { rerender } = render(
        <RecoilRoot
          initializeState={({ set }) =>
            set(sideViewState, { title: 'Sources', elements: selected })
          }
        >
          <MessagesContainer />
          <SideView />
        </RecoilRoot>
      );
      expect(screen.getByLabelText('Selected elements')).toHaveTextContent(
        'First,Second'
      );

      const remaining = selected.filter((_, index) => index !== removed);
      setElements(remaining);
      rerender(
        <RecoilRoot>
          <MessagesContainer />
          <SideView />
        </RecoilRoot>
      );

      expect(screen.getByLabelText('Selected elements').textContent).toBe(
        remaining[0].id
      );
      expect(screen.getByRole('complementary')).toHaveTextContent('Sources');
    }
  );

  it('refreshes a page fallback preview and closes it when removed', () => {
    const selected: IMessageElement = {
      ...element('Page'),
      display: 'page',
      url: '/version-1.txt'
    };
    setElements([selected]);
    const { rerender } = render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Page' }));
    expect(screen.getByLabelText('Preview URL')).toHaveTextContent(
      '/version-1.txt'
    );

    setElements([{ ...selected, name: 'Updated page', url: '/version-2.txt' }]);
    rerender(<App />);
    expect(screen.getByRole('complementary')).toHaveTextContent('Updated page');
    expect(screen.getByLabelText('Preview URL')).toHaveTextContent(
      '/version-2.txt'
    );

    setElements([element('Unrelated')]);
    rerender(<App />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('navigates to page elements when a navigator is available', () => {
    const navigate = vi.fn();
    setElements([{ ...element('Page'), display: 'page' }]);
    render(
      <RecoilRoot>
        <MessagesContainer navigate={navigate} />
        <SideView />
      </RecoilRoot>
    );
    fireEvent.click(screen.getByRole('link', { name: 'Page' }));
    expect(navigate).toHaveBeenCalledWith('/element/Page');
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
  it('preserves a custom title and sidebar key when content changes', () => {
    const selected = element('First');
    setElements([selected]);
    const { rerender } = render(
      <RecoilRoot
        initializeState={({ set }) =>
          set(sideViewState, {
            title: 'Custom title',
            key: 'server-key',
            elements: [selected]
          })
        }
      >
        <MessagesContainer />
        <SideView />
      </RecoilRoot>
    );
    setElements([{ ...selected, name: 'Renamed', url: '/updated.txt' }]);
    rerender(
      <RecoilRoot>
        <MessagesContainer />
        <SideView />
      </RecoilRoot>
    );
    expect(screen.getByRole('complementary')).toHaveTextContent('Custom title');
    expect(screen.getByLabelText('Preview URL')).toHaveTextContent(
      '/updated.txt'
    );
    expect(screen.getByRole('complementary')).toHaveAttribute(
      'data-sidebar-key',
      'server-key'
    );
  });

  it('updates the default preview title when the selected element is renamed', () => {
    setElements([element('First')]);
    const { rerender } = render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'First' }));
    setElements([element('First', 'Renamed')]);
    rerender(<App />);
    expect(screen.getByRole('complementary')).toHaveTextContent('Renamed');
  });
});
