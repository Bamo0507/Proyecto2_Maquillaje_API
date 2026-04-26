const router = require('express').Router();
const {
  getUsers,
  createUser,
  updateUser,
  updateUsersMonthlyBudget,
  updateUsersPremium,
  deleteUserMonthlyBudget,
  deleteUsersMonthlyBudget,
  deleteUser,
  deleteUsersBulk
} = require('../../controllers/admin/usersController');

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/bulk/monthly-budget', updateUsersMonthlyBudget);
router.patch('/bulk/premium', updateUsersPremium);
router.delete('/bulk/monthly-budget', deleteUsersMonthlyBudget);
router.delete('/bulk', deleteUsersBulk);
router.patch('/:username', updateUser);
router.delete('/:username/monthly-budget', deleteUserMonthlyBudget);
router.delete('/:username', deleteUser);

module.exports = router;
