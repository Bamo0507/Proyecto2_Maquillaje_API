const router = require('express').Router();
const {
  getUserProfile,
  updateUserProfile,
  deleteMonthlyBudget,
  getAvailableSkinTypes,
  getAvailableConcerns,
  addUserSkinType,
  updateUserSkinType,
  deleteUserSkinType,
  addUserConcern,
  updateUserConcern,
  deleteUserConcern
} = require('../../controllers/user/profileController');

router.get('/:username/available-skin-types', getAvailableSkinTypes);
router.get('/:username/available-concerns', getAvailableConcerns);
router.get('/:username', getUserProfile);
router.patch('/:username', updateUserProfile);
router.delete('/:username/monthly-budget', deleteMonthlyBudget);
router.post('/:username/skin-types', addUserSkinType);
router.patch('/:username/skin-types/:skinTypeName', updateUserSkinType);
router.delete('/:username/skin-types/:skinTypeName', deleteUserSkinType);
router.post('/:username/concerns', addUserConcern);
router.patch('/:username/concerns/:concernName', updateUserConcern);
router.delete('/:username/concerns/:concernName', deleteUserConcern);

module.exports = router;
