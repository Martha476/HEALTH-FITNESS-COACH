import sys

file_path = sys.argv[1]

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_import = 'import { useState, useEffect, useRef } from "react";'
new_import = 'import { useState, useEffect, useRef, ChangeEvent } from "react";'

if old_import not in content:
    print(f"ERROR: Could not find exact line: {repr(old_import)}")
    sys.exit(1)

content = content.replace(old_import, new_import, 1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Import updated successfully")
