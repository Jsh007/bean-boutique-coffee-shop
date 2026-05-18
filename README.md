# Bean Boutique Coffee Shop

**Author:** Eigbe Joshua, 224473.

**Qualification:** NCC Level 4 Diploma in computing.

**Unit:** Frontend Web Development.

## How to Run this project.

This site imports demo data using the `fetch()`Api, which is normally blocked under `file://`. So, you'll have to serve files over **http** from project root, **this folder** (`bean_boutique_coffee_shop/`, where `index.html` lives). Any static file server should work. I have included 3 examples below, you may assign any `PORT` number that your local server uses (often `8080`, `5500`, `3000`).

### VS Code - Live Server (or similar extension)

1. Install a Live Server-style extension from the Marketplace (common choice: **Live Server** by Ritwick Dey, or equivalents that expose “Open with Live Server”).
2. Open the project's root folder; **`bean_boutique_coffee_shop/`** as workspace in VSCode.
3. Right‑click **`bean_boutique_coffee_shop/index.html`** → **Open with Live Server** (or the command palette action your extension registers).

The preview URL for Live Server is often `http://127.0.0.1:5500/`.

### Python (built-in)

```bash
cd path/to/bean_boutique_coffee_shop
python3 -m http.server 8080
```

### Node (`npx`, no global install)

From `bean_boutique_coffee_shop/`:

```bash
npx --yes serve -l 8080
```

Other static servers behave the same, e.g. `npx --yes http-server -p 8080 -c-1`.

**First-run:** On First-run, you will be redirected to the setup page. All you have to do is click the **Import Data** button. Now you can navigate to any page of your choice using the main navigation menu.
