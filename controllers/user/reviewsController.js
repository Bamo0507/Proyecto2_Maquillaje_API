const { driver } = require('../../db/connection');
const { toNativeNumber } = require('../../utils/neo4j');

const getUserReviews = async (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({
      message: 'username es requerido'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})-[r:REVIEWED]->(p:Product)
      OPTIONAL MATCH (p)-[:BELONGS_TO]->(b:Brand)
      RETURN
        r.rating AS rating,
        r.comment AS comment,
        r.reviewDate AS reviewDate,
        r.wouldRecommend AS wouldRecommend,
        p.productId AS productId,
        p.name AS productName,
        b.name AS brandName
      ORDER BY reviewDate DESC
      `,
      { username }
    );

    const reviews = result.records.map((record) => ({
      rating: record.get('rating'),
      comment: record.get('comment'),
      reviewDate: record.get('reviewDate')?.toString(),
      wouldRecommend: record.get('wouldRecommend'),
      product: {
        productId: toNativeNumber(record.get('productId')),
        name: record.get('productName'),
        brand: record.get('brandName')
      }
    }));

    return res.status(200).json({
      username,
      total: reviews.length,
      reviews
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener reviews del usuario',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const addReviewComment = async (req, res) => {
  const { username, productId } = req.params;
  const { comment } = req.body;
  const parsedProductId = Number(productId);

  if (!username || !productId) {
    return res.status(400).json({
      message: 'username y productId son requeridos'
    });
  }

  if (!Number.isInteger(parsedProductId)) {
    return res.status(400).json({
      message: 'productId debe ser un numero entero'
    });
  }

  if (!comment || !comment.trim()) {
    return res.status(400).json({
      message: 'comment es requerido'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})-[r:REVIEWED]->(p:Product {productId: $productId})
      WHERE r.comment IS NULL OR trim(r.comment) = ''
      SET r.comment = $comment
      RETURN
        r.rating AS rating,
        r.comment AS comment,
        r.reviewDate AS reviewDate,
        r.wouldRecommend AS wouldRecommend,
        p.productId AS productId,
        p.name AS productName
      `,
      {
        username,
        productId: parsedProductId,
        comment: comment.trim()
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        message: 'Review no encontrada o ya tiene comentario'
      });
    }

    const record = result.records[0];

    return res.status(200).json({
      message: 'Comentario agregado correctamente',
      review: {
        rating: record.get('rating'),
        comment: record.get('comment'),
        reviewDate: record.get('reviewDate')?.toString(),
        wouldRecommend: record.get('wouldRecommend'),
        product: {
          productId: toNativeNumber(record.get('productId')),
          name: record.get('productName')
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al agregar comentario a la review',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const addReviewCommentBulk = async (req, res) => {
  const { username } = req.params;
  const { productIds, comment } = req.body;

  if (!username) {
    return res.status(400).json({
      message: 'username es requerido'
    });
  }

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({
      message: 'productIds debe ser una lista con al menos un producto'
    });
  }

  const parsedProductIds = productIds.map(Number);

  if (!parsedProductIds.every(Number.isInteger)) {
    return res.status(400).json({
      message: 'Todos los productIds deben ser numeros enteros'
    });
  }

  if (!comment || !comment.trim()) {
    return res.status(400).json({
      message: 'comment es requerido'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})-[r:REVIEWED]->(p:Product)
      WHERE p.productId IN $productIds
        AND (r.comment IS NULL OR trim(r.comment) = '')
      SET r.comment = $comment
      RETURN
        r.rating AS rating,
        r.comment AS comment,
        r.reviewDate AS reviewDate,
        r.wouldRecommend AS wouldRecommend,
        p.productId AS productId,
        p.name AS productName
      ORDER BY productId
      `,
      {
        username,
        productIds: parsedProductIds,
        comment: comment.trim()
      }
    );

    const updatedReviews = result.records.map((record) => ({
      rating: record.get('rating'),
      comment: record.get('comment'),
      reviewDate: record.get('reviewDate')?.toString(),
      wouldRecommend: record.get('wouldRecommend'),
      product: {
        productId: toNativeNumber(record.get('productId')),
        name: record.get('productName')
      }
    }));

    return res.status(200).json({
      message: 'Comentarios agregados correctamente',
      username,
      requested: parsedProductIds.length,
      updated: updatedReviews.length,
      reviews: updatedReviews
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al agregar comentarios en bulk',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const deleteReviewComment = async (req, res) => {
  const { username, productId } = req.params;
  const parsedProductId = Number(productId);

  if (!username || !productId) {
    return res.status(400).json({
      message: 'username y productId son requeridos'
    });
  }

  if (!Number.isInteger(parsedProductId)) {
    return res.status(400).json({
      message: 'productId debe ser un numero entero'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})-[r:REVIEWED]->(p:Product {productId: $productId})
      WHERE r.comment IS NOT NULL
      REMOVE r.comment
      RETURN p.productId AS productId, p.name AS productName
      `,
      {
        username,
        productId: parsedProductId
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        message: 'Review no encontrada o no tiene comentario'
      });
    }

    const record = result.records[0];

    return res.status(200).json({
      message: 'Comentario eliminado correctamente',
      updated: {
        productId: toNativeNumber(record.get('productId')),
        productName: record.get('productName')
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al eliminar comentario de la review',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const updateReviewRatingBulk = async (req, res) => {
  const { username } = req.params;
  const { productIds, rating } = req.body;
  const parsedRating = Number(rating);

  if (!username) {
    return res.status(400).json({
      message: 'username es requerido'
    });
  }

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({
      message: 'productIds debe ser una lista con al menos un producto'
    });
  }

  const parsedProductIds = productIds.map(Number);

  if (!parsedProductIds.every(Number.isInteger)) {
    return res.status(400).json({
      message: 'Todos los productIds deben ser numeros enteros'
    });
  }

  if (!Number.isFinite(parsedRating)) {
    return res.status(400).json({
      message: 'rating debe ser numerico'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})-[r:REVIEWED]->(p:Product)
      WHERE p.productId IN $productIds
      SET r.rating = $rating
      RETURN
        r.rating AS rating,
        p.productId AS productId,
        p.name AS productName
      ORDER BY productId
      `,
      {
        username,
        productIds: parsedProductIds,
        rating: parsedRating
      }
    );

    const updatedReviews = result.records.map((record) => ({
      rating: record.get('rating'),
      product: {
        productId: toNativeNumber(record.get('productId')),
        name: record.get('productName')
      }
    }));

    return res.status(200).json({
      message: 'Ratings actualizados correctamente',
      username,
      requested: parsedProductIds.length,
      updated: updatedReviews.length,
      reviews: updatedReviews
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al actualizar ratings en bulk',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const deleteReviewCommentsBulk = async (req, res) => {
  const { username } = req.params;
  const { productIds } = req.body;

  if (!username) {
    return res.status(400).json({
      message: 'username es requerido'
    });
  }

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({
      message: 'productIds debe ser una lista con al menos un producto'
    });
  }

  const parsedProductIds = productIds.map(Number);

  if (!parsedProductIds.every(Number.isInteger)) {
    return res.status(400).json({
      message: 'Todos los productIds deben ser numeros enteros'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})-[r:REVIEWED]->(p:Product)
      WHERE p.productId IN $productIds
        AND r.comment IS NOT NULL
      WITH
        collect(r) AS reviewRelations,
        collect({
        productId: p.productId,
        productName: p.name
        }) AS reviews
      FOREACH (review IN reviewRelations | REMOVE review.comment)
      RETURN reviews
      `,
      {
        username,
        productIds: parsedProductIds
      }
    );

    const reviews = result.records[0]?.get('reviews') || [];
    const updatedReviews = reviews.map((review) => ({
      productId: toNativeNumber(review.productId),
      productName: review.productName
    }));

    return res.status(200).json({
      message: 'Comentarios eliminados correctamente',
      username,
      requested: parsedProductIds.length,
      updated: updatedReviews.length,
      reviews: updatedReviews
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al eliminar comentarios en bulk',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

module.exports = {
  getUserReviews,
  addReviewComment,
  addReviewCommentBulk,
  updateReviewRatingBulk,
  deleteReviewComment,
  deleteReviewCommentsBulk
};
