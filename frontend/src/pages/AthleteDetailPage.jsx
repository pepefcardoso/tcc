import { useParams } from 'react-router-dom';

export default function AthleteDetailPage() {
  const { id } = useParams();

  return (
    <>
      <h1>Athlete Detail</h1>
      <p>Athlete ID: {id} — placeholder</p>
    </>
  );
}
