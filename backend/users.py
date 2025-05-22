from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Role
from schemas import User as UserSchema, UserCreate, UserUpdate
from auth import get_current_user, pwd_context

router = APIRouter()

@router.get("/me", response_model=UserSchema)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/", response_model=list[UserSchema])
def read_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    try:
        users = db.query(User).all()
        if not users:
            return []
        return users
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching users: {str(e)}")

@router.post("/", response_model=UserSchema)
def create_user(user: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")
    db_user = db.query(User).filter(User.dni == user.dni).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="DNI already registered")
    try:
        hashed_password = pwd_context.hash(user.password)
        db_user = User(
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            phone_number=user.phone_number,
            dni=user.dni,
            status=user.status,
            password=hashed_password,
            role=user.role
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creating user: {str(e)}")

@router.put("/{user_id}", response_model=UserSchema)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        update_data = user.dict(exclude_unset=True)
        if "password" in update_data and update_data["password"]:
            update_data["password"] = pwd_context.hash(update_data["password"])
        if "username" in update_data and update_data["username"]:
            existing_user = db.query(User).filter(User.username == update_data["username"]).first()
            if existing_user and existing_user.id != user_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")
        if "email" in update_data and update_data["email"]:
            existing_user = db.query(User).filter(User.email == update_data["email"]).first()
            if existing_user and existing_user.id != user_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        if "dni" in update_data and update_data["dni"]:
            existing_user = db.query(User).filter(User.dni == update_data["dni"]).first()
            if existing_user and existing_user.id != user_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="DNI already registered")
        for key, value in update_data.items():
            setattr(db_user, key, value)
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error updating user: {str(e)}")

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        db.delete(db_user)
        db.commit()
        return {"detail": "User deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error deleting user: {str(e)}")
    


@router.patch("/{user_id}/video", response_model=UserSchema)
def update_user_video(user_id: int, url_video: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != Role.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        db_user.url_video = url_video
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error updating video URL: {str(e)}")