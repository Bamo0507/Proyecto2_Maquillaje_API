const { driver } = require('../../db/connection');
const { toNativeNumber } = require('../../utils/neo4j');

const getUserProfile = async (req, res) => {
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
      CALL {
        WITH u
        OPTIONAL MATCH (u)-[hst:HAS_SKIN_TYPE]->(st:SkinType)
        RETURN collect(
          CASE
            WHEN st IS NULL THEN null
            ELSE {
              name: st.name,
              description: st.description,
              characteristics: st.characteristics,
              recommendedRoutine: st.recommendedRoutine,
              avoidIngredients: st.avoidIngredients,
              confirmedAt: hst.confirmedAt,
              selfDiagnosed: hst.selfDiagnosed,
              sensitivity: hst.sensitivity,
              area: hst.area
            }
          END
        ) AS skinTypes
      }
      CALL {
        WITH u
        OPTIONAL MATCH (u)-[hc:HAS_CONCERN]->(sc:SkinConcern)
        RETURN collect(
          CASE
            WHEN sc IS NULL THEN null
            ELSE {
              name: sc.name,
              description: sc.description,
              triggers: sc.triggers,
              recommendedIngredients: sc.recommendedIngredients,
              severity: hc.severity,
              isPrimary: hc.isPrimary,
              since: hc.since
            }
          END
        ) AS concerns
      }
      CALL {
        WITH u
        OPTIONAL MATCH (u)-[review:REVIEWED]->(:Product)
        RETURN count(review) AS totalReviews, avg(review.rating) AS averageRating
      }
      CALL {
        WITH u
        OPTIONAL MATCH (u)-[favorite:FAVORITED]->(:Product)
        RETURN count(favorite) AS totalFavorites
      }
      CALL {
        WITH u
        OPTIONAL MATCH (u)-[routine:HAS_ROUTINE]->(:Routine)
        RETURN count(routine) AS totalRoutines
      }
      RETURN
        u.username AS username,
        u.email AS email,
        u.isPremium AS isPremium,
        u.age AS age,
        u.country AS country,
        u.preferences AS preferences,
        u.monthlyBudget AS monthlyBudget,
        skinTypes,
        concerns,
        totalReviews,
        averageRating,
        totalFavorites,
        totalRoutines
      `,
      { username }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    const record = result.records[0];

    return res.status(200).json({
      user: {
        username: record.get('username'),
        email: record.get('email'),
        isPremium: record.get('isPremium'),
        age: toNativeNumber(record.get('age')),
        country: record.get('country'),
        preferences: record.get('preferences'),
        monthlyBudget: record.get('monthlyBudget')
      },
      skinTypes: record.get('skinTypes')
        .filter(Boolean)
        .map((skinType) => ({
          ...skinType,
          confirmedAt: skinType.confirmedAt?.toString()
        })),
      concerns: record.get('concerns')
        .filter(Boolean)
        .map((concern) => ({
          ...concern,
          severity: toNativeNumber(concern.severity),
          since: concern.since?.toString()
        })),
      stats: {
        totalReviews: toNativeNumber(record.get('totalReviews')),
        averageRating: record.get('averageRating') || 0,
        totalFavorites: toNativeNumber(record.get('totalFavorites')),
        totalRoutines: toNativeNumber(record.get('totalRoutines'))
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener perfil',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const updateUserProfile = async (req, res) => {
  const { username } = req.params;
  const {
    age,
    country,
    preferences,
    monthlyBudget
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

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})
      SET
        u.age = coalesce($age, u.age),
        u.country = coalesce($country, u.country),
        u.preferences = coalesce($preferences, u.preferences),
        u.monthlyBudget = coalesce($monthlyBudget, u.monthlyBudget)
      RETURN
        u.username AS username,
        u.age AS age,
        u.country AS country,
        u.preferences AS preferences,
        u.monthlyBudget AS monthlyBudget
      `,
      {
        username,
        age: age ?? null,
        country: country ?? null,
        preferences: preferences ?? null,
        monthlyBudget: monthlyBudget ?? null
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    const record = result.records[0];

    return res.status(200).json({
      message: 'Perfil actualizado correctamente',
      user: {
        username: record.get('username'),
        age: toNativeNumber(record.get('age')),
        country: record.get('country'),
        preferences: record.get('preferences'),
        monthlyBudget: record.get('monthlyBudget')
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al actualizar perfil',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const deleteMonthlyBudget = async (req, res) => {
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

const getAvailableSkinTypes = async (req, res) => {
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
      MATCH (st:SkinType)
      WHERE NOT EXISTS {
        MATCH (u)-[:HAS_SKIN_TYPE]->(st)
      }
      RETURN
        st.name AS name,
        st.description AS description,
        st.characteristics AS characteristics,
        st.recommendedRoutine AS recommendedRoutine,
        st.avoidIngredients AS avoidIngredients
      ORDER BY st.name
      `,
      { username }
    );

    const skinTypes = result.records.map((record) => ({
      name: record.get('name'),
      description: record.get('description'),
      characteristics: record.get('characteristics'),
      recommendedRoutine: record.get('recommendedRoutine'),
      avoidIngredients: record.get('avoidIngredients')
    }));

    return res.status(200).json({
      username,
      total: skinTypes.length,
      skinTypes
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener tipos de piel disponibles',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const getAvailableConcerns = async (req, res) => {
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
      MATCH (sc:SkinConcern)
      WHERE NOT EXISTS {
        MATCH (u)-[:HAS_CONCERN]->(sc)
      }
      RETURN
        sc.name AS name,
        sc.description AS description,
        sc.triggers AS triggers,
        sc.recommendedIngredients AS recommendedIngredients
      ORDER BY sc.name
      `,
      { username }
    );

    const concerns = result.records.map((record) => ({
      name: record.get('name'),
      description: record.get('description'),
      triggers: record.get('triggers'),
      recommendedIngredients: record.get('recommendedIngredients')
    }));

    return res.status(200).json({
      username,
      total: concerns.length,
      concerns
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener concerns disponibles',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const addUserSkinType = async (req, res) => {
  const { username } = req.params;
  const { skinTypeName, confirmedAt, selfDiagnosed, sensitivity, area } = req.body;

  if (!username || !skinTypeName) {
    return res.status(400).json({
      message: 'username y skinTypeName son requeridos'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})
      MATCH (st:SkinType {name: $skinTypeName})
      OPTIONAL MATCH (u)-[existing:HAS_SKIN_TYPE]->(st)
      WITH u, st, existing
      WHERE existing IS NULL
      CREATE (u)-[relation:HAS_SKIN_TYPE {
        confirmedAt: date($confirmedAt),
        selfDiagnosed: $selfDiagnosed,
        sensitivity: $sensitivity,
        area: $area
      }]->(st)
      RETURN st.name AS name
      `,
      {
        username,
        skinTypeName,
        confirmedAt: confirmedAt || new Date().toISOString().slice(0, 10),
        selfDiagnosed: selfDiagnosed ?? true,
        sensitivity: sensitivity || null,
        area: area || null
      }
    );

    if (result.records.length === 0) {
      return res.status(409).json({
        message: 'No se pudo agregar el tipo de piel. Usuario/tipo no existe o la relacion ya existe'
      });
    }

    return res.status(201).json({
      message: 'Tipo de piel agregado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al agregar tipo de piel',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const updateUserSkinType = async (req, res) => {
  const { username, skinTypeName } = req.params;
  const { confirmedAt, selfDiagnosed, sensitivity, area } = req.body;

  if (!username || !skinTypeName) {
    return res.status(400).json({
      message: 'username y skinTypeName son requeridos'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})-[relation:HAS_SKIN_TYPE]->(st:SkinType {name: $skinTypeName})
      SET
        relation.confirmedAt = CASE WHEN $confirmedAt IS NULL THEN relation.confirmedAt ELSE date($confirmedAt) END,
        relation.selfDiagnosed = coalesce($selfDiagnosed, relation.selfDiagnosed),
        relation.sensitivity = coalesce($sensitivity, relation.sensitivity),
        relation.area = coalesce($area, relation.area)
      RETURN st.name AS name
      `,
      {
        username,
        skinTypeName,
        confirmedAt: confirmedAt ?? null,
        selfDiagnosed: selfDiagnosed ?? null,
        sensitivity: sensitivity ?? null,
        area: area ?? null
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        message: 'Relacion de tipo de piel no encontrada'
      });
    }

    return res.status(200).json({
      message: 'Tipo de piel actualizado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al actualizar tipo de piel',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const deleteUserSkinType = async (req, res) => {
  const { username, skinTypeName } = req.params;

  if (!username || !skinTypeName) {
    return res.status(400).json({
      message: 'username y skinTypeName son requeridos'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})-[relation:HAS_SKIN_TYPE]->(st:SkinType {name: $skinTypeName})
      DELETE relation
      RETURN st.name AS name
      `,
      { username, skinTypeName }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        message: 'Relacion de tipo de piel no encontrada'
      });
    }

    return res.status(200).json({
      message: 'Tipo de piel eliminado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al eliminar tipo de piel',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const addUserConcern = async (req, res) => {
  const { username } = req.params;
  const { concernName, severity, isPrimary, since } = req.body;
  const parsedSeverity = Number(severity);

  if (!username || !concernName) {
    return res.status(400).json({
      message: 'username y concernName son requeridos'
    });
  }

  if (!Number.isInteger(parsedSeverity)) {
    return res.status(400).json({
      message: 'severity debe ser un numero entero'
    });
  }

  if (typeof isPrimary !== 'boolean') {
    return res.status(400).json({
      message: 'isPrimary debe ser booleano'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})
      MATCH (sc:SkinConcern {name: $concernName})
      OPTIONAL MATCH (u)-[existing:HAS_CONCERN]->(sc)
      WITH u, sc, existing
      WHERE existing IS NULL
      CREATE (u)-[relation:HAS_CONCERN {
        severity: $severity,
        isPrimary: $isPrimary,
        since: date($since)
      }]->(sc)
      RETURN sc.name AS name
      `,
      {
        username,
        concernName,
        severity: parsedSeverity,
        isPrimary,
        since: since || new Date().toISOString().slice(0, 10)
      }
    );

    if (result.records.length === 0) {
      return res.status(409).json({
        message: 'No se pudo agregar el concern. Usuario/concern no existe o la relacion ya existe'
      });
    }

    return res.status(201).json({
      message: 'Concern agregado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al agregar concern',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const updateUserConcern = async (req, res) => {
  const { username, concernName } = req.params;
  const { severity, isPrimary, since } = req.body;
  const parsedSeverity = severity === undefined ? null : Number(severity);

  if (!username || !concernName) {
    return res.status(400).json({
      message: 'username y concernName son requeridos'
    });
  }

  if (severity !== undefined && !Number.isInteger(parsedSeverity)) {
    return res.status(400).json({
      message: 'severity debe ser un numero entero'
    });
  }

  if (isPrimary !== undefined && typeof isPrimary !== 'boolean') {
    return res.status(400).json({
      message: 'isPrimary debe ser booleano'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})-[relation:HAS_CONCERN]->(sc:SkinConcern {name: $concernName})
      SET
        relation.severity = coalesce($severity, relation.severity),
        relation.isPrimary = coalesce($isPrimary, relation.isPrimary),
        relation.since = CASE WHEN $since IS NULL THEN relation.since ELSE date($since) END
      RETURN sc.name AS name
      `,
      {
        username,
        concernName,
        severity: parsedSeverity,
        isPrimary: isPrimary ?? null,
        since: since ?? null
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        message: 'Relacion de concern no encontrada'
      });
    }

    return res.status(200).json({
      message: 'Concern actualizado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al actualizar concern',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const deleteUserConcern = async (req, res) => {
  const { username, concernName } = req.params;

  if (!username || !concernName) {
    return res.status(400).json({
      message: 'username y concernName son requeridos'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})-[relation:HAS_CONCERN]->(sc:SkinConcern {name: $concernName})
      DELETE relation
      RETURN sc.name AS name
      `,
      { username, concernName }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        message: 'Relacion de concern no encontrada'
      });
    }

    return res.status(200).json({
      message: 'Concern eliminado correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al eliminar concern',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  deleteMonthlyBudget,
  getAvailableSkinTypes,
  getAvailableConcerns,
  addUserSkinType,
  updateUserSkinType,
  deleteUserSkinType,
  addUserConcern,
  updateUserConcern,
  deleteUserConcern
};
