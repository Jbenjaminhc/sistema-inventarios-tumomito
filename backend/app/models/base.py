from sqlalchemy.orm import declarative_base


# Base declarativa única para TODO el proyecto.
# Todos los modelos deben heredar de esta Base (directamente o vía app.core.database.Base).
Base = declarative_base()
