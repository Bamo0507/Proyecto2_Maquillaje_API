const { driver } = require('../../db/connection');
const { toNativeNumber } = require('../../utils/neo4j');

const getRecommendationsBySkinConcern = async (req, res) => {
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
      MATCH (u:User {username: $username})-[:HAS_CONCERN]->(sc:SkinConcern)
      MATCH (p:Product)-[t:TARGETS]->(sc)
      RETURN
        sc.name AS skinConcern,
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
        t.efficacyScore AS efficacyScore,
        t.clinicallyTested AS clinicallyTested,
        t.resultsTimeWeeks AS resultsTimeWeeks
      ORDER BY rand()
      LIMIT 20
      `,
      { username }
    );

    const recommendations = result.records.map((record) => ({
      skinConcern: record.get('skinConcern'),
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
      targeting: {
        efficacyScore: record.get('efficacyScore'),
        clinicallyTested: record.get('clinicallyTested'),
        resultsTimeWeeks: toNativeNumber(record.get('resultsTimeWeeks'))
      }
    }));

    return res.status(200).json({
      username,
      total: recommendations.length,
      recommendations
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener recomendaciones por preocupaciones de piel',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

module.exports = { getRecommendationsBySkinConcern };
