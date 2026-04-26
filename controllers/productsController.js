const { driver } = require('../db/connection');
const { toNativeNumber } = require('../utils/neo4j');

const getProducts = async (req, res) => {
  const { search, category } = req.query;
  const normalizedSearch = search?.trim() || null;
  const normalizedCategory = category?.trim() || null;
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (p:Product)
      OPTIONAL MATCH (p)-[:BELONGS_TO]->(b:Brand)
      OPTIONAL MATCH (p)-[:HAS_CATEGORY]->(c:Category)
      WITH p, b, collect(DISTINCT c.name) AS categories
      WHERE ($search IS NULL OR toLower(p.name) CONTAINS toLower($search))
        AND ($category IS NULL OR $category IN categories)
      RETURN
        p.productId AS productId,
        p.name AS name,
        p.price AS price,
        b.name AS brand,
        categories AS categories
      ORDER BY p.name
      LIMIT 20
      `,
      {
        search: normalizedSearch,
        category: normalizedCategory
      }
    );

    const products = result.records.map((record) => ({
      productId: toNativeNumber(record.get('productId')),
      name: record.get('name'),
      price: record.get('price'),
      brand: record.get('brand'),
      categories: record.get('categories')
    }));

    return res.status(200).json({
      total: products.length,
      products
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener productos',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const getProductById = async (req, res) => {
  const productId = Number(req.params.id);

  if (!Number.isInteger(productId)) {
    return res.status(400).json({
      message: 'id debe ser un numero entero'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (p:Product {productId: $productId})
      OPTIONAL MATCH (p)-[:BELONGS_TO]->(b:Brand)
      OPTIONAL MATCH (p)-[:HAS_CATEGORY]->(c:Category)
      OPTIONAL MATCH (p)-[contains:CONTAINS]->(i:Ingredient)
      OPTIONAL MATCH (p)-[suitable:SUITABLE_FOR]->(st:SkinType)
      OPTIONAL MATCH (p)-[targets:TARGETS]->(sc:SkinConcern)
      RETURN
        p AS product,
        b AS brand,
        collect(DISTINCT c) AS categories,
        collect(DISTINCT {
          ingredient: i,
          percentage: contains.percentage,
          position: contains.position,
          isKeyIngredient: contains.isKeyIngredient,
          purpose: contains.purpose
        }) AS ingredients,
        collect(DISTINCT {
          skinType: st,
          efficacyScore: suitable.efficacyScore,
          dermatologistApproved: suitable.dermatologistApproved,
          notes: suitable.notes
        }) AS skinTypes,
        collect(DISTINCT {
          concern: sc,
          efficacyScore: targets.efficacyScore,
          clinicallyTested: targets.clinicallyTested,
          resultsTimeWeeks: targets.resultsTimeWeeks
        }) AS skinConcerns
      `,
      { productId }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        message: 'Producto no encontrado'
      });
    }

    const record = result.records[0];
    const product = record.get('product').properties;
    const brand = record.get('brand')?.properties || null;

    return res.status(200).json({
      product: {
        productId: toNativeNumber(product.productId),
        name: product.name,
        description: product.description,
        price: product.price,
        size: product.size,
        rating: product.rating,
        isVegan: product.isVegan,
        isCrueltyFree: product.isCrueltyFree,
        tags: product.tags,
        launchDate: product.launchDate?.toString(),
        finish: product.finish,
        shade: product.shade,
        pageRankScore: product.pageRankScore
      },
      brand: brand && {
        name: brand.name,
        country: brand.country,
        foundedYear: toNativeNumber(brand.foundedYear),
        isLuxury: brand.isLuxury,
        certifications: brand.certifications,
        description: brand.description
      },
      categories: record.get('categories')
        .filter(Boolean)
        .map((category) => category.properties),
      ingredients: record.get('ingredients')
        .filter((item) => item.ingredient)
        .map((item) => ({
          name: item.ingredient.properties.name,
          concentration: item.ingredient.properties.concentration,
          benefits: item.ingredient.properties.benefits,
          warnings: item.ingredient.properties.warnings,
          phOptimal: item.ingredient.properties.phOptimal,
          relationship: {
            percentage: item.percentage,
            position: toNativeNumber(item.position),
            isKeyIngredient: item.isKeyIngredient,
            purpose: item.purpose
          }
        })),
      skinTypes: record.get('skinTypes')
        .filter((item) => item.skinType)
        .map((item) => ({
          name: item.skinType.properties.name,
          description: item.skinType.properties.description,
          characteristics: item.skinType.properties.characteristics,
          recommendedRoutine: item.skinType.properties.recommendedRoutine,
          avoidIngredients: item.skinType.properties.avoidIngredients,
          relationship: {
            efficacyScore: item.efficacyScore,
            dermatologistApproved: item.dermatologistApproved,
            notes: item.notes
          }
        })),
      skinConcerns: record.get('skinConcerns')
        .filter((item) => item.concern)
        .map((item) => ({
          name: item.concern.properties.name,
          description: item.concern.properties.description,
          triggers: item.concern.properties.triggers,
          recommendedIngredients: item.concern.properties.recommendedIngredients,
          relationship: {
            efficacyScore: item.efficacyScore,
            clinicallyTested: item.clinicallyTested,
            resultsTimeWeeks: toNativeNumber(item.resultsTimeWeeks)
          }
        }))
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener producto',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const getProductReviews = async (req, res) => {
  const productId = Number(req.params.id);

  if (!Number.isInteger(productId)) {
    return res.status(400).json({
      message: 'id debe ser un numero entero'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User)-[r:REVIEWED]->(p:Product {productId: $productId})
      RETURN
        u.username AS username,
        r.rating AS rating,
        r.comment AS comment,
        r.reviewDate AS reviewDate
      ORDER BY reviewDate DESC
      `,
      { productId }
    );

    const reviews = result.records.map((record) => ({
      username: record.get('username'),
      rating: record.get('rating'),
      comment: record.get('comment'),
      reviewDate: record.get('reviewDate')?.toString()
    }));

    return res.status(200).json({
      total: reviews.length,
      reviews
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener reviews del producto',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const getSimilarProducts = async (req, res) => {
  const productId = Number(req.params.id);

  if (!Number.isInteger(productId)) {
    return res.status(400).json({
      message: 'id debe ser un numero entero'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (p:Product {productId: $productId})-[similarity:SIMILAR_TO]-(similar:Product)
      OPTIONAL MATCH (similar)-[:BELONGS_TO]->(b:Brand)
      RETURN
        similar.productId AS productId,
        similar.name AS name,
        similar.price AS price,
        b.name AS brand
      ORDER BY similarity.similarityScore DESC
      `,
      { productId }
    );

    const products = result.records.map((record) => ({
      productId: toNativeNumber(record.get('productId')),
      name: record.get('name'),
      price: record.get('price'),
      brand: record.get('brand')
    }));

    return res.status(200).json({
      total: products.length,
      products
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener productos similares',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const createProductReview = async (req, res) => {
  const productId = Number(req.params.id);
  const { username, rating, comment, wouldRecommend } = req.body;
  const parsedRating = Number(rating);

  if (!Number.isInteger(productId)) {
    return res.status(400).json({
      message: 'id debe ser un numero entero'
    });
  }

  if (!username) {
    return res.status(400).json({
      message: 'username es requerido'
    });
  }

  if (!Number.isFinite(parsedRating)) {
    return res.status(400).json({
      message: 'rating debe ser numerico'
    });
  }

  if (typeof wouldRecommend !== 'boolean') {
    return res.status(400).json({
      message: 'wouldRecommend debe ser booleano'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})
      MATCH (p:Product {productId: $productId})
      OPTIONAL MATCH (u)-[existing:REVIEWED]->(p)
      WITH u, p, existing
      WHERE existing IS NULL
      CREATE (u)-[r:REVIEWED {
        rating: $rating,
        comment: $comment,
        reviewDate: date(),
        wouldRecommend: $wouldRecommend
      }]->(p)
      RETURN
        u.username AS username,
        r.rating AS rating,
        r.comment AS comment,
        r.reviewDate AS reviewDate,
        r.wouldRecommend AS wouldRecommend
      `,
      {
        username,
        productId,
        rating: parsedRating,
        comment: comment?.trim() || null,
        wouldRecommend
      }
    );

    if (result.records.length === 0) {
      return res.status(409).json({
        message: 'El usuario ya tiene una review para este producto, o el usuario/producto no existe'
      });
    }

    const record = result.records[0];

    return res.status(201).json({
      message: 'Review creada correctamente',
      review: {
        username: record.get('username'),
        rating: record.get('rating'),
        comment: record.get('comment'),
        reviewDate: record.get('reviewDate')?.toString(),
        wouldRecommend: record.get('wouldRecommend')
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al crear review del producto',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductReviews,
  getSimilarProducts,
  createProductReview
};
