require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db/connection');

const authRoutes = require('./routes/auth/authRoutes');
const adminUsersRoutes = require('./routes/admin/usersRoutes');
const productsRoutes = require('./routes/productsRoutes');
const categoriesRoutes = require('./routes/categoriesRoutes');
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

const localhostCors = (origin, callback) => {
  if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
    return callback(null, true);
  }

  return callback(new Error('Origen no permitido por CORS'));
};

app.use(cors({ origin: localhostCors }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/user/profile', userProfileRoutes);
app.use('/api/user/skin-types', userSkinTypesRoutes);
app.use('/api/user/concerns', userConcernsRoutes);
app.use('/api/user/routines', userRoutinesRoutes);
app.use('/api/user/reviews', userReviewsRoutes);
app.use('/api/users', userFavoritesRoutes);
app.use('/api/recommendations/skin-type', recBySkinTypeRoutes);
app.use('/api/recommendations/skin-concern', recByConcernRoutes);
app.use('/api/recommendations', recSimilarProductsRoutes);

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Corriendo en ${PORT}`);
  });
});
