# synology-drive-ignore-nm

NOTE: This fork supports both Mac and Linux and even a custom conf dir through either ENV variable or command line argument.
Thanks the original author [LoicE5](https://github.com/LoicE5/synology-drive-ignore-nm)

Are you using a Synology NAS and the Synology Drive app on MacOs or Linux ?

If you are a developer, you must be tired of the `node_modules` directory being synced, overloading the network and your machines' resources.

Look no further, this code fixes that!

## How to use this software

1. Clone this repository
2. Close Synology Drive
3. Choose your preferred runtime:

### Option A: Using Bun (TypeScript)

```sh
# Install Bun
curl -fsSL https://bun.sh/install | bash
# Install dependencies
bun i
# Run the script
bun index.ts
```

### Option B: Using Node.js (JavaScript)

```sh
# Install dependencies
npm install
# Run the script
node index.js
```

4. Start Synology Drive again and enjoy

## Ignoring additional directories

By default, the script will ignore `node_modules` directory only. If you want to ignore additional directories, you can pass them as a command line argument:

**With Bun:**

```sh
bun index.ts --ignore=dist,build,customDir
```

**With Node.js:**

```sh
node index.js --ignore=dist,build,customDir
```

This will always include `node_modules` and also will add `dist`, `build`, and `customDir` to the list of directories to ignore.

## Custom Synology Drive configuration directory

The script automatically detects your operating system and uses the appropriate default path. However, you can override this in two ways:

### Environment Variable

Set the `SYNOLOGY_DRIVE_CONF_DIR` environment variable:

**With Bun:**

```sh
export SYNOLOGY_DRIVE_CONF_DIR="/custom/path/to/conf"
bun index.ts
```

**With Node.js:**

```sh
export SYNOLOGY_DRIVE_CONF_DIR="/custom/path/to/conf"
node index.js
```

### Command Line Argument

Use the `--dir` or `--directory` argument:

**With Bun:**

```sh
bun index.ts --dir="/custom/path/to/conf"
# or
bun index.ts --directory="/custom/path/to/conf"
```

**With Node.js:**

```sh
node index.js --dir="/custom/path/to/conf"
# or
node index.js --directory="/custom/path/to/conf"
```

### Combined Usage

You can combine both custom directory and ignore options:

**With Bun:**

```sh
bun index.ts --dir="/custom/path" --ignore="node_modules,dist,build"
```

**With Node.js:**

```sh
node index.js --dir="/custom/path" --ignore="node_modules,dist,build"
```

### Priority Order

The configuration follows this priority:

1. **Command line argument** (`--dir` or `--directory`) - highest priority
2. **Environment variable** (`SYNOLOGY_DRIVE_CONF_DIR`) - medium priority  
3. **OS-specific default path** - fallback

## What does it do ?

The script automatically detects your operating system and goes to the appropriate directory:

**On macOS:** `~/Library/Application Support/SynologyDrive/SynologyDrive.app/Contents/Resources/conf`

**On Linux:** `~/.SynologyDrive/SynologyDrive.app/conf`

It then adds the "node_modules" value (and any additional directories you specify) to two files :

| File             | Key       |
|------------------|-----------|
| blacklist.filter | Directory |
| filter-v4150     | Common    |
| filter-v4150     | Directory |

Once the word have been added to each key, Synology Drive will ignore the `node_modules` directories across your sync folder.

You've heard it right, it only takes a few clicks.

Some examples :

### blacklist.filter

```conf
[Version]
major=1
minor=1

[File]
black_ext_selective_sync="tmp", "temp", "swp", "lnk", "pst"
max_size_selective_sync=0

[Directory]
black_name="node_modules"
```

### filter-v4150

```conf
[Version]
major=1
minor=1

[Common]
black_char="\\/"
black_name="@tmp", "@eaDir", ".SynologyWorkingDirectory", "#recycle", "desktop.ini", ".ds_store", "Icon\r", "thumbs.db", "$Recycle.Bin", "@sharebin", "System Volume Information", "Program Files", "Program Files (x86)", "ProgramData", "#snapshot", "node_modules"
max_length=255
max_path=768

[File]
black_name="@tmp", "@eaDir", ".SynologyWorkingDirectory", "#recycle", "desktop.ini", ".ds_store", "Icon\r", "thumbs.db", "$Recycle.Bin", "@sharebin", "tmp", "temp", "System Volume Information", "Program Files", "Program Files (x86)", "ProgramData", "#snapshot"
black_prefix="~"
max_size=0

[Directory]
black_name="@tmp", "@eaDir", ".SynologyWorkingDirectory", "#recycle", "desktop.ini", ".ds_store", "Icon\r", "thumbs.db", "$Recycle.Bin", "@sharebin", "System Volume Information", "Program Files", "Program Files (x86)", "ProgramData", "#snapshot", "node_modules"

[EA]
```

## Why a custom npm package

If you look at the `package.json` file, you will see this following dependency : `@loice5/dangerous-ini`

The name might appears to be scary. It is a simple fork of [the ini package](https://www.npmjs.com/package/ini).

The key difference is how escaped characters are managed. With the initial ini package, when encoding again the file, quotes are escaped. It creates issues with how Synology Drive reads the file and makes the app crash.

Some other differences :

- Originally, the empty keys are not encoded. With the modified version, they are persisted.
- The lists of banned values are wrapped into simple quotes, creating syntax bugs. With the modified version, they are not anymore.

You can check the source code [here](https://github.com/LoicE5/dangerous-ini).
