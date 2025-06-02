// @ts-nocheck
import ini from '@loice5/dangerous-ini'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const ignoreArg = args.find(arg => arg.startsWith('--ignore='))
const dirArg = args.find(arg => arg.startsWith('--dir=') || arg.startsWith('--directory='))
const banDirNames = ['node_modules', ...(ignoreArg?.split('=')[1].split(',') ?? [])]

// Helper function to expand ~ to home directory
const expandTilde = (filePath) => {
    if (filePath.startsWith('~/')) {
        return path.join(os.homedir(), filePath.slice(2))
    }
    if (filePath === '~') {
        return os.homedir()
    }
    return filePath
}

// Get directory from command line arg, environment variable, or fallback to default
const getConfigDirectory = () => {
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

async function editConfigFile(filePath) {

    console.info(`Editing file : ${filePath}`)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File does not exist: ${filePath}`)
        process.exit(1)
    }

    // Read the file
    const text = fs.readFileSync(filePath, 'utf8')

    await backupFile(filePath)

    // Get the file as an object
    const config = Object.assign({}, ini.parse(text))

    // Create some conditions for better code lisibility
    const hasDirectoryKey = config.hasOwnProperty('Directory')
    const hasCommonKey = config.hasOwnProperty('Common')
    const hasNodeModulesInDirectory = hasDirectoryKey && banDirNames.every(dir => config.Directory.black_name.includes(dir))
    const hasNodeModulesInCommon = hasCommonKey && banDirNames.every(dir => config.Common.black_name.includes(dir))

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
            if (!config.Directory.black_name.includes(dir)) {
                config.Directory.black_name += `, "${dir}"`
            }
        })
    }

    // If the Common key exists in the file, we add directories in the blacklist
    if (hasCommonKey) {
        banDirNames.forEach(dir => {
            if (!config.Common.black_name.includes(dir)) {
                config.Common.black_name += `, "${dir}"`
            }
        })
    }

    // We save the file
    const updatedConfig = ini.stringify(config)
    fs.writeFileSync(filePath, updatedConfig, 'utf8')

    console.info(`${banDirNames.join(', ')} have been successfully banned from Synology Drive.`)
}

async function backupFile(filePath) {
    const fileName = path.basename(filePath)
    const backupPath = path.join(os.homedir(), 'Desktop', fileName)

    // Copy the file to backup location
    fs.copyFileSync(filePath, backupPath)
    
    console.info('File backed-up successfully.')
}

main()
    .then(() => console.info('Operation completed successfully.'))
    .catch(err => console.error('An error occurred:', err)) 
