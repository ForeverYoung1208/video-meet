FROM postgres:17.5

# Install the postgresql debugger - uncomment here and in postgresql.conf if you want to debug plpgsql procedures
# RUN apt-get update \
#   && apt-get install -y --no-install-recommends \
#   postgresql-17-pldebugger \
#   mc

ENV PGDATA /var/lib/postgresql/data

COPY ./docker/postgres/postgresql.conf /etc/postgresql.conf
#CMD [ "postgres", "-c", "log_statement=all", "-c", "config_file=/etc/postgresql.conf" ]
CMD [ "postgres", "-c", "config_file=/etc/postgresql.conf" ]

EXPOSE 5432
