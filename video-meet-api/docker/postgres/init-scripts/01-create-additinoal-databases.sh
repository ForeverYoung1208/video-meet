#!/bin/bash
set -e

for dbname in ${POSTGRES_ADDITIONAL_DATABASES//,/ }; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE $dbname;
    GRANT ALL PRIVILEGES ON DATABASE "$dbname" TO "$POSTGRES_USER";
EOSQL
done

for dbname in ${POSTGRES_ADDITIONAL_DATABASES//,/ }; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$RO_USER') THEN
        CREATE USER $RO_USER WITH PASSWORD '$RO_PASSWORD';
      END IF;
    END \$\$;
    
    -- Grant connect and usage
    GRANT CONNECT ON DATABASE "$dbname" TO "$RO_USER";
    GRANT USAGE ON SCHEMA public TO "$RO_USER";
    
    -- Grant read-only permissions
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO "$RO_USER";
    GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO "$RO_USER";
    
    -- Set default privileges for future tables
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO "$RO_USER";
    
    -- Grant execute on functions if needed (read-only)
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO "$RO_USER";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO "$RO_USER";
EOSQL
done