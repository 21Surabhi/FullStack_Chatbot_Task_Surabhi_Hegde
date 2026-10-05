import { Link } from 'react-router-dom';
import ChatWidget from '../components/ChatWidget';
import EnquiryForm from '../components/EnquiryForm';

const cards = [
  ['Aerial media', 'Cinematic photo and video for weddings, real estate and brands.'],
  ['Mapping and survey', 'Accurate drone surveys for land, construction and agriculture.'],
  ['Pilot training', 'Hands-on courses from beginner to professional pilot.'],
  ['Event coverage', 'Live and recorded aerial coverage of events.'],
];

export default function Home() {
  return (
    <>
      <nav className="nav">
        <strong>SkyDesk</strong>
        <Link to="/admin">Admin</Link>
      </nav>
      <header className="hero">
        <h1>Everything drones, one conversation away.</h1>
        <p>Ask our assistant about services and training, or send us an enquiry.</p>
        <a className="btn" href="#enquire">Send an enquiry</a>
      </header>
      <section className="cards">
        {cards.map(([t, d]) => (
          <article key={t} className="card">
            <h3>{t}</h3>
            <p>{d}</p>
          </article>
        ))}
      </section>
      <section id="enquire" className="panel">
        <h2>Tell us what you need</h2>
        <EnquiryForm />
      </section>
      <footer className="foot">SkyDesk demo project</footer>
      <ChatWidget />
    </>
  );
}