import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as dashboardRepository from '../repositories/dashboardRepository.js';
import { calculateAcwr, classifyAcwrZone } from '../services/acwrService.js';

const router = Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const rows = await dashboardRepository.getLatestSessionPerActiveAthlete();

    const acwrResults = await Promise.all(rows.map((row) => calculateAcwr(row.athlete_id)));

    const athletes = rows.map((row, index) => {
      const acwrResult = acwrResults[index];
      const zone = classifyAcwrZone(acwrResult.acwr);

      let latest_session = null;
      if (row.session_id) {
        latest_session = {
          session_id: row.session_id,
          date: row.date ? row.date.toISOString() : null,
          total_distance_m: row.total_distance_m !== null ? parseFloat(row.total_distance_m) : null,
          max_speed_kmh: row.max_speed_kmh !== null ? parseFloat(row.max_speed_kmh) : null,
          sprint_count: row.sprint_count !== null ? parseInt(row.sprint_count, 10) : null,
          player_load: row.player_load !== null ? parseFloat(row.player_load) : null,
          pse_pending: row.pse === null,
        };
      }

      return {
        athlete_id: row.athlete_id,
        name: row.name,
        latest_session,
        acwr: {
          value: acwrResult.acwr,
          zone: zone,
        },
      };
    });

    const high_risk_athlete_ids = athletes
      .filter((a) => a.acwr.value !== null && a.acwr.value > 1.5)
      .map((a) => a.athlete_id);

    return res.status(200).json({
      athletes,
      high_risk_athlete_ids,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
