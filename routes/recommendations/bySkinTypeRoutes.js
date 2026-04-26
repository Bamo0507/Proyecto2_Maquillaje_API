const router = require('express').Router();
const {
  getRecommendationsBySkinType
} = require('../../controllers/recommendations/bySkinTypeController');

router.get('/:username', getRecommendationsBySkinType);

module.exports = router;
