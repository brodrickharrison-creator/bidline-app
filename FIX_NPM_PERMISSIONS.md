# Fix NPM Cache Permissions

## The Problem

Your npm cache directory has files owned by root, which prevents npm from installing packages. This happened due to a bug in previous versions of npm.

## The Solution

Run this command in your terminal (it will ask for your password):

```bash
sudo chown -R $(id -u):$(id -g) ~/.npm
```

This command changes the ownership of all files in the `~/.npm` directory to your user account.

## After Fixing

Once permissions are fixed, navigate to the project and install dependencies:

```bash
cd /Users/brodrickharrison/bidline-app
npm install
```

This should install all packages successfully!

## Verify Installation

After npm install completes, you can verify everything works:

```bash
npm run dev
```

This should start the development server at http://localhost:3000

## If Problems Persist

If you still have permission issues:

1. Clear the npm cache:
   ```bash
   npm cache clean --force
   ```

2. Try installing again:
   ```bash
   npm install
   ```

3. If that doesn't work, you can use yarn instead:
   ```bash
   npm install -g yarn
   yarn install
   yarn dev
   ```
