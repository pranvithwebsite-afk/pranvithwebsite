
import json
import os
import sys
from fastapi.testclient import TestClient

# Add the root directory to the Python path to allow imports from 'backend'
# This mimics the structure of a Vercel deployment where the app root is available.
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__)))
sys.path.insert(0, project_root)

# Set a flag to indicate we are running in a test environment
# This can prevent certain production-only logic (like sending analytics) from running
os.environ["TEST_MODE"] = "true"

try:
    from backend.server import app
except Exception as e:
    print("CRITICAL: Failed to import 'app' from 'backend.server'.")
    print(f"Error Type: {type(e).__name__}")
    print(f"Error Details: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

client = TestClient(app)

def test_endpoint(method: str, url: str, expected_status: int, **kwargs):
    """Helper function to test an endpoint and print the result."""
    print(f"Testing {method} {url}...")
    try:
        response = client.request(method, url, **kwargs)
        status_code = response.status_code
        
        if status_code == expected_status:
            print(f"  [SUCCESS] Status Code: {status_code} (Expected: {expected_status})")
            return True
        else:
            print(f"  [FAILURE] Status Code: {status_code} (Expected: {expected_status})")
            try:
                # Try to pretty-print JSON if the response is JSON
                error_details = response.json()
                print("  Response Body:")
                print(json.dumps(error_details, indent=2))
            except json.JSONDecodeError:
                print(f"  Response Body (non-JSON): {response.text[:500]}")
            return False

    except Exception as e:
        print(f"  [CRITICAL FAILURE] An exception occurred while testing the endpoint.")
        print(f"  Error Type: {type(e).__name__}")
        print(f"  Error Details: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("--- Starting Endpoint Verification ---")
    
    # It's important that a missing DB doesn't crash the server.
    # The following tests assume the fallback logic (using seed_data) is working.
    
    results = []

    # Test GET endpoints
    results.append(test_endpoint("GET", "/api/settings", 200))
    results.append(test_endpoint("GET", "/api/products", 200))
    results.append(test_endpoint("GET", "/api/cms/pages/home", 200))
    results.append(test_endpoint("GET", "/api/cms/pages/assets", 200))
    
    # Test POST endpoint - expect 401 Unauthorized without a real user/pass
    # We are testing if the endpoint is reachable and authentication logic runs,
    # not if the login is successful. A 401 is a success in this context.
    # If it were 500, it would be a failure.
    login_payload = {"email": "test@example.com", "password": "wrongpassword"}
    results.append(test_endpoint("POST", "/api/admin/login", 401, json=login_payload))

    print("\n--- Verification Summary ---")
    if all(results):
        print("All endpoints returned the expected status codes. The API is working!")
        sys.exit(0)
    else:
        print("Some endpoints failed. Please review the logs above for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()
