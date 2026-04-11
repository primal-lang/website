#Requires -Version 5.1
<#
.SYNOPSIS
    Primal SDK Installer for Windows

.DESCRIPTION
    Downloads and installs the Primal programming language SDK.

.PARAMETER Version
    Install a specific version (e.g., 0.4.3). If not specified, installs the latest version.

.PARAMETER InstallDir
    Override default install location ($env:LOCALAPPDATA\Primal\bin)

.PARAMETER Uninstall
    Remove Primal binary and PATH entry

.EXAMPLE
    .\install.ps1
    Install the latest version

.EXAMPLE
    .\install.ps1 -Version 0.4.3
    Install a specific version

.EXAMPLE
    .\install.ps1 -Uninstall
    Uninstall Primal
#>

param(
    [string]$Version,
    [string]$InstallDir,
    [switch]$Uninstall,
    [switch]$Help
)

# ============================================================================
# Configuration
# ============================================================================

$script:GITHUB_REPO = "primal-lang/sdk"
$script:BINARY_NAME = "primal.exe"
$script:DEFAULT_INSTALL_DIR = "$env:LOCALAPPDATA\Primal\bin"
$script:PATH_WAS_MODIFIED = $false

if ($InstallDir) {
    $script:INSTALL_DIR = $InstallDir
} else {
    $script:INSTALL_DIR = $script:DEFAULT_INSTALL_DIR
}

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "Error: $Message" -ForegroundColor Red
}

function Exit-WithError {
    param([string]$Message)
    Write-Error $Message
    Read-Host "Press Enter to exit"
    exit 1
}

function Show-Help {
    Get-Help $MyInvocation.PSCommandPath -Detailed
    exit 0
}

# ============================================================================
# Platform Detection
# ============================================================================

function Get-Architecture {
    $arch = [System.Environment]::GetEnvironmentVariable("PROCESSOR_ARCHITECTURE")
    switch ($arch) {
        "AMD64" { return "x86-64" }
        "x86" { Exit-WithError "32-bit Windows is not supported. Only x86-64 is currently supported." }
        default { Exit-WithError "Unsupported architecture: $arch. Only x86-64 is currently supported." }
    }
}

# ============================================================================
# Version Management
# ============================================================================

function Get-LatestVersion {
    $apiUrl = "https://api.github.com/repos/$script:GITHUB_REPO/releases/latest"

    try {
        $response = Invoke-RestMethod -Uri $apiUrl -UseBasicParsing
        $version = $response.tag_name -replace '^v', ''
        return $version
    }
    catch {
        Exit-WithError "Failed to fetch latest release information from GitHub: $_"
    }
}

function Get-InstalledVersion {
    $binaryPath = Join-Path $script:INSTALL_DIR $script:BINARY_NAME

    if (Test-Path $binaryPath) {
        try {
            $output = & $binaryPath --version 2>$null
            if ($output -match '(\d+\.\d+\.\d+)') {
                return $matches[1]
            }
        }
        catch {
            return $null
        }
    }
    return $null
}

# ============================================================================
# PATH Management
# ============================================================================

function Test-PathContainsInstallDir {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $paths = $userPath -split ';' | ForEach-Object { $_.TrimEnd('\') }
    $installDirNormalized = $script:INSTALL_DIR.TrimEnd('\')
    return $paths -contains $installDirNormalized
}

function Add-ToPath {
    if (Test-PathContainsInstallDir) {
        return
    }

    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")

    if ($userPath) {
        $newPath = "$script:INSTALL_DIR;$userPath"
    } else {
        $newPath = $script:INSTALL_DIR
    }

    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")

    # Also update current session
    $env:Path = "$script:INSTALL_DIR;$env:Path"

    Write-Info "Added $script:INSTALL_DIR to user PATH"
    $script:PATH_WAS_MODIFIED = $true
}

function Remove-FromPath {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")

    if ($userPath) {
        $paths = $userPath -split ';' | Where-Object {
            $_.TrimEnd('\') -ne $script:INSTALL_DIR.TrimEnd('\')
        }
        $newPath = $paths -join ';'
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Info "Removed $script:INSTALL_DIR from user PATH"
    }
}

# ============================================================================
# Installation Functions
# ============================================================================

function Install-Binary {
    param([string]$TargetVersion)

    $arch = Get-Architecture
    $downloadUrl = "https://github.com/$script:GITHUB_REPO/raw/refs/tags/v$TargetVersion/bin/primal-windows-$arch"

    Write-Info "Downloading Primal v$TargetVersion for windows-$arch..."

    # Create install directory if it doesn't exist
    if (-not (Test-Path $script:INSTALL_DIR)) {
        New-Item -ItemType Directory -Path $script:INSTALL_DIR -Force | Out-Null
    }

    $binaryPath = Join-Path $script:INSTALL_DIR $script:BINARY_NAME

    try {
        # Use TLS 1.2 for GitHub
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

        # Download with progress
        $ProgressPreference = 'Continue'
        Invoke-WebRequest -Uri $downloadUrl -OutFile $binaryPath -UseBasicParsing

        # Unblock the file (Windows blocks downloaded executables)
        Unblock-File -Path $binaryPath -ErrorAction SilentlyContinue
    }
    catch {
        Exit-WithError "Failed to download from $downloadUrl`n$_"
    }
}

function Test-Installation {
    $binaryPath = Join-Path $script:INSTALL_DIR $script:BINARY_NAME

    if (-not (Test-Path $binaryPath)) {
        Write-Warning "Binary not found at $binaryPath"
        return $false
    }

    try {
        $output = & $binaryPath --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Binary exited with code $LASTEXITCODE"
            Write-Warning "Output: $output"
            return $false
        }
        return $null -ne $output
    }
    catch {
        Write-Warning "Failed to run binary: $_"
        return $false
    }
}

# ============================================================================
# Uninstall Function
# ============================================================================

function Uninstall-Primal {
    Write-Info "Uninstalling Primal SDK..."

    $binaryPath = Join-Path $script:INSTALL_DIR $script:BINARY_NAME

    if (Test-Path $binaryPath) {
        Remove-Item $binaryPath -Force
        Write-Success "Removed $binaryPath"
    } else {
        Write-Warning "Binary not found at $binaryPath"
    }

    Remove-FromPath

    # Remove install directory if empty
    if ((Test-Path $script:INSTALL_DIR) -and
        ((Get-ChildItem $script:INSTALL_DIR | Measure-Object).Count -eq 0)) {
        Remove-Item $script:INSTALL_DIR -Force
    }

    Write-Success "Primal SDK has been uninstalled."
    Write-Info "Please restart your terminal for PATH changes to take effect."

    exit 0
}

# ============================================================================
# Main Script
# ============================================================================

function Main {
    if ($Help) {
        Show-Help
    }

    if ($Uninstall) {
        Uninstall-Primal
    }

    # Check for existing installation
    Write-Info "Checking for existing installation..."
    $installedVersion = Get-InstalledVersion

    if ($installedVersion) {
        Write-Info "Found Primal $installedVersion installed"
    }

    # Determine target version
    $targetVersion = $Version
    if (-not $targetVersion) {
        Write-Info "Fetching latest version..."
        $targetVersion = Get-LatestVersion
        if (-not $targetVersion) {
            Exit-WithError "Failed to determine latest version"
        }
    }

    Write-Info "Target version: $targetVersion"

    # Check if already up to date
    if ($installedVersion -eq $targetVersion) {
        Write-Success "Already up to date (v$targetVersion)"
        exit 0
    }

    # Install or update
    if ($installedVersion) {
        Write-Info "Updating Primal from $installedVersion to $targetVersion..."
    } else {
        Write-Info "Installing Primal v$targetVersion..."
    }

    Install-Binary -TargetVersion $targetVersion

    # Update PATH if needed (only on fresh install)
    if (-not $installedVersion) {
        if (-not (Test-PathContainsInstallDir)) {
            Add-ToPath
        }
    }

    # Verify installation
    if (Test-Installation) {
        Write-Host ""
        if ($installedVersion) {
            Write-Success "Successfully updated Primal from $installedVersion to $targetVersion!"
        } else {
            Write-Success "Successfully installed Primal v$targetVersion!"
        }
        Write-Host ""
        Write-Info "Installation directory: $script:INSTALL_DIR"

        if ($script:PATH_WAS_MODIFIED) {
            Write-Host ""
            Write-Warning "Please restart your terminal for PATH changes to take effect."
        }

        Write-Host ""
        Write-Info "Run 'primal --version' to verify the installation."
    } else {
        Exit-WithError "Installation verification failed. Please check the installation manually."
    }
}

# Run main function
try {
    Main
} catch {
    Write-Error "An unexpected error occurred: $_"
    Read-Host "Press Enter to exit"
    exit 1
}

Read-Host "Press Enter to exit"
