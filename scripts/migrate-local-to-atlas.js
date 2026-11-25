const path = require('path');
const { isDeepStrictEqual } = require('util');

require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { MongoClient } = require('../server/node_modules/mongodb');

const localName = 'online_voting_samarth_local';
const localUri = `mongodb://127.0.0.1:27017/${localName}`;
const atlasUri = process.env.DATABASE;

async function main() {
  if (!atlasUri || !atlasUri.startsWith('mongodb+srv://')) {
    throw new Error('server/.env DATABASE must contain an Atlas SRV connection string.');
  }

  const atlasName = new URL(atlasUri).pathname.slice(1);
  if (!atlasName || atlasName === localName) {
    throw new Error('Specify a distinct Atlas database name in DATABASE.');
  }

  const localClient = new MongoClient(localUri);
  const atlasClient = new MongoClient(atlasUri);
  try {
    await Promise.all([localClient.connect(), atlasClient.connect()]);
    const local = localClient.db(localName);
    const atlas = atlasClient.db(atlasName);
    const collections = (await local.listCollections({}, { nameOnly: true }).toArray())
      .map(({ name }) => name)
      .filter(name => !name.startsWith('system.'));
    if (!collections.length) throw new Error('Local database has no collections to migrate.');

    // Never merge into a populated destination without a separate review.
    for (const name of collections) {
      const count = await atlas.collection(name).countDocuments();
      if (count) throw new Error(`Atlas collection ${name} already has ${count} documents; migration stopped.`);
    }

    for (const name of collections) {
      const source = await local.collection(name).find({}).toArray();
      if (source.length) await atlas.collection(name).insertMany(source);
      for (const document of source) {
        const copied = await atlas.collection(name).findOne({ _id: document._id });
        if (!isDeepStrictEqual(document, copied)) {
          throw new Error(`Verification failed for collection ${name}.`);
        }
      }
      console.log(`${name}: copied and verified ${source.length} documents`);
    }
    console.log(`Migration verified in Atlas database ${atlasName}.`);
  } finally {
    await Promise.all([localClient.close(), atlasClient.close()]);
  }
}

main().catch(error => {
  // Avoid printing a connection string if a driver error includes one.
  console.error(String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted URI]'));
  process.exitCode = 1;
});
