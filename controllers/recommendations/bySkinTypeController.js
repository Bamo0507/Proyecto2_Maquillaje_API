const { driver } = require('../../db/connection');
const { toNativeNumber } = require('../../utils/neo4j');

const getRecommendationsBySkinType = async (req, res) => {
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
      MATCH (u:User {username: $username})-[:HAS_SKIN_TYPE]->(st:SkinType)
      MATCH (p:Product)-[sf:SUITABLE_FOR]->(st)
      RETURN
        st.name AS skinType,
        p.productId AS productId,
        p.name AS name,
        p.price AS price,
        p.size AS size,
        p.rating AS rating,
        p.isVegan AS isVegan,
        p.isCrueltyFree AS isCrueltyFree,
        sf.efficacyScore AS efficacyScore,
        sf.dermatologistApproved AS dermatologistApproved
      ORDER BY rand()
      LIMIT 20
      `,
      { username }
    );

    const recommendations = result.records.map((record) => ({
      skinType: record.get('skinType'),
      product: {
        productId: toNativeNumber(record.get('productId')),
        name: record.get('name'),
        price: record.get('price'),
        size: record.get('size'),
        rating: record.get('rating'),
        isVegan: record.get('isVegan'),
        isCrueltyFree: record.get('isCrueltyFree')
      },
      suitability: {
        efficacyScore: record.get('efficacyScore'),
        dermatologistApproved: record.get('dermatologistApproved')
      }
    }));

    return res.status(200).json({
      username,
      total: recommendations.length,
      recommendations
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener recomendaciones por tipo de piel',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

module.exports = { getRecommendationsBySkinType };
