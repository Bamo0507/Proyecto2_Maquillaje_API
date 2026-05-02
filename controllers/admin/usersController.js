const { driver } = require('../../db/connection');
const { toNativeNumber } = require('../../utils/neo4j');

const mapUserRecord = (record) => ({
  username: record.get('username'),
  email: record.get('email'),
  isPremium: record.get('isPremium'),
  role: record.get('labels')?.includes('Admin') ? 'admin' : 'user',
  age: toNativeNumber(record.get('age')),
  country: record.get('country'),
  preferences: record.get('preferences'),
  monthlyBudget: record.get('monthlyBudget')
});

const validateUsernames = (usernames) => (
  Array.isArray(usernames)
  && usernames.length > 0
  && usernames.every((username) => typeof username === 'string' && username.trim())
);

const getUsers = async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User)
      RETURN
        u.username AS username,
        u.email AS email,
        u.isPremium AS isPremium,
        labels(u) AS labels,
        u.age AS age,
        u.country AS country,
        u.preferences AS preferences,
        u.monthlyBudget AS monthlyBudget
      ORDER BY u.username
      `
    );

    const users = result.records.map(mapUserRecord);

    return res.status(200).json({
      total: users.length,
      users
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener usuarios',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const createUser = async (req, res) => {
  const {
    username,
    email,
    password,
    age,
    country,
    preferences,
    monthlyBudget,
    isPremium = false,
    isAdmin = false
  } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      message: 'username, email y password son requeridos'
    });
  }

  if (preferences && !Array.isArray(preferences)) {
    return res.status(400).json({
      message: 'preferences debe ser una lista'
    });
  }

  if (typeof isPremium !== 'boolean' || typeof isAdmin !== 'boolean') {
    return res.status(400).json({
      message: 'isPremium e isAdmin deben ser booleanos'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      OPTIONAL MATCH (existing:User)
      WHERE existing.username = $username OR existing.email = $email
      WITH count(existing) AS existingCount
      WHERE existingCount = 0
      MATCH (defaultSkinType:SkinType {name: "Normal"})
      MATCH (defaultConcern:SkinConcern {name: "Deshidratación"})
      CREATE (u:User {
        username: $username,
        email: $email,
        password: $password,
        isPremium: $isPremium
      })
      SET
        u.age = $age,
        u.country = $country,
        u.preferences = $preferences,
        u.monthlyBudget = $monthlyBudget
      FOREACH (_ IN CASE WHEN $isAdmin THEN [1] ELSE [] END | SET u:Admin)
      CREATE (u)-[:HAS_SKIN_TYPE {
        area: "rostro",
        confirmedAt: date(),
        selfDiagnosed: true,
        sensitivity: "low"
      }]->(defaultSkinType)
      CREATE (u)-[:HAS_CONCERN {
        isPrimary: true,
        severity: 2,
        since: date()
      }]->(defaultConcern)
      RETURN
        u.username AS username,
        u.email AS email,
        u.isPremium AS isPremium,
        labels(u) AS labels,
        u.age AS age,
        u.country AS country,
        u.preferences AS preferences,
        u.monthlyBudget AS monthlyBudget
      `,
      {
        username,
        email,
        password,
        isPremium,
        age: age ?? null,
        country: country ?? null,
        preferences: preferences ?? [],
        monthlyBudget: monthlyBudget ?? null,
        isAdmin
      }
    );

    if (result.records.length === 0) {
      return res.status(409).json({
        message: 'Ya existe un usuario con ese username o email'
      });
    }

    return res.status(201).json({
      message: 'Usuario creado correctamente',
      user: mapUserRecord(result.records[0])
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al crear usuario',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const updateUser = async (req, res) => {
  const { username } = req.params;
  const {
    email,
    password,
    age,
    country,
    preferences,
    monthlyBudget,
    isPremium
  } = req.body;

  if (!username) {
    return res.status(400).json({
      message: 'username es requerido'
    });
  }

  if (preferences && !Array.isArray(preferences)) {
    return res.status(400).json({
      message: 'preferences debe ser una lista'
    });
  }

  if (isPremium !== undefined && typeof isPremium !== 'boolean') {
    return res.status(400).json({
      message: 'isPremium debe ser booleano'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})
      SET
        u.email = coalesce($email, u.email),
        u.password = coalesce($password, u.password),
        u.age = coalesce($age, u.age),
        u.country = coalesce($country, u.country),
        u.preferences = coalesce($preferences, u.preferences),
        u.monthlyBudget = coalesce($monthlyBudget, u.monthlyBudget),
        u.isPremium = coalesce($isPremium, u.isPremium)
      RETURN
        u.username AS username,
        u.email AS email,
        u.isPremium AS isPremium,
        labels(u) AS labels,
        u.age AS age,
        u.country AS country,
        u.preferences AS preferences,
        u.monthlyBudget AS monthlyBudget
      `,
      {
        username,
        email: email ?? null,
        password: password ?? null,
        age: age ?? null,
        country: country ?? null,
        preferences: preferences ?? null,
        monthlyBudget: monthlyBudget ?? null,
        isPremium: isPremium ?? null
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    return res.status(200).json({
      message: 'Usuario actualizado correctamente',
      user: mapUserRecord(result.records[0])
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al actualizar usuario',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const updateUsersMonthlyBudget = async (req, res) => {
  const { usernames, monthlyBudget } = req.body;

  if (!validateUsernames(usernames)) {
    return res.status(400).json({
      message: 'usernames debe ser una lista con al menos un username'
    });
  }

  if (!Number.isFinite(Number(monthlyBudget))) {
    return res.status(400).json({
      message: 'monthlyBudget debe ser numerico'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User)
      WHERE u.username IN $usernames
      SET u.monthlyBudget = $monthlyBudget
      RETURN u.username AS username
      ORDER BY username
      `,
      {
        usernames,
        monthlyBudget: Number(monthlyBudget)
      }
    );

    const updated = result.records.map((record) => record.get('username'));

    return res.status(200).json({
      message: 'Monthly budget actualizado correctamente',
      requested: usernames.length,
      updated: updated.length,
      usernames: updated
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al actualizar monthly budget en bulk',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const updateUsersPremium = async (req, res) => {
  const { usernames, isPremium } = req.body;

  if (!validateUsernames(usernames)) {
    return res.status(400).json({
      message: 'usernames debe ser una lista con al menos un username'
    });
  }

  if (typeof isPremium !== 'boolean') {
    return res.status(400).json({
      message: 'isPremium debe ser booleano'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User)
      WHERE u.username IN $usernames
      SET u.isPremium = $isPremium
      RETURN u.username AS username
      ORDER BY username
      `,
      { usernames, isPremium }
    );

    const updated = result.records.map((record) => record.get('username'));

    return res.status(200).json({
      message: 'Premium actualizado correctamente',
      requested: usernames.length,
      updated: updated.length,
      usernames: updated
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al actualizar premium en bulk',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const deleteUserMonthlyBudget = async (req, res) => {
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
      MATCH (u:User {username: $username})
      REMOVE u.monthlyBudget
      RETURN u.username AS username
      `,
      { username }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    return res.status(200).json({
      message: 'Monthly budget eliminado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al eliminar monthly budget',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const deleteUsersMonthlyBudget = async (req, res) => {
  const { usernames } = req.body;

  if (!validateUsernames(usernames)) {
    return res.status(400).json({
      message: 'usernames debe ser una lista con al menos un username'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User)
      WHERE u.username IN $usernames
      REMOVE u.monthlyBudget
      RETURN u.username AS username
      ORDER BY username
      `,
      { usernames }
    );

    const updated = result.records.map((record) => record.get('username'));

    return res.status(200).json({
      message: 'Monthly budget eliminado correctamente',
      requested: usernames.length,
      updated: updated.length,
      usernames: updated
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al eliminar monthly budget en bulk',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const deleteUser = async (req, res) => {
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
      MATCH (u:User {username: $username})
      WITH u, u.username AS deletedUsername
      DETACH DELETE u
      RETURN deletedUsername AS username
      `,
      { username }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    return res.status(200).json({
      message: 'Usuario eliminado correctamente',
      username: result.records[0].get('username')
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al eliminar usuario',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const deleteUsersBulk = async (req, res) => {
  const { usernames } = req.body;

  if (!validateUsernames(usernames)) {
    return res.status(400).json({
      message: 'usernames debe ser una lista con al menos un username'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User)
      WHERE u.username IN $usernames
      WITH collect(u.username) AS deletedUsernames, collect(u) AS users
      FOREACH (user IN users | DETACH DELETE user)
      RETURN deletedUsernames
      `,
      { usernames }
    );

    const deleted = result.records[0]?.get('deletedUsernames') || [];

    return res.status(200).json({
      message: 'Usuarios eliminados correctamente',
      requested: usernames.length,
      deleted: deleted.length,
      usernames: deleted
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al eliminar usuarios en bulk',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  updateUsersMonthlyBudget,
  updateUsersPremium,
  deleteUserMonthlyBudget,
  deleteUsersMonthlyBudget,
  deleteUser,
  deleteUsersBulk
};
