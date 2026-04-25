const { driver } = require('../../db/connection');

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: 'username y password son requeridos'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username, password: $password})
      RETURN u.username AS username, u.isPremium AS isPremium, labels(u) AS labels
      `,
      { username, password }
    );

    if (result.records.length === 0) {
      return res.status(401).json({
        message: 'Credenciales invalidas'
      });
    }

    const record = result.records[0];
    const labels = record.get('labels');
    const role = labels.includes('Admin') ? 'admin' : 'user';

    return res.status(200).json({
      message: 'Login exitoso',
      user: {
        username: record.get('username'),
        isPremium: record.get('isPremium'),
        role
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al iniciar sesion',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

module.exports = { login };
