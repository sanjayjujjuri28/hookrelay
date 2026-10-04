from pwdlib import PasswordHash
import secrets

password_hash = PasswordHash.recommended()

def hash_password(password:str):
    return password_hash.hash(password)

def verify_password(plain_password:str,hashed_password:str)->bool:
    return password_hash.verify(plain_password,hashed_password)

def generate_otp():
    return str(secrets.randbelow(900000) + 100000)

if __name__ == "__main__":
    print(generate_otp())
    print(generate_otp())
    print(generate_otp())