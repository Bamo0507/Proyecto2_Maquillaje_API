const router = require('express').Router();
const {
  getRoutineRecommendations
} = require('../../controllers/recommendations/similarProductsController');

router.get('/:username', getRoutineRecommendations);

module.exports = router;
