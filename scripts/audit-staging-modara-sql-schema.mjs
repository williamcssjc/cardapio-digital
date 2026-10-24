import { project, stagingSql } from './lib/staging-database.mjs'
import { assertCleanupForeignKeyCoverage, assertSchemaSnapshot, MIGRATION_SOURCES, SCHEMA_METADATA_SQL } from './lib/staging-anonymous-schema.mjs'

if (project !== 'tjsztjssiatxcqgloazw') throw new Error('Unexpected Supabase project')
const audit = JSON.parse(stagingSql(SCHEMA_METADATA_SQL))
assertSchemaSnapshot(audit.relations)
assertCleanupForeignKeyCoverage(audit.relations)
const foreignKeys = audit.relations.flatMap(relation => (relation.foreign_keys ?? []).map(fk => ({
  child: `${relation.table}.${fk.columns.join(',')}`,
  parent: `${fk.references}.${fk.referenced_columns.join(',')}`,
  onDelete: fk.on_delete,
})))
console.log(JSON.stringify({ project, migrationHistoryRelation: audit.migration_history_relation, sourceMigrationsReviewed: MIGRATION_SOURCES, schemaContract: 'PASS', relationCount: audit.relations.length, foreignKeys }, null, 2))
