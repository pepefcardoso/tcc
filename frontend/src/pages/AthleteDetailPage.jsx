import { useParams } from 'react-router-dom';

export default function AthleteDetailPage() {
  const { id } = useParams();
  
  return (
    <main>
      <h1>Athlete Detail</h1>
      <p>Athlete ID: {id} — placeholder</p>
    </main>
  );
}
