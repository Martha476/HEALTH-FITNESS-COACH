"""
API Endpoint verification script
Tests that all new endpoints exist and are properly defined
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

try:
    from api.main import app
    
    print("Checking API endpoints...\n")
    
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            routes.append((route.path, route.methods))
    
    # Check for required endpoints
    required_endpoints = {
        '/api/settings': {'GET', 'PUT'},
        '/api/settings/agents': {'GET', 'PUT'},
        '/api/token-usage': {'GET', 'POST', 'DELETE'},
    }
    
    found_endpoints = {route[0]: route[1] for route in routes}
    
    print("✓ Total routes found:", len(routes))
    print("\nChecking required endpoints:")
    
    all_found = True
    for endpoint, required_methods in required_endpoints.items():
        if endpoint in found_endpoints:
            available_methods = found_endpoints[endpoint]
            missing_methods = required_methods - available_methods
            if missing_methods:
                print(f"  ✗ {endpoint}: Missing methods {missing_methods}")
                all_found = False
            else:
                print(f"  ✓ {endpoint}: {required_methods}")
        else:
            print(f"  ✗ {endpoint}: Not found")
            all_found = False
    
    if all_found:
        print("\n✓ All required endpoints are present!")
    else:
        print("\n✗ Some endpoints are missing or incomplete")
        sys.exit(1)
        
except Exception as e:
    print(f"\n✗ Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
