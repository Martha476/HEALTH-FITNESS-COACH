import sys

file_path = sys.argv[1]

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find insertion point after logSuccess line
insert_idx = None
for i, line in enumerate(lines):
    if 'const [logSuccess,    setLogSuccess]    = useState(false);' in line:
        insert_idx = i + 1
        break

if insert_idx is None:
    print("ERROR: Could not find logSuccess line")
    sys.exit(1)

# Insert new state lines
new_lines = [
    '\n',
    '  // Photo analysis state\n',
    '  const [imageFile, setImageFile] = useState<File | null>(null);\n',
    '  const [imagePreview, setImagePreview] = useState<string>("");\n',
    '  const [analyzing, setAnalyzing] = useState(false);\n',
    '  const [analysisResult, setAnalysisResult] = useState<FoodResult | null>(null);\n',
    '  const [analysisError, setAnalysisError] = useState<string>("");\n',
]

lines[insert_idx:insert_idx] = new_lines

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Inserted {len(new_lines)} lines at index {insert_idx}")
