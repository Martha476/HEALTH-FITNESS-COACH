"""Check if token-usage endpoints are registered"""
from api.main import app

print("Checking for /api/token-usage endpoints...")
token_routes = [r for r in app.routes if hasattr(r, 'path') and 'token-usage' in r.path]
print(f"Found {len(token_routes)} token-usage routes\n")

if token_routes:
    for route in token_routes:
        methods = list(route.methods) if hasattr(route, 'methods') else 'N/A'
        print(f"  {route.path}: {methods}")
else:
    print("  ✗ No token-usage endpoints found!")
    print("\nAll /api/ routes:")
    for route in app.routes:
        if hasattr(route, 'path') and '/api' in route.path:
            print(f"  {route.path}")
