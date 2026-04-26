const router = require('express').Router();
const {
  getRecommendationsBySkinConcern
} = require('../../controllers/recommendations/byConcernController');

router.get('/:username', getRecommendationsBySkinConcern);

module.exports = router;
