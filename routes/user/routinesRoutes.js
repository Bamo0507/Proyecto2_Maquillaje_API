const router = require('express').Router();
const {
  getUserRoutines,
  createRoutine,
  addProductToRoutine
} = require('../../controllers/user/routinesController');

router.get('/:username', getUserRoutines);
router.post('/:username', createRoutine);
router.post('/:username/:routineId/products', addProductToRoutine);

module.exports = router;
