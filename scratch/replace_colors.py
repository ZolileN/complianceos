import os

replacements = {
    '#0F172A': '#050505',
    '#1E293B': '#1F1F1F',
    '#0B111E': '#000000',
    '#090D16': '#000000',
    '#94A3B8': '#888888',
    '#F1F5F9': '#FFFFFF',
    '#F8FAFC': '#FFFFFF',
    '#475569': '#333333',
    'rgba(255,255,255,0.02)': '#0A0A0A',
    '#CBD5E1': '#A3A3A3',
    'rgba(94, 234, 212, 0.08)': '#141414',
    'rgba(94, 234, 212, 0.2)': '#1F1F1F',
}

admin_dir = 'src/app/(internal)/admin'

for root, _, files in os.walk(admin_dir):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
                
            new_content = content
            for old, new in replacements.items():
                new_content = new_content.replace(old, new)
            
            # Special layout logic overrides for nav links
            if file == 'layout.tsx':
                new_content = new_content.replace("color: isActive ? '#5EEAD4' : '#888888',", "color: isActive ? '#FFFFFF' : '#888888',")
            
            if content != new_content:
                with open(path, 'w') as f:
                    f.write(new_content)
                print(f'Updated {path}')

