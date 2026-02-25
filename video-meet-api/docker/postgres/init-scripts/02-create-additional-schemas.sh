#!/bin/bash
set -e

for schema_name in ${POSTGRES_ADDITIONAL_SCHEMAS//,/ }; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE SCHEMA IF NOT EXISTS $schema_name;
    GRANT ALL PRIVILEGES ON SCHEMA $schema_name TO "$POSTGRES_USER";
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA $schema_name TO "$POSTGRES_USER";
EOSQL
done