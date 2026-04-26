const { driver } = require('../db/connection');

const getCategories = async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (c:Category)
      RETURN
        c.name AS name,
        c.description AS description,
        c.isForMakeup AS isForMakeup,
        c.subcategories AS subcategories
      ORDER BY c.name
      `
    );

    const categories = result.records.map((record) => ({
      name: record.get('name'),
      description: record.get('description'),
      isForMakeup: record.get('isForMakeup'),
      subcategories: record.get('subcategories')
    }));

    return res.status(200).json({
      total: categories.length,
      categories
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener categorias',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

module.exports = { getCategories };
