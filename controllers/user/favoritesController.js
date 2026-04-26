const { driver } = require('../../db/connection');
const { toNativeNumber } = require('../../utils/neo4j');

const getUserFavorites = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({
      message: 'userId es requerido'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $userId})-[f:FAVORITED]->(p:Product)
      OPTIONAL MATCH (p)-[:BELONGS_TO]->(b:Brand)
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
        b.name AS brand,
        f.addedAt AS addedAt,
        f.notes AS notes,
        f.isPurchased AS isPurchased
      ORDER BY f.addedAt DESC
      `,
      { userId }
    );

    const favorites = result.records.map((record) => ({
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
        shade: record.get('shade'),
        brand: record.get('brand')
      },
      favorite: {
        addedAt: record.get('addedAt')?.toString(),
        notes: record.get('notes'),
        isPurchased: record.get('isPurchased')
      }
    }));

    return res.status(200).json({
      userId,
      total: favorites.length,
      favorites
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener favoritos del usuario',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

module.exports = { getUserFavorites };
