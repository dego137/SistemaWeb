# schemas.py
from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    username: str
    first_name: str
    last_name: str
    email: str
    phone_number: str
    dni: str
    status: str
    role: str
    url_video: Optional[str] = None  # Add url_video field

    class Config:
        orm_mode = True

class UserCreate(UserBase):
    password: str
    url_video: Optional[str] = None  # Optional for creation

class UserUpdate(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    dni: Optional[str] = None
    status: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    url_video: Optional[str] = None  # Add url_video for updates

    class Config:
        orm_mode = True

class User(UserBase):
    id: int

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class Login(BaseModel):
    username: str
    password: str

class PasswordReset(BaseModel):
    username: str
    new_password: str