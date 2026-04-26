const router = require('express').Router();
const { getCategories } = require('../controllers/categoriesController');

router.get('/', getCategories);

module.exports = router;
