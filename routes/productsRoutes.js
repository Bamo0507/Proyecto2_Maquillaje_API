const router = require('express').Router();
const {
  getProducts,
  getProductById,
  getProductReviews,
  getSimilarProducts,
  createProductReview
} = require('../controllers/productsController');

router.get('/', getProducts);
router.get('/:id/reviews', getProductReviews);
router.post('/:id/reviews', createProductReview);
router.get('/:id/similar', getSimilarProducts);
router.get('/:id', getProductById);

module.exports = router;
