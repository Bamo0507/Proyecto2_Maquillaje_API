const router = require('express').Router();
const {
  getRoutineRecommendations,
  getTopRankedProducts
} = require('../../controllers/recommendations/similarProductsController');

router.get('/top-ranked', getTopRankedProducts);
router.get('/routine/:username', getRoutineRecommendations);

module.exports = router;
