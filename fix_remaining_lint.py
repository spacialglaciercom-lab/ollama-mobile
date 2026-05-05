import os
import re

def fix_file(path, func):
    if not os.path.exists(path):
        return
    with open(path, 'r') as f:
        content = f.read()
    new_content = func(content)
    with open(path, 'w') as f:
        f.write(new_content)

def fix_diagnostics_store(content):
    # Unnecessary escape character: \- in character class [a-zA-Z0-9\-_.] -> [a-zA-Z0-9\-_.] is fine but sometimes lint complains
    # Let's try removing it if it's in a character class where it doesn't need it or moving it to the end
    content = content.replace(r"a-zA-Z0-9\-_.]{20,}", r"a-zA-Z0-9._-]{20,}")
    content = content.replace(r"a-zA-Z0-9\-_]{16,}", r"a-zA-Z0-9_-]{16,}")
    return content

def fix_chat_store(content):
    # Remove unused constants
    content = content.replace("const AUTO_DELETE_KEY = 'ollama-auto-delete-days';", "")
    content = content.replace("const AUTO_SAVE_KEY = 'ollama-auto-save-enabled';", "")
    return content

def fix_provider_store(content):
    # Fix 'state' is defined but never used. Allowed unused args must match /^_/u
    content = content.replace("(state) =>", "(_state) =>")
    return content

fix_file('src/store/useDiagnosticsStore.ts', fix_diagnostics_store)
fix_file('src/store/useChatStore.ts', fix_chat_store)
fix_file('src/store/useProviderStore.ts', fix_provider_store)
