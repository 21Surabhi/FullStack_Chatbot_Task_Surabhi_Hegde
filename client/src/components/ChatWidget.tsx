import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import EnquiryForm from './EnquiryForm';

interface Msg {
  from: 'bot' | 'user';
  text: string;
  form?: boolean;
}

const START = ['Drone services', 'Courses & training', 'Pricing', 'Contact us', 'Send an enquiry'];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'bot', text: 'Hi! I am SkyBot. How can I help you today?' }]);
  const [chips, setChips] = useState<string[]>(START);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  async function send(message: string) {
    const m = message.trim();
    if (!m || busy) return;
    setMsgs((p) => [...p, { from: 'user', text: m }]);
    setText('');
    setBusy(true);
    try {
      const r = await api.chat(m);
      setMsgs((p) => [...p, { from: 'bot', text: r.reply, form: r.startEnquiry }]);
      setChips(r.suggestions);
    } catch (e) {
      setMsgs((p) => [...p, { from: 'bot', text: e instanceof Error ? e.message : 'Sorry, something went wrong.' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen(!open)} aria-label={open ? 'Close chat' : 'Open chat'}>
        {open ? 'X' : 'Chat'}
      </button>
      {open && (
        <section className="chat" aria-label="Chat assistant">
          <header>SkyBot <small>Support and enquiries</small></header>
          <div className="chat-body">
            {msgs.map((m, i) => (
              <div key={i} className={`bubble ${m.from}`}>
                {m.text}
                {m.form && <EnquiryForm compact />}
              </div>
            ))}
            {busy && <div className="bubble bot">...</div>}
            <div ref={end} />
          </div>
          <div className="chips">
            {chips.map((c) => (
              <button key={c} onClick={() => send(c)}>{c}</button>
            ))}
          </div>
          <form
            className="chat-input"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              send(text);
            }}
          >
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." maxLength={300} aria-label="Message" />
            <button className="btn" disabled={busy}>Send</button>
          </form>
        </section>
      )}
    </>
  );
}