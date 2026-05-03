const router = require('express').Router();
const {
  getUserReviews,
  addReviewComment,
  addReviewCommentBulk,
  updateReviewRatingBulk,
  deleteReviewComment,
  deleteReviewCommentsBulk
} = require('../../controllers/user/reviewsController');

router.get('/:username', getUserReviews);
router.patch('/:username/comments/bulk', addReviewCommentBulk);
router.patch('/:username/rating/bulk', updateReviewRatingBulk);
router.patch('/:username/:productId/comment', addReviewComment);
router.delete('/:username/comments/bulk', deleteReviewCommentsBulk);
router.delete('/:username/:productId/comment', deleteReviewComment);

module.exports = router;
