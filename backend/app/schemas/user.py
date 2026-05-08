from pydantic import BaseModel, Field

# Base del usuario compartida por múltiples esquemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)

# Esquema para creación de usuario (input)
class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field(..., max_length=20)

# Esquema para respuesta de usuario (output)
class UserResponse(UserBase):
    id: int
    role: str

    class Config:
        from_attributes = True  # Habilita compatibilidad con modelos ORM
