import sys

with open('app/chat/[id].tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # Remove unused ModelPullSheet import
    if 'import { ModelPullSheet }' in line:
        continue
    # Remove unused models from destructuring
    if 'const { models, selectedModel,' in line:
        line = line.replace('models, ', '')
    new_lines.append(line)

content = "".join(new_lines)

# Fix missing dependencies in useEffect (id)
# Looking for the useEffect dependency array [id]
content = content.replace('}, [id]);', '}, [id, paramModel, selectedModel, createConversation, setActiveConversation, loadMessages, conversations, selectModel]);')

# Fix missing dependency in handleSend useCallback
# Looking for the useCallback dependency array [..., showSystemPrompt]
content = content.replace('showSystemPrompt]);', 'showSystemPrompt, updateConversationTitle]);')

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
