const { driver } = require('../../db/connection');

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
        p.description AS description,
        p.price AS price,
        p.size AS size,
        p.rating AS rating,
        p.isVegan AS isVegan,
        p.isCrueltyFree AS isCrueltyFree,
        p.tags AS tags,
        p.finish AS finish,
        p.shade AS shade,
        sf.efficacyScore AS efficacyScore,
        sf.dermatologistApproved AS dermatologistApproved,
        sf.notes AS notes
      ORDER BY rand()
      LIMIT 20
      `,
      { username }
    );

    const recommendations = result.records.map((record) => ({
      skinType: record.get('skinType'),
      product: {
        productId: record.get('productId')?.toNumber(),
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
      suitability: {
        efficacyScore: record.get('efficacyScore'),
        dermatologistApproved: record.get('dermatologistApproved'),
        notes: record.get('notes')
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
