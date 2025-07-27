import json
def clean_json(s):
    if '```json' in s:
        start_index = s.index('```json')+7
        end_index = s.rindex('```')
    else:
        start_index = 0
        end_index = len(s)
    
    cleaned = s[start_index:end_index]
    return cleaned