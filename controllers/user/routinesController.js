const { driver } = require('../../db/connection');
const { toNativeNumber } = require('../../utils/neo4j');

const getUserRoutines = async (req, res) => {
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
      MATCH (u:User {username: $username})-[hasRoutine:HAS_ROUTINE]->(r:Routine)
      OPTIONAL MATCH (r)-[includes:INCLUDES]->(p:Product)
      OPTIONAL MATCH (p)-[:BELONGS_TO]->(b:Brand)
      WITH r, hasRoutine, p, b, includes
      ORDER BY includes.step
      WITH r, hasRoutine, collect(
        CASE
          WHEN p IS NULL THEN null
          ELSE {
            productId: p.productId,
            name: p.name,
            brand: b.name,
            price: p.price,
            step: includes.step,
            notes: includes.notes,
            mandatory: includes.mandatory
          }
        END
      ) AS products
      RETURN
        r.routineId AS routineId,
        r.name AS name,
        r.timeOfDay AS timeOfDay,
        r.description AS description,
        r.skinFocus AS skinFocus,
        r.targetConcerns AS targetConcerns,
        hasRoutine.startedAt AS startedAt,
        hasRoutine.isActive AS isActive,
        hasRoutine.frequency AS frequency,
        products AS products
      ORDER BY name
      `,
      { username }
    );

    const routines = result.records.map((record) => ({
      routineId: toNativeNumber(record.get('routineId')),
      name: record.get('name'),
      timeOfDay: record.get('timeOfDay'),
      description: record.get('description'),
      skinFocus: record.get('skinFocus'),
      targetConcerns: record.get('targetConcerns'),
      hasRoutine: {
        startedAt: record.get('startedAt')?.toString(),
        isActive: record.get('isActive'),
        frequency: record.get('frequency')
      },
      products: record.get('products')
        .filter(Boolean)
        .map((product) => ({
          productId: toNativeNumber(product.productId),
          name: product.name,
          brand: product.brand,
          price: product.price,
          step: toNativeNumber(product.step),
          notes: product.notes,
          mandatory: product.mandatory
        }))
    }));

    return res.status(200).json({
      username,
      total: routines.length,
      routines
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener rutinas del usuario',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const createRoutine = async (req, res) => {
  const { username } = req.params;
  const {
    name,
    timeOfDay,
    description,
    skinFocus,
    targetConcerns,
    hasRoutine = {}
  } = req.body;

  if (!username) {
    return res.status(400).json({
      message: 'username es requerido'
    });
  }

  if (!name || !timeOfDay) {
    return res.status(400).json({
      message: 'name y timeOfDay son requeridos'
    });
  }

  if (targetConcerns && !Array.isArray(targetConcerns)) {
    return res.status(400).json({
      message: 'targetConcerns debe ser una lista'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})
      OPTIONAL MATCH (existingRoutine:Routine)
      WITH u, coalesce(max(existingRoutine.routineId), 0) + 1 AS nextRoutineId
      CREATE (r:Routine {
        routineId: nextRoutineId,
        name: $name,
        timeOfDay: $timeOfDay,
        description: $description,
        skinFocus: $skinFocus,
        targetConcerns: $targetConcerns
      })
      CREATE (u)-[hasRoutine:HAS_ROUTINE {
        startedAt: date($startedAt),
        isActive: $isActive,
        frequency: $frequency
      }]->(r)
      RETURN r.routineId AS routineId
      `,
      {
        username,
        name,
        timeOfDay,
        description: description || null,
        skinFocus: skinFocus || null,
        targetConcerns: targetConcerns || [],
        startedAt: hasRoutine.startedAt || new Date().toISOString().slice(0, 10),
        isActive: hasRoutine.isActive ?? true,
        frequency: hasRoutine.frequency || null
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    const record = result.records[0];

    return res.status(201).json({
      message: 'Rutina creada correctamente',
      routineId: toNativeNumber(record.get('routineId'))
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al crear rutina',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

const addProductToRoutine = async (req, res) => {
  const { username, routineId } = req.params;
  const { productId, step, notes, mandatory } = req.body;
  const parsedRoutineId = Number(routineId);
  const parsedProductId = Number(productId);
  const parsedStep = Number(step);

  if (!username) {
    return res.status(400).json({
      message: 'username es requerido'
    });
  }

  if (!Number.isInteger(parsedRoutineId)) {
    return res.status(400).json({
      message: 'routineId debe ser un numero entero'
    });
  }

  if (!Number.isInteger(parsedProductId)) {
    return res.status(400).json({
      message: 'productId debe ser un numero entero'
    });
  }

  if (!Number.isInteger(parsedStep)) {
    return res.status(400).json({
      message: 'step debe ser un numero entero'
    });
  }

  if (typeof mandatory !== 'boolean') {
    return res.status(400).json({
      message: 'mandatory debe ser booleano'
    });
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (u:User {username: $username})-[:HAS_ROUTINE]->(r:Routine {routineId: $routineId})
      MATCH (p:Product {productId: $productId})
      OPTIONAL MATCH (r)-[existing:INCLUDES]->(p)
      WITH r, p, existing
      WHERE existing IS NULL
      CREATE (r)-[includes:INCLUDES {
        step: $step,
        notes: $notes,
        mandatory: $mandatory
      }]->(p)
      RETURN
        p.productId AS productId,
        p.name AS productName,
        includes.step AS step
      `,
      {
        username,
        routineId: parsedRoutineId,
        productId: parsedProductId,
        step: parsedStep,
        notes: notes || null,
        mandatory
      }
    );

    if (result.records.length === 0) {
      return res.status(409).json({
        message: 'No se pudo agregar el producto. La rutina/producto no existe o el producto ya esta incluido'
      });
    }

    const record = result.records[0];

    return res.status(201).json({
      message: 'Producto agregado a la rutina correctamente',
      product: {
        productId: toNativeNumber(record.get('productId')),
        name: record.get('productName'),
        step: toNativeNumber(record.get('step'))
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al agregar producto a la rutina',
      error: error.message
    });
  } finally {
    await session.close();
  }
};

module.exports = { getUserRoutines, createRoutine, addProductToRoutine };
