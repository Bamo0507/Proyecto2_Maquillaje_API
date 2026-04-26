const router = require('express').Router();
const {
  getProductById,
  getProductReviews,
  getSimilarProducts,
  createProductReview
} = require('../controllers/productsController');

router.get('/:id/reviews', getProductReviews);
router.post('/:id/reviews', createProductReview);
router.get('/:id/similar', getSimilarProducts);
router.get('/:id', getProductById);

module.exports = router;
