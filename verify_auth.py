import os
import asyncio
import httpx
import sys

# Ensure dummy test key is set for testing locally if not present
os.environ.setdefault("JWT_SECRET_KEY", "dummy_test_key_for_verify_auth")

BASE_URL = "http://localhost:8000/api"
USERNAME = "testuser_auth_debug"
PASSWORD = "password123"

async def verify_auth():
    async with httpx.AsyncClient() as client:
        # 1. Register or Login
        print(f"Attempting to register/login user '{USERNAME}'...")
        try:
            reg_response = await client.post(f"{BASE_URL}/auth/register", json={
                "username": USERNAME,
                "password": PASSWORD,
                "email": f"{USERNAME}@example.com"
            })
            if reg_response.status_code == 200:
                print("Registration successful.")
                token = reg_response.json()["access_token"]
            elif reg_response.status_code == 400 and "already taken" in reg_response.text:
                print("User exists, logging in...")
                login_response = await client.post(f"{BASE_URL}/auth/login", json={
                    "username": USERNAME,
                    "password": PASSWORD
                })
                if login_response.status_code == 200:
                    print("Login successful.")
                    token = login_response.json()["access_token"]
                else:
                    print(f"Login failed: {login_response.status_code} {login_response.text}")
                    return
            else:
                print(f"Registration failed: {reg_response.status_code} {reg_response.text}")
                return

        except Exception as e:
            print(f"Error during auth: {e}")
            return

        print(f"Token obtained: {token[:10]}...")

        # 2. Access Protected Endpoint
        print("Accessing protected endpoint '/dashboard/summary'...")
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get(f"{BASE_URL}/dashboard/summary", headers=headers)

        if response.status_code == 200:
            print("SUCCESS: Accessed protected endpoint.")
            print(response.json())
        else:
            print(f"FAILURE: {response.status_code} {response.text}")

if __name__ == "__main__":
    asyncio.run(verify_auth())
