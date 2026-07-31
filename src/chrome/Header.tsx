import { useMemo, useRef, useState } from 'react';
import { selectClarity, useDecisionStore } from '../store/useDecisionStore';
import { exportDoc, ImportError, readDocFile } from '../store/io';
import { useGuide } from '../guide/useGuide';
import './header.css';

export function Header() {
  const question = useDecisionStore((s) => s.doc.question);
  const setQuestion = useDecisionStore((s) => s.setQuestion);
  const doc = useDecisionStore((s) => s.doc);
  const loadDoc = useDecisionStore((s) => s.loadDoc);
  const newDoc = useDecisionStore((s) => s.newDoc);
  const theme = useDecisionStore((s) => s.theme);
  const setTheme = useDecisionStore((s) => s.setTheme);
  const mode = useDecisionStore((s) => s.mode);
  const setMode = useDecisionStore((s) => s.setMode);
  const deciding = mode === 'decide';
  const nodes = useDecisionStore((s) => s.doc.nodes);
  const clarity = useMemo(() => selectClarity(nodes), [nodes]);
  const startGuide = useGuide((s) => s.start);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onImport = async (file: File) => {
    try {
      const next = await readDocFile(file);
      const replacing = doc.nodes.length > 1 || doc.question.trim().length > 0;
      if (replacing && !window.confirm('Open this file? The decision on screen will be replaced.')) return;
      loadDoc(next);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof ImportError ? error.message : 'That file could not be opened.');
    }
  };

  return (
    <header className="header">
      <div className="header__brand">
        <span className="eyebrow">Decision Maker</span>
        <input
          className="header__question"
          data-guide="question"
          dir="auto"
          value={question}
          placeholder="What are you deciding?"
          aria-label="What are you deciding?"
          readOnly={deciding}
          onChange={(event) => setQuestion(event.target.value)}
        />
      </div>

      <div className="header__side">
        <div className="clarity" title="Branches you have written your thinking into">
          <div className="clarity__label">
            <span className="eyebrow">Clarity</span>
            <span className="data">
              {clarity.resolved}/{clarity.total}
            </span>
          </div>
          <div className="clarity__track">
            <span className="clarity__fill" style={{ width: `${Math.round(clarity.ratio * 100)}%` }} />
          </div>
        </div>

        {/* the whole app answers to this: building the decision, or reading the one you built */}
        <div className="segmented header__mode" role="group" aria-label="Mode">
          <button
            className={deciding ? 'segmented__item' : 'segmented__item is-on'}
            aria-pressed={!deciding}
            title="Map it, write it, weigh it"
            onClick={() => setMode('edit')}
          >
            Edit
          </button>
          <button
            className={deciding ? 'segmented__item is-on' : 'segmented__item'}
            aria-pressed={deciding}
            title="Put the editing away and read what you built"
            onClick={() => setMode('decide')}
          >
            Decide
          </button>
        </div>

        <div className="header__actions" data-guide="save">
          {/* the walkthrough points at controls that are not there while deciding */}
          {!deciding && (
            <button className="btn btn--quiet" onClick={startGuide} title="Walk through how this works">
              Guide
            </button>
          )}
          <button
            className="btn btn--quiet"
            onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
            title={`Theme: ${theme}`}
          >
            {theme === 'system' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light'}
          </button>
          <button className="btn" onClick={() => exportDoc(doc)}>
            Export
          </button>
          {/* both of these replace the document — not something to reach for while deciding */}
          {!deciding && (
            <>
              <button className="btn" onClick={() => fileRef.current?.click()}>
                Open
              </button>
              <button
                className="btn btn--quiet"
                onClick={() => {
                  if (window.confirm('Start a new decision? The one on screen will be cleared.')) newDoc();
                }}
              >
                New
              </button>
            </>
          )}
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImport(file);
              event.target.value = '';
            }}
          />
        </div>
      </div>

      {message && (
        <p className="header__error data" role="alert">
          {message}
        </p>
      )}
    </header>
  );
}
