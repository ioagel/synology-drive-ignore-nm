// @ts-ignore
import ini from '@loice5/dangerous-ini'
import type { BunFile } from 'bun'
import os from 'node:os'
import path from 'node:path'

interface SynologyFilter {
    Version: {
      major: string
      minor: string
    }
    Common?: {
      black_char: string
      black_name: string
      max_length: string
      max_path: string
    }
    File?: {
      black_name: string
      black_prefix: string
      max_size: string
    }
    Directory?: {
      black_name: string
    }
    EA?: {}
}

const args = process.argv.slice(2)
const ignoreArg = args.find(arg => arg.startsWith('--ignore='))
const dirArg = args.find(arg => arg.startsWith('--dir=') || arg.startsWith('--directory='))
const banDirNames = ['node_modules', ...(ignoreArg?.split('=')[1].split(',') ?? [])]

// Helper function to expand ~ to home directory
const expandTilde = (filePath: string): string => {
    if (filePath.startsWith('~/')) {
        return path.join(os.homedir(), filePath.slice(2))
    }
    if (filePath === '~') {
        return os.homedir()
    }
    return filePath
}

// Get directory from command line arg, environment variable, or fallback to default
const getConfigDirectory = (): string => {
    // Priority: command line arg > environment variable > default
    if (dirArg) {
        const dir = dirArg.split('=')[1]
        if (!dir) {
            console.error('Error: --dir or --directory argument provided but no path specified')
            process.exit(1)
        }
        return expandTilde(dir)
    }
    
    if (process.env.SYNOLOGY_DRIVE_CONF_DIR) {
        return expandTilde(process.env.SYNOLOGY_DRIVE_CONF_DIR)
    }
    
    // Default fallback - OS specific paths
    if (os.platform() === 'darwin') {
        // macOS path
        return `${os.homedir()}/Library/Application Support/SynologyDrive/SynologyDrive.app/Contents/Resources/conf`
    } else {
        // Linux path
        return `${os.homedir()}/.SynologyDrive/SynologyDrive.app/conf`
    }
}

const directory = getConfigDirectory()
const paths = {
    blacklist: `${directory}/blacklist.filter`,
    filterV450: `${directory}/filter-v4150`
}

async function main() {
    await editConfigFile(paths.blacklist)
    await editConfigFile(paths.filterV450)
}

async function editConfigFile(path: string): Promise<void> {

    console.info(`Editing file : ${path}`)

    // Open the file
    const file: BunFile = Bun.file(path)
    const text: string = await file.text()

    await backupFile(file)

    // Get the file as an object
    const config = Object.assign({}, ini.parse(text)) as SynologyFilter

    // Create some conditions for better code lisibility
    const hasDirectoryKey: boolean = config.hasOwnProperty('Directory')
    const hasCommonKey: boolean = config.hasOwnProperty('Common')
    const hasNodeModulesInDirectory: boolean = hasDirectoryKey && banDirNames.every(dir => config.Directory!.black_name.includes(dir))
    const hasNodeModulesInCommon: boolean = hasCommonKey && banDirNames.every(dir => config.Common!.black_name.includes(dir))

    if (
        (hasNodeModulesInDirectory && !hasCommonKey) ||
        (hasNodeModulesInDirectory && hasNodeModulesInCommon)
    )
        return console.info(`The directories ${banDirNames.join(', ')} are already banned. No further action is needed.`)

    // If there is no Directory key, we create one and add directories in the blacklist, otherwise and if not already present, we add directories in Directory's blacklist
    if (!hasDirectoryKey)
        config.Directory = {
            black_name: banDirNames.map(dir => `"${dir}"`).join(', ')
        }
    else {
        banDirNames.forEach(dir => {
            if (!config.Directory!.black_name.includes(dir)) {
                config.Directory!.black_name += `, "${dir}"`
            }
        })
    }

    // If the Common key exists in the file, we add directories in the blacklist
    if (hasCommonKey) {
        banDirNames.forEach(dir => {
            if (!config.Common!.black_name.includes(dir)) {
                config.Common!.black_name += `, "${dir}"`
            }
        })
    }

    // We save the file
    const updatedConfig = ini.stringify(config)
    try {
        await Bun.write(path, updatedConfig)
    } catch (error: unknown) {
        const fs = await import('fs')
        fs.writeFileSync(path, updatedConfig)
        console.info(`🧐 For some reason, Bun.write() fails on your device. We've switched it to fs.writeFileSync() for you! If you see this, the edits have succeeded.`)
    }

    console.info(`${banDirNames.join(', ')} have been successfully banned from Synology Drive.`)
}

async function backupFile(file: BunFile): Promise<void> {
    const fileName = file.name?.split('/').at(-1)
    const path = `${os.homedir()}/Desktop/${fileName}`

    await Bun.write(path, file)
    
    console.info('File backed-up successfully.')
}

main()
    .then(() => console.info('Operation completed successfully.'))
    .catch(err => console.error('An error occurred:', err))
