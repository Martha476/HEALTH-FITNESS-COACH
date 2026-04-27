import sys

file_path = sys.argv[1]

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find FoodResult interface definition
insert_idx = None
for i, line in enumerate(lines):
    if 'interface FoodResult {' in line:
        # Find closing brace
        depth = 0
        for j in range(i, len(lines)):
            depth += lines[j].count('{')
            depth -= lines[j].count('}')
            if depth == 0:
                insert_idx = j + 1
                break
        break

if insert_idx is None:
    print("ERROR: Could not find FoodResult interface")
    sys.exit(1)

new_interface = '''
interface AIAnalysisResult {
  food_name: string;
  confidence: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_size_grams: number;
  description: string;
  portion_estimate: string;
}
'''

lines[insert_idx:insert_idx] = [new_interface]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Added AIAnalysisResult interface at line {insert_idx}")
