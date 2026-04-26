const router = require('express').Router();
const {
  getUserFavorites
} = require('../../controllers/user/favoritesController');

router.get('/:userId/favorites', getUserFavorites);

module.exports = router;
