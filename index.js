require('dotenv').config();
const express = require('express');
const { connectDB } = require('./db/connection');

const authRoutes = require('./routes/auth/authRoutes');
const adminProductsRoutes = require('./routes/admin/productsRoutes');
const adminBrandsRoutes = require('./routes/admin/brandsRoutes');
const adminUsersRoutes = require('./routes/admin/usersRoutes');
const adminRoutinesRoutes = require('./routes/admin/routinesRoutes');
const userProfileRoutes = require('./routes/user/profileRoutes');
const userSkinTypesRoutes = require('./routes/user/skinTypesRoutes');
const userConcernsRoutes = require('./routes/user/concernsRoutes');
const userRoutinesRoutes = require('./routes/user/routinesRoutes');
const userReviewsRoutes = require('./routes/user/reviewsRoutes');
const userFavoritesRoutes = require('./routes/user/favoritesRoutes');
const recBySkinTypeRoutes = require('./routes/recommendations/bySkinTypeRoutes');
const recByConcernRoutes = require('./routes/recommendations/byConcernRoutes');
const recSimilarProductsRoutes = require('./routes/recommendations/similarProductsRoutes');

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin/products', adminProductsRoutes);
app.use('/api/admin/brands', adminBrandsRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/routines', adminRoutinesRoutes);
app.use('/api/user/profile', userProfileRoutes);
app.use('/api/user/skin-types', userSkinTypesRoutes);
app.use('/api/user/concerns', userConcernsRoutes);
app.use('/api/user/routines', userRoutinesRoutes);
app.use('/api/user/reviews', userReviewsRoutes);
app.use('/api/user/favorites', userFavoritesRoutes);
app.use('/api/recommendations/skin-type', recBySkinTypeRoutes);
app.use('/api/recommendations/concern', recByConcernRoutes);
app.use('/api/recommendations/similar', recSimilarProductsRoutes);

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Corriendo en ${PORT}`);
  });
});
