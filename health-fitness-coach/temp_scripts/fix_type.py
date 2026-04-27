import sys

file_path = sys.argv[1]

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old = 'const [analysisResult, setAnalysisResult] = useState<FoodResult | null>(null);'
new = 'const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);'

if old not in content:
    print(f"Not found. Searching...")
    # Find line
    for i, line in enumerate(content.splitlines(True)):
        if 'analysisResult' in line and 'FoodResult' in line:
            print(f"Line {i+1}: {repr(line)}")
    sys.exit(1)

content = content.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Type updated")
