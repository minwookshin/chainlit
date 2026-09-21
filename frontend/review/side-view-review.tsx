import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { RecoilRoot, useSetRecoilState } from 'recoil';

import {
  ChainlitAPI,
  ChainlitContext,
  type IMessageElement,
  type IStep,
  authState,
  configState,
  elementState,
  messagesState
} from '@chainlit/react-client';

import EmbeddedElementSideView from '../../libs/copilot/src/components/ElementSideView';
import ElementSideView from '@/components/ElementSideView';
import MessagesContainer from '@/components/chat/MessagesContainer';
import { Button } from '@/components/ui/button';
import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { TooltipProvider } from '@/components/ui/tooltip';

import '../src/index.css';

import { i18nSetupLocalization } from '../src/i18n';

const embedded = new URLSearchParams(window.location.search).has('embedded');
const client = new ChainlitAPI(window.location.origin, 'webapp');
const message: IStep = {
  id: 'review-message',
  name: 'Assistant',
  type: 'assistant_message',
  output: 'See Source A and Source B for the details.',
  createdAt: '2026-09-21T00:00:00Z'
};
const makeElement = (id: string, revision: number): IMessageElement => ({
  id,
  name: `Source ${id}`,
  type: 'text',
  display: 'side',
  forId: message.id,
  url: `data:text/plain,${encodeURIComponent(`Source ${id} — revision ${revision}`)}`
});

function Review() {
  const setElements = useSetRecoilState(elementState);
  const setMessages = useSetRecoilState(messagesState);
  const [revision, setRevision] = useState(1);
  return (
    <main className="flex h-screen flex-col gap-5 p-6">
      <header>
        <h1 className="text-xl font-semibold">Side panel interaction review</h1>
        <p className="text-muted-foreground text-sm">
          Real Chainlit components; local message events. No backend or model
          connected.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setMessages([message]);
            setElements([makeElement('A', revision)]);
          }}
        >
          Receive Source A
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            setElements([makeElement('A', revision), makeElement('B', 1)])
          }
        >
          Receive Source B
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const next = revision + 1;
            setRevision(next);
            setElements([makeElement('A', next)]);
          }}
        >
          Update Source A
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setElements([]);
            setMessages([]);
          }}
        >
          New thread
        </Button>
        <output aria-label="Latest source revision">
          Latest source revision: {revision}
        </output>
      </div>
      {embedded ? (
        <section
          aria-label="Embedded conversation"
          className="flex-1 rounded-xl border p-6"
        >
          <MessagesContainer />
          <EmbeddedElementSideView />
        </section>
      ) : (
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 rounded-xl border"
        >
          <ResizablePanel defaultSize={60} className="overflow-auto p-6">
            <MessagesContainer />
          </ResizablePanel>
          <ElementSideView />
        </ResizablePanelGroup>
      )}
    </main>
  );
}

i18nSetupLocalization();
createRoot(document.getElementById('root')!).render(
  <ChainlitContext.Provider value={client}>
    <RecoilRoot
      initializeState={({ set }) => {
        set(authState, {
          requireLogin: false,
          passwordAuth: false,
          headerAuth: false,
          oauthProviders: []
        });
        set(configState, {
          ui: { name: 'Assistant', cot: 'hidden' },
          features: { audio: { enabled: false, sample_rate: 24000 } },
          userEnv: [],
          dataPersistence: false,
          threadResumable: false,
          chatProfiles: [],
          translation: {}
        });
      }}
    >
      <BrowserRouter>
        <TooltipProvider>
          <Review />
        </TooltipProvider>
      </BrowserRouter>
    </RecoilRoot>
  </ChainlitContext.Provider>
);
