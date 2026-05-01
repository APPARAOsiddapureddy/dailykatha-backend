/** @param {import('node-pg-migrate').MigrationBuilder} pgm */

export async function up(pgm) {
  pgm.createTable('users', {
    id: { type: 'serial', primaryKey: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'text' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createTable('quotes', {
    id: { type: 'serial', primaryKey: true },
    category: { type: 'varchar(64)', notNull: true },
    mood: { type: 'varchar(64)', notNull: true },
    section: { type: 'varchar(64)' },
    is_festival: { type: 'boolean', notNull: true, default: false },
    festival: { type: 'varchar(100)' },
    quote_te: { type: 'text' },
    quote_hi: { type: 'text' },
    quote_ta: { type: 'text' },
    quote_kn: { type: 'text' },
    quote_ml: { type: 'text' },
    quote_en: { type: 'text' },
    author_te: { type: 'text' },
    author_hi: { type: 'text' },
    author_ta: { type: 'text' },
    author_kn: { type: 'text' },
    author_ml: { type: 'text' },
    author_en: { type: 'text' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('quotes', 'category', { name: 'idx_quotes_category' });
  pgm.createIndex('quotes', 'mood', { name: 'idx_quotes_mood' });
  pgm.createIndex('quotes', 'section', { name: 'idx_quotes_section' });

  pgm.createTable('favorites', {
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users',
      referencesConstraintName: 'favorites_user_id_fkey',
      onDelete: 'CASCADE',
    },
    quote_id: {
      type: 'integer',
      notNull: true,
      references: 'quotes',
      referencesConstraintName: 'favorites_quote_id_fkey',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
  pgm.addConstraint('favorites', 'favorites_user_quote_unique', {
    unique: ['user_id', 'quote_id'],
  });
  pgm.createIndex('favorites', 'user_id', { name: 'idx_favorites_user' });

  pgm.createTable('api_logs', {
    id: { type: 'serial', primaryKey: true },
    request_id: { type: 'varchar(200)' },
    endpoint: { type: 'text', notNull: true },
    method: { type: 'varchar(16)', notNull: true },
    status_code: { type: 'integer', notNull: true },
    response_time_ms: { type: 'integer' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
  pgm.createIndex('api_logs', 'created_at', { name: 'idx_api_logs_created_at' });
}

export async function down(pgm) {
  pgm.dropTable('api_logs', { cascade: true });
  pgm.dropTable('favorites', { cascade: true });
  pgm.dropTable('quotes', { cascade: true });
  pgm.dropTable('users', { cascade: true });
}
