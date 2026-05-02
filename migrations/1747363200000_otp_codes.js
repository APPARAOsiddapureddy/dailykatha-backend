/** @param {import('node-pg-migrate').MigrationBuilder} pgm */

export async function up(pgm) {
  pgm.createTable('otp_codes', {
    phone: { type: 'varchar(15)', primaryKey: true },
    code: { type: 'varchar(10)', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
  pgm.createIndex('otp_codes_expires_idx', 'otp_codes', 'expires_at');
}

export async function down(pgm) {
  pgm.dropTable('otp_codes');
}
