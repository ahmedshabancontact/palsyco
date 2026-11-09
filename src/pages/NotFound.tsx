import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center text-center">
      <div>
        <div className="font-display text-8xl font-extrabold text-gradient">404</div>
        <p className="text-muted mt-2">This channel doesn&apos;t exist (or it&apos;s private).</p>
        <Link to="/" className="btn-primary mt-6">
          Back home
        </Link>
      </div>
    </div>
  );
}
