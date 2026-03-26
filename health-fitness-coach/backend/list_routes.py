"""Check which API routes are registered"""
from api.main import app

print("API Routes:")
print("=" * 60)
for route in app.routes:
    if hasattr(route, 'path') and '/api' in route.path:
        methods = list(route.methods) if hasattr(route, 'methods') else 'N/A'
        print(f"{str(route.path):40} {methods}")
