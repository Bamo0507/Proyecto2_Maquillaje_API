const router = require('express').Router();
const {
  getUserFavorites,
  deleteUserFavorite,
  deleteUserFavoritesBulk
} = require('../../controllers/user/favoritesController');

router.get('/:userId/favorites', getUserFavorites);
router.delete('/:userId/favorites/bulk', deleteUserFavoritesBulk);
router.delete('/:userId/favorites/:productId', deleteUserFavorite);

module.exports = router;
