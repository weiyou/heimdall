# Syntax Highlighting Test File for Heimdall

This file contains a wide variety of code blocks and markdown elements to thoroughly test syntax highlighting, rendering, and layout.

## 1. Inline Code
`console.log("Hello from inline code")` — should be monospaced.

## 2. JavaScript (most common)
```javascript
// ES6+ features
const greet = (name = "World") => {
  console.log(`Hello, ${name}!`);
  return { message: `Hi ${name}` };
};

const users = [
  { id: 1, name: "Alice", active: true },
  { id: 2, name: "Bob",   active: false }
];

const activeUsers = users.filter(u => u.active);
greet(activeUsers[0].name);
```

## 3. Python
```python
def fibonacci(n: int) -> list[int]:
    """Generate Fibonacci sequence up to n."""
    a, b = 0, 1
    result = []
    while a <= n:
        result.append(a)
        a, b = b, a + b
    return result

print(fibonacci(100))
```

## 4. TypeScript
```typescript
interface User {
  id: number;
  name: string;
  email?: string;
}

const createUser = (user: User): User => {
  return { ...user, email: user.email ?? "unknown@example.com" };
};
```

## 5. CSS
```css
.markdown-body {
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

pre code {
  font-size: 14px;
  line-height: 1.5;
  tab-size: 4;
}
```

## 6. HTML
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Heimdall Test</title>
</head>
<body>
  <h1>Hello from raw HTML block</h1>
</body>
</html>
```

## 7. Bash / Shell
```bash
#!/bin/bash
set -euo pipefail

PORT=${1:-7474}
echo "Starting Heimdall on port $PORT..."

node src/server.js README.md --port $PORT
```

## 8. JSON
```json
{
  "name": "heimdall",
  "version": "0.1.0",
  "scripts": {
    "start": "node src/server.js",
    "test": "vitest",
    "test:watch": "vitest --watch"
  },
  "dependencies": {
    "marked": "^14.0.0"
  }
}
```

## 9. SQL
```sql
SELECT 
  u.id,
  u.name,
  COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5
ORDER BY order_count DESC;
```

## 10. Edge Cases & Mixed Content

**Empty code block**
``` 

```

**Code block with no language**
```
Just plain text with <tags> and {braces} and "quotes".
```

**Very long line** (should wrap or scroll horizontally depending on your CSS)
```js
const veryLongFunction = (a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z) => { return a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p + q + r + s + t + u + v + w + x + y + z; };
```

**Markdown inside code block (should NOT be rendered)**
```markdown
# This should appear as literal text
- Not as a list
```

**Tables + Code**
| Language | Code Block |
|----------|------------|
| JS       | See above  |
| Python   | See above  |
```

