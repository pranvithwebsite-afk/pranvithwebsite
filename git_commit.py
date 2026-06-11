import subprocess
import sys
import os

try:
    res = subprocess.run(["git", "status"], capture_output=True, text=True, check=True)
    print("STDOUT:", res.stdout)
except Exception as e:
    print("ERROR:", e)

try:
    res = subprocess.run(["git", "add", "."], capture_output=True, text=True, check=True)
    print("ADD STDOUT:", res.stdout)
except Exception as e:
    print("ADD ERROR:", e)

try:
    res = subprocess.run(["git", "commit", "-m", "fix: Full repository audit and repair"], capture_output=True, text=True, check=True)
    print("COMMIT STDOUT:", res.stdout)
except Exception as e:
    print("COMMIT ERROR:", e)

try:
    res = subprocess.run(["git", "push"], capture_output=True, text=True, check=True)
    print("PUSH STDOUT:", res.stdout)
except Exception as e:
    print("PUSH ERROR:", e)
