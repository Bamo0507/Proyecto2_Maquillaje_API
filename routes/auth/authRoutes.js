const router = require('express').Router();
const { login } = require('../../controllers/auth/authController');

router.post('/login', login);

module.exports = router;
