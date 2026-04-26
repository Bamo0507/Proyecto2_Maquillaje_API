const { driver } = require('../../db/connection');
const { toNativeNumber } = require('../../utils/neo4j');

const getRoutineRecommendations = async (req, res) => {
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
      MATCH (u:User {username: $username})-[:HAS_ROUTINE]->(r:Routine)
      MATCH (r)-[:INCLUDES]->(baseProduct:Product)
      MATCH (baseProduct)-[s:SIMILAR_TO]-(p:Product)
      RETURN
        r.routineId AS routineId,
        r.name AS routineName,
        baseProduct.productId AS baseProductId,
        baseProduct.name AS baseProductName,
        p.productId AS productId,
        p.name AS name,
        p.description AS description,
        p.price AS price,
        p.size AS size,
        p.rating AS rating,
        p.isVegan AS isVegan,
        p.isCrueltyFree AS isCrueltyFree,
        p.tags AS tags,
        p.finish AS finish,
        p.shade AS shade,
        s.similarityScore AS similarityScore,
        s.reason AS reason,
        s.sharedIngredients AS sharedIngredients
      ORDER BY rand()
      LIMIT 20
      `,
      { username }
    );

    const recommendations = result.records.map((record) => ({
      routine: {
        routineId: toNativeNumber(record.get('routineId')),
        name: record.get('routineName')
      },
      basedOnProduct: {
        productId: toNativeNumber(record.get('baseProductId')),
        name: record.get('baseProductName')
      },
      product: {
        productId: toNativeNumber(record.get('productId')),
        name: record.get('name'),
        description: record.get('description'),
        price: record.get('price'),
        size: record.get('size'),
        rating: record.get('rating'),
        isVegan: record.get('isVegan'),
        isCrueltyFree: record.get('isCrueltyFree'),
        tags: record.get('tags'),
        finish: record.get('finish'),
        shade: record.get('shade')
      },
      similarity: {
        similarityScore: record.get('similarityScore'),
        reason: record.get('reason'),
        sharedIngredients: toNativeNumber(record.get('sharedIngredients'))
      }
    }));

    return res.status(200).json({
      username,
      total: recommendations.length,
      recommendations
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener recomendaciones por rutina',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const getTopRankedProducts = async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (p:Product)
      WHERE p.pageRankScore IS NOT NULL
      RETURN
        p.productId AS productId,
        p.name AS name,
        p.description AS description,
        p.price AS price,
        p.size AS size,
        p.rating AS rating,
        p.isVegan AS isVegan,
        p.isCrueltyFree AS isCrueltyFree,
        p.tags AS tags,
        p.finish AS finish,
        p.shade AS shade,
        p.pageRankScore AS pageRankScore
      ORDER BY p.pageRankScore DESC
      LIMIT 25
      `
    );

    const products = result.records.map((record) => ({
      productId: toNativeNumber(record.get('productId')),
      name: record.get('name'),
      description: record.get('description'),
      price: record.get('price'),
      size: record.get('size'),
      rating: record.get('rating'),
      isVegan: record.get('isVegan'),
      isCrueltyFree: record.get('isCrueltyFree'),
      tags: record.get('tags'),
      finish: record.get('finish'),
      shade: record.get('shade'),
      pageRankScore: record.get('pageRankScore')
    }));

    return res.status(200).json({
      total: products.length,
      products
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener productos top ranked',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

module.exports = { getRoutineRecommendations, getTopRankedProducts };
