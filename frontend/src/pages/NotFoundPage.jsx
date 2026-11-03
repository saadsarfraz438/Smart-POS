import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="text-center py-5">
      <h1 className="display-1 fw-bold">404</h1>
      <p className="text-muted">The page you are looking for does not exist.</p>
      <Link to="/login" className="btn btn-primary mt-3">Go to Login</Link>
    </div>
  );
}
