import sys

with open('app/chat/[id].tsx', 'r') as f:
    lines = f.readlines()

react_import = ""
other_imports = []
code_start_idx = 0

for i, line in enumerate(lines):
    if line.startswith('import React'):
        react_import = line
    elif line.startswith('import '):
        other_imports.append(line)
    elif line.strip() and not line.startswith('import '):
        code_start_idx = i
        break

new_content = [react_import] + sorted(other_imports) + lines[code_start_idx:]
with open('app/chat/[id].tsx', 'w') as f:
    f.writelines(new_content)
