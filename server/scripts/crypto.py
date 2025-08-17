import sys
import os
import json
from getpass import getpass
from binascii import unhexlify

# Inject site-packages before any imports
site_packages = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.python', 'Lib', 'site-packages'))
sys.path.insert(0, site_packages)

# Crypto imports
from Crypto.Hash import SHA256
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes

def encrypt(password, message):
    salt = get_random_bytes(16)
    key = PBKDF2(password, salt, dkLen=32, count=100000, hmac_hash_module=SHA256)
    cipher = AES.new(key, AES.MODE_EAX)
    ciphertext, tag = cipher.encrypt_and_digest(message)

    return {
        "ciphertext": ciphertext.hex(),
        "salt": salt.hex(),
        "nonce": cipher.nonce.hex(),
        "tag": tag.hex()
    }

def decrypt(password, ciphertext_hex, salt_hex, nonce_hex, tag_hex):
    ciphertext = unhexlify(ciphertext_hex)
    salt = unhexlify(salt_hex)
    nonce = unhexlify(nonce_hex)
    tag = unhexlify(tag_hex)

    key = PBKDF2(password, salt, dkLen=32, count=100000, hmac_hash_module=SHA256)
    cipher = AES.new(key, AES.MODE_EAX, nonce=nonce)
    plaintext = cipher.decrypt_and_verify(ciphertext, tag)

    return plaintext.decode()

def simple_encrypt(password, message):
    if not message:
        print("ERROR: Message is empty")
        sys.exit(1)

    salt = load_encryption_defaults()
    nonce = get_random_bytes(16)

    key = PBKDF2(password, salt, dkLen=32, count=100000, hmac_hash_module=SHA256)
    cipher = AES.new(key, AES.MODE_EAX, nonce=nonce)
    ciphertext, tag = cipher.encrypt_and_digest(message)

    combined = nonce + tag + ciphertext
    print(combined.hex())

def simple_decrypt(password, ciphertext_hex):
    try:
        salt = load_encryption_defaults()
        data = unhexlify(ciphertext_hex)

        if len(data) < 32:
            print("ERROR: Ciphertext too short")
            sys.exit(1)

        nonce = data[:16]
        tag = data[16:32]
        ciphertext = data[32:]

        key = PBKDF2(password, salt, dkLen=32, count=100000, hmac_hash_module=SHA256)
        cipher = AES.new(key, AES.MODE_EAX, nonce=nonce)
        plaintext = cipher.decrypt_and_verify(ciphertext, tag)

        print(plaintext.decode())

    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)

def load_encryption_defaults():
    full_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'data', 'encryption-defaults.json'))
    try:
        with open(full_path, "r") as f:
            data = json.load(f)
            salt = bytes.fromhex(data.get("salt", ""))
            return salt
    except (FileNotFoundError, json.JSONDecodeError, ValueError) as e:
        print(f"Error loading defaults: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: script.py <mode> <json-string>")
        sys.exit(1)

    mode = sys.argv[1]
    try:
        args = json.loads(sys.argv[2])
    except json.JSONDecodeError:
        print("Invalid JSON input")
        sys.exit(1)

    password = args.get("password")
    if not password:
        print("ERROR: Missing password")
        sys.exit(1)

    if mode == "simple-encrypt":
        message = args.get("message") or args.get("plaintext")
        if not message:
            print("ERROR: Message is empty")
            sys.exit(1)
        simple_encrypt(password, message.encode())

    elif mode == "simple-decrypt":
        ciphertext_hex = args.get("ciphertext")
        if not ciphertext_hex:
            print("ERROR: Missing ciphertext")
            sys.exit(1)
        simple_decrypt(password, ciphertext_hex)

    else:
        print("Unknown mode")