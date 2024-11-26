const tables = [
    {
        id: 'create_institutes',
        sql: function () {
            return `
                CREATE TABLE IF NOT EXISTS institutes (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL
                );
            `;
        }
    },
    {
        id: 'create_users',
        sql: function () {
            return `
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    tg_chat_id BIGINT NOT NULL,
                    tg_username TEXT,
                    access_level INTEGER CHECK (access_level >= 0 AND access_level <= 2),
                    institute_id INTEGER REFERENCES institutes(id) ON DELETE SET NULL
                );
            `;
        }
    },
    {
        id: 'add_poly_id_to_institutes',
        sql: function () {
            return `
                ALTER TABLE institutes
                ADD COLUMN poly_id INTEGER;
            `;
        }
    },
    {
        id: 'fill_institutes_data',
        sql: function () {
            return `
                INSERT INTO institutes (name, poly_id)
                VALUES
                    ('ФизМех', 50),
                    ('ИЭиТ', 49),
                    ('ГИ', 38),
                    ('ИЭ', 32),
                    ('ИППТ', 43),
                    ('ИСИ', 31),
                    ('ИПМЭиТ', 37),
                    ('ИФКСиТ', 42),
                    ('ИБСиБ', 47),
                    ('ИММиТ', 33),
                    ('ИКНК', 51);
            `;
        }
    },
    {
        id: 'add_unique_constraint_on_tg_chat_id',
        sql: function () {
            return `
                ALTER TABLE users
                ADD CONSTRAINT unique_tg_chat_id UNIQUE (tg_chat_id);
            `;
        }
    },
    {
        id: 'add_poly_id_to_institutes',
        sql: function () {
            return `
                ALTER TABLE institutes
                ADD COLUMN poly_id INTEGER;
            `;
        }
    },
    {
        id: 'create_chats_list',
        sql: function () {
            return `
                CREATE TABLE IF NOT EXISTS chats_list (
                    id SERIAL PRIMARY KEY,
                    institute_id INTEGER REFERENCES institutes(id) ON DELETE CASCADE,
                    owner_tg_chat_id BIGINT NOT NULL,
                    chat_link TEXT NOT NULL,
                    direction TEXT NOT NULL
                );
            `;
        }
    },
    {
        id: 'create_chat_add_requests',
        sql: function () {
            return `
                CREATE TABLE IF NOT EXISTS chat_add_requests (
                    id SERIAL PRIMARY KEY,
                    institute_id INTEGER REFERENCES institutes(id) ON DELETE CASCADE,
                    requester_tg_chat_id BIGINT NOT NULL,
                    chat_link TEXT NOT NULL,
                    direction TEXT NOT NULL
                );
            `;
        }
    }
];

module.exports = function (connection) {
    const migrationsTable = 'migrations';

    const runMigrations = async () => {
        try {
            const createMigrationsTableSQL = `
                CREATE TABLE IF NOT EXISTS ${migrationsTable} (
                    id VARCHAR(255) PRIMARY KEY,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `;
            await connection.query(createMigrationsTableSQL);

            console.log('Verifying migrations state...');
            for (const migration of tables) {
                const checkMigrationSQL = `SELECT id FROM ${migrationsTable} WHERE id = $1`;
                const res = await connection.query(checkMigrationSQL, [migration.id]);

                if (res.rows.length === 0) {
                    await connection.query(migration.sql());
                    console.log(`Migration applied: ${migration.id}`);

                    const insertMigrationSQL = `INSERT INTO ${migrationsTable} (id) VALUES ($1)`;
                    await connection.query(insertMigrationSQL, [migration.id]);
                }
            }

            return true;
        } catch (err) {
            console.error('Error during migration:', err.stack);
        }
    };

    runMigrations().then(r => console.log('Migration state restored.'));
}
