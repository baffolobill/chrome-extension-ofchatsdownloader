import json
import sys

chats_with_client_msgs = 0
chats_with_multiple_client_msgs = 0
total = 0

chats = json.load(open(sys.argv[1], 'r'))
for cid, msgs in chats.items():
    total += 1
    client_msgs = [m['id'] for m in msgs if m['whoWrote'] == 'client']
    if len(client_msgs) > 1:
        chats_with_client_msgs += 1
    if len(client_msgs) > 3:
        chats_with_multiple_client_msgs += 1

print(f'Total chats: {total}')
print(f'Chats with at least 1 client message: {chats_with_client_msgs}')
print(f'Chats with 3+ client messages: {chats_with_multiple_client_msgs}')
