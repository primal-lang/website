#!/bin/bash
set -e

# Configuration
INSTALL_DIR="${HOME}/.local/bin"
GITHUB_REPO="primal-lang/sdk"
BINARY_NAME="primal"
PATH_WAS_MODIFIED=false

# ============================================================================
# Output Capabilities
# ============================================================================

# Colors and in-place redrawing only make sense on an interactive terminal.
# Everything the installer prints goes to stderr, so the rail stays in one
# piece even when the caller redirects stdout.
if [[ -t 2 ]]; then
    IS_TTY=true
else
    IS_TTY=false
fi

RED=''
GREEN=''
DIM=''
BOLD=''
NC=''

if [[ "$IS_TTY" == true ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    DIM='\033[2m'
    BOLD='\033[1m'
    NC='\033[0m' # No Color
fi

# The rail is drawn with box characters, which only render correctly under a
# UTF-8 locale. Anything else falls back to ASCII.
if [[ "${LC_ALL}${LC_CTYPE}${LANG}" == *[Uu][Tt][Ff]* ]] || \
   [[ "$(locale charmap 2>/dev/null)" == *[Uu][Tt][Ff]* ]]; then
    GLYPH_TOP='┌'
    GLYPH_BAR='│'
    GLYPH_END='└'
    GLYPH_PENDING='◇'
    GLYPH_DONE='◆'
    GLYPH_FILL='█'
    GLYPH_TRACK='░'
    GLYPH_ARROW='→'
else
    GLYPH_TOP='+'
    GLYPH_BAR='|'
    GLYPH_END='`'
    GLYPH_PENDING='o'
    GLYPH_DONE='+'
    GLYPH_FILL='#'
    GLYPH_TRACK='.'
    GLYPH_ARROW='->'
fi

# ============================================================================
# Rail Output
# ============================================================================

RAIL_STARTED=false
RAIL_STEP_OPEN=false
RAIL_PROGRESS_OPEN=false
RAIL_STEP_LABEL=""
FAILURE_SUMMARY="Installation failed"

rail_start() {
    printf '%b%s%b  %b%s%b\n' "$DIM" "$GLYPH_TOP" "$NC" "$BOLD" "$1" "$NC" >&2
    RAIL_STARTED=true
}

rail_gap() {
    printf '%b%s%b\n' "$DIM" "$GLYPH_BAR" "$NC" >&2
}

# Opens a step. On a terminal the node is drawn hollow right away so the user
# can see which step is running; the line is then rewritten in place once the
# outcome is known. Without a terminal nothing is printed until it settles.
rail_step() {
    RAIL_STEP_LABEL="$1"
    RAIL_STEP_OPEN=true

    if [[ "$IS_TTY" == true ]]; then
        printf '%b%s%b  %s' "$DIM" "$GLYPH_PENDING" "$NC" "$RAIL_STEP_LABEL" >&2
    fi
}

# Opens a line underneath the current step for a progress bar to live on. The
# node line above it is finished, so it can only be revisited by moving the
# cursor back up when the step settles.
rail_progress_open() {
    RAIL_PROGRESS_OPEN=true

    if [[ "$IS_TTY" == true ]]; then
        printf '\n' >&2
    fi
}

# Closes the open step, filling in its node with the color of the outcome. When
# a progress line was opened underneath, the cursor steps back up to the node
# and the progress line is blanked so the step's detail can take its place.
rail_step_settle() {
    local color="$1"

    if [[ "$IS_TTY" == true ]]; then
        if [[ "$RAIL_PROGRESS_OPEN" == true ]]; then
            printf '\033[1A' >&2
        fi
        printf '\r\033[K' >&2
    fi

    printf '%b%s%b  %s\n' "$color" "$GLYPH_DONE" "$NC" "$RAIL_STEP_LABEL" >&2

    if [[ "$IS_TTY" == true && "$RAIL_PROGRESS_OPEN" == true ]]; then
        printf '\r\033[K' >&2
    fi

    RAIL_STEP_OPEN=false
    RAIL_PROGRESS_OPEN=false
}

rail_step_done() {
    rail_step_settle "$GREEN"
}

rail_step_failed() {
    rail_step_settle "$RED"
}

rail_detail_in() {
    printf '%b%s%b  %b%s%b\n' "$DIM" "$GLYPH_BAR" "$NC" "$1" "$2" "$NC" >&2
}

# The result of a step, printed underneath its node.
rail_detail() {
    rail_detail_in "$DIM" "$1"
}

# Same shape as rail_detail, but highlighted because it explains a failure
# rather than a result.
rail_error_detail() {
    rail_detail_in "$RED" "$1"
}

rail_close() {
    printf '%b%s%b  %s\n' "$1" "$GLYPH_END" "$NC" "$2" >&2
}

rail_end() {
    rail_close "$GREEN" "$1"
}

rail_end_failed() {
    rail_close "$RED" "$1"
}

# A plain filled node: a row that states something rather than reporting the
# outcome of a step, so there is nothing here to succeed or fail.
rail_node() {
    printf '%b%s%b  %s\n' "$GREEN" "$GLYPH_DONE" "$NC" "$1" >&2
}

# Closes the rail with the follow-up commands listed underneath it. They sit
# outside the rail, so they are indented to the same column instead of hanging
# off a bar.
rail_next_steps() {
    local line

    rail_close "$GREEN" "Next"

    for line in "$@"; do
        printf '   %b%s%b\n' "$DIM" "$line" "$NC" >&2
    done
}

# Aborts the installer. The first argument states the failure and any further
# arguments are printed underneath it as context. Once the rail is open the
# failure is reported as part of it, so the output always ends with a closed rail.
error_exit() {
    local message="$1"
    local line
    shift

    if [[ "$RAIL_STARTED" == true ]]; then
        if [[ "$RAIL_STEP_OPEN" == true ]]; then
            rail_step_failed
        fi
        rail_error_detail "$message"
    else
        printf '%bError: %s%b\n' "$RED" "$message" "$NC" >&2
    fi

    for line in "$@"; do
        if [[ -n "$line" ]]; then
            if [[ "$RAIL_STARTED" == true ]]; then
                rail_detail "$line"
            else
                printf '%s\n' "$line" >&2
            fi
        fi
    done

    if [[ "$RAIL_STARTED" == true ]]; then
        rail_end_failed "$FAILURE_SUMMARY"
    fi

    exit 1
}

# Shortens paths under the home directory so the rail stays narrow.
display_path() {
    printf '%s' "${1/#$HOME/\~}"
}

show_help() {
    cat << EOF
Primal SDK Installer

Usage: install.sh [OPTIONS]

Options:
    --help                  Show this help message
    --version <version>     Install a specific version (e.g., 0.4.3)
    --install-dir <path>    Override default install location (~/.local/bin)
    --uninstall             Remove Primal binary and PATH entry

Examples:
    install.sh                      Install latest version
    install.sh --version 0.4.3      Install specific version
    install.sh --uninstall          Uninstall Primal

EOF
    exit 0
}

# ============================================================================
# Platform Detection
# ============================================================================

detect_os() {
    case "$(uname -s)" in
        Linux*)  echo "linux" ;;
        Darwin*) echo "macos" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *) error_exit "Unsupported operating system: $(uname -s)" ;;
    esac
}

# Each release ships exactly one binary per operating system, so the
# architecture follows from the operating system rather than from 'uname -m'.
detect_arch() {
    local os="$1"

    case "$os" in
        linux)   echo "x86-64" ;;
        macos)   echo "arm64" ;;
        windows) echo "x86-64" ;;
        *) error_exit "Unsupported operating system: $os" ;;
    esac
}

# ============================================================================
# Download Utilities
# ============================================================================

# Whatever the downloader wrote to stderr, kept so a failure can be explained.
DOWNLOAD_ERROR_LOG=""

has_command() {
    command -v "$1" >/dev/null 2>&1
}

progress_bar() {
    local percent="$1"
    local width=20
    local filled=$(( percent * width / 100 ))
    local bar=""
    local i

    for (( i = 0; i < width; i++ )); do
        if (( i < filled )); then
            bar+="$GLYPH_FILL"
        else
            bar+="$GLYPH_TRACK"
        fi
    done

    printf '%s' "$bar"
}

# Redraws the progress line underneath the open step, in place. The bar is
# indented to sit directly below the step's label.
render_download_progress() {
    local percent="$1"

    if [[ "$IS_TTY" != true ]]; then
        return 0
    fi

    printf '\r\033[K   %s %3d%%' "$(progress_bar "$percent")" "$percent" >&2
}

# The completed download, kept as a detail under its node.
download_summary() {
    printf '%s 100%%   %s' "$(progress_bar 100)" "$1"
}

# curl reports progress on stderr as carriage-return separated updates. Reading
# those updates lets the percentage be redrawn inside the rail, instead of
# letting curl paint its own full-width bar across it.
download_with_curl() {
    local url="$1"
    local output="$2"
    local line

    # -f: fail on errors
    # -L: follow redirects
    # --progress-bar: report progress instead of the full statistics table
    curl -fL --progress-bar "$url" -o "$output" 2>&1 |
        while IFS= read -r -d $'\r' line || [[ -n "$line" ]]; do
            if [[ "$line" =~ ([0-9]+)\.[0-9]+% ]]; then
                render_download_progress "${BASH_REMATCH[1]}"
            elif [[ -n "${line//[[:space:]]/}" ]]; then
                printf '%s\n' "$line" >> "$DOWNLOAD_ERROR_LOG"
            fi
        done

    return "${PIPESTATUS[0]}"
}

# wget's progress output is not stable enough to parse, so the step just shows
# that a download is in flight.
download_with_wget() {
    local url="$1"
    local output="$2"

    if [[ "$IS_TTY" == true ]]; then
        printf '\r\033[K   %bdownloading...%b' "$DIM" "$NC" >&2
    fi

    wget -q "$url" -O "$output" 2>> "$DOWNLOAD_ERROR_LOG"
}

download_file() {
    local url="$1"
    local output="$2"

    if has_command curl; then
        rail_progress_open
        download_with_curl "$url" "$output"
    elif has_command wget; then
        rail_progress_open
        download_with_wget "$url" "$output"
    else
        error_exit "Neither curl nor wget found. Please install one of them."
    fi
}

fetch_url() {
    local url="$1"

    if has_command curl; then
        curl -fsSL "$url"
    elif has_command wget; then
        wget -qO- "$url"
    else
        error_exit "Neither curl nor wget found. Please install one of them."
    fi
}

# Reports the HTTP status code returned by a URL, or an empty string / "000" if
# the request could not be made at all. Unlike fetch_url, an error response is
# not treated as a failure, so callers can react to a specific status.
get_http_status() {
    local url="$1"

    if has_command curl; then
        curl -sSL -o /dev/null -w '%{http_code}' "$url" 2>/dev/null
    elif has_command wget; then
        wget --spider --server-response "$url" 2>&1 | grep -oE 'HTTP/[0-9.]+ [0-9]{3}' | tail -1 | grep -oE '[0-9]{3}$'
    fi
}

# Human readable size of a downloaded file. 'wc -c' is used because 'stat'
# takes different flags on Linux and macOS.
format_file_size() {
    local bytes

    bytes=$(wc -c < "$1" 2>/dev/null | tr -d '[:space:]') || bytes=0

    awk -v bytes="${bytes:-0}" 'BEGIN {
        if (bytes >= 1048576) printf "%.1f MB", bytes / 1048576
        else if (bytes >= 1024) printf "%.1f KB", bytes / 1024
        else printf "%d B", bytes
    }'
}

# ============================================================================
# Version Management
# ============================================================================

# Explains why a GitHub API request failed, based on the status it responds with.
github_api_error_exit() {
    local url="$1"
    local status

    status=$(get_http_status "$url") || true

    case "$status" in
        403|429)
            rail_step_failed
            rail_error_detail "GitHub API rate limit exceeded (HTTP ${status})"
            rail_detail "Unauthenticated requests are limited to 60 per hour per IP address."
            rail_gap
            rail_detail "Wait for the limit to reset, or install a specific version:"
            rail_detail "  install.sh --version <version>"
            rail_detail "  https://github.com/${GITHUB_REPO}/releases"
            rail_end_failed "$FAILURE_SUMMARY"
            exit 1
            ;;
        404)
            error_exit "No releases found for ${GITHUB_REPO} (HTTP 404)"
            ;;
        000|"")
            error_exit "Could not reach GitHub. Please check your internet connection."
            ;;
        *)
            error_exit "Failed to fetch latest release information from GitHub (HTTP ${status})"
            ;;
    esac
}

get_latest_version() {
    local api_url="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"
    local response
    local version

    if ! response=$(fetch_url "$api_url"); then
        github_api_error_exit "$api_url"
    fi

    # Extract tag_name from JSON response using jq if available, otherwise fall back to grep/sed
    if has_command jq; then
        version=$(echo "$response" | jq -r '.tag_name' | sed 's/^v//')
    else
        # Fallback: extract tag_name using grep/sed (handles both with and without 'v' prefix)
        version=$(echo "$response" | grep -o '"tag_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"tag_name"[[:space:]]*:[[:space:]]*"v\?\([^"]*\)".*/\1/')
    fi

    echo "$version"
}

get_installed_version() {
    if [[ -x "${INSTALL_DIR}/${BINARY_NAME}" ]]; then
        "${INSTALL_DIR}/${BINARY_NAME}" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo ""
    else
        echo ""
    fi
}

# ============================================================================
# PATH Management
# ============================================================================

path_contains_install_dir() {
    echo "$PATH" | tr ':' '\n' | grep -q "^${INSTALL_DIR}$"
}

get_shell_config_file() {
    local shell_name
    shell_name="$(basename "$SHELL")"

    case "$shell_name" in
        bash)
            if [[ -f "${HOME}/.bashrc" ]]; then
                echo "${HOME}/.bashrc"
            elif [[ -f "${HOME}/.bash_profile" ]]; then
                echo "${HOME}/.bash_profile"
            else
                echo "${HOME}/.bashrc"
            fi
            ;;
        zsh)
            echo "${HOME}/.zshrc"
            ;;
        fish)
            echo "${HOME}/.config/fish/config.fish"
            ;;
        *)
            echo "${HOME}/.profile"
            ;;
    esac
}

add_to_path() {
    local config_file
    config_file="$(get_shell_config_file)"
    local shell_name
    shell_name="$(basename "$SHELL")"
    local path_export_line
    local fish_export_line

    # Define the exact lines we add
    path_export_line="export PATH=\"${INSTALL_DIR}:\$PATH\""
    fish_export_line="set -gx PATH \"${INSTALL_DIR}\" \$PATH"

    # Check if our exact PATH entry already exists in config file
    if [[ -f "$config_file" ]]; then
        if grep -qF "$path_export_line" "$config_file" 2>/dev/null || \
           grep -qF "$fish_export_line" "$config_file" 2>/dev/null; then
            return 0
        fi
    fi

    # Create config file directory if needed (for fish)
    mkdir -p "$(dirname "$config_file")"

    # Add PATH entry based on shell type
    echo "" >> "$config_file"
    echo "# Added by Primal SDK installer" >> "$config_file"

    if [[ "$shell_name" == "fish" ]]; then
        echo "$fish_export_line" >> "$config_file"
    else
        echo "$path_export_line" >> "$config_file"
    fi

    PATH_WAS_MODIFIED=true
}

# Returns non-zero when there was no shell config file to clean up.
remove_from_path() {
    local config_file
    config_file="$(get_shell_config_file)"

    if [[ ! -f "$config_file" ]]; then
        return 1
    fi

    # Create a temporary file
    local temp_file
    temp_file=$(mktemp)

    # Remove the Primal PATH entries (using fixed string matching for exactness)
    grep -vF "# Added by Primal SDK installer" "$config_file" | \
    grep -vF "export PATH=\"${INSTALL_DIR}:\$PATH\"" | \
    grep -vF "set -gx PATH \"${INSTALL_DIR}\" \$PATH" > "$temp_file" || true

    mv "$temp_file" "$config_file"
}

# ============================================================================
# Installation Functions
# ============================================================================

# The freshly downloaded binary and its size, shared between the download step
# and the install step that follows it.
DOWNLOAD_FILE=""
DOWNLOAD_SIZE=""

download_binary() {
    local version="$1"
    local os="$2"
    local arch="$3"
    local download_url="https://github.com/${GITHUB_REPO}/raw/refs/tags/v${version}/bin/${BINARY_NAME}-${os}-${arch}"
    local reason=""

    DOWNLOAD_FILE=$(mktemp)
    DOWNLOAD_ERROR_LOG=$(mktemp)

    if ! download_file "$download_url" "$DOWNLOAD_FILE"; then
        # The downloader's own last words, if it had any, explain the failure
        # far better than the URL alone does.
        reason=$(grep -v '^[[:space:]]*$' "$DOWNLOAD_ERROR_LOG" 2>/dev/null | tail -1)
        rm -f "$DOWNLOAD_FILE" "$DOWNLOAD_ERROR_LOG"
        error_exit "Failed to download from ${download_url}" "$reason"
    fi

    rm -f "$DOWNLOAD_ERROR_LOG"
    DOWNLOAD_SIZE=$(format_file_size "$DOWNLOAD_FILE")
}

install_binary() {
    local os="$1"
    local binary_suffix=""

    if [[ "$os" == "windows" ]]; then
        binary_suffix=".exe"
    fi

    # Create install directory if it doesn't exist
    mkdir -p "${INSTALL_DIR}"

    # Move binary to install location
    mv "$DOWNLOAD_FILE" "${INSTALL_DIR}/${BINARY_NAME}${binary_suffix}"

    # Set executable permission
    chmod +x "${INSTALL_DIR}/${BINARY_NAME}${binary_suffix}"

    echo "${INSTALL_DIR}/${BINARY_NAME}${binary_suffix}"
}

# What the installed binary reports about itself, used as proof it runs.
VERIFIED_VERSION=""

verify_installation() {
    if [[ -x "${INSTALL_DIR}/${BINARY_NAME}" ]]; then
        VERIFIED_VERSION=$("${INSTALL_DIR}/${BINARY_NAME}" --version 2>/dev/null | head -1) || true
        if [[ -n "$VERIFIED_VERSION" ]]; then
            return 0
        fi
    fi
    return 1
}

# ============================================================================
# Uninstall Function
# ============================================================================

uninstall() {
    local binary_path="${INSTALL_DIR}/${BINARY_NAME}"
    local config_file
    config_file=$(get_shell_config_file)

    FAILURE_SUMMARY="Uninstall failed"

    rail_start "Primal SDK"
    rail_gap

    rail_step "Binary"
    if [[ -f "$binary_path" ]]; then
        rm -f "$binary_path"
        rail_step_done
        rail_detail "removed $(display_path "$binary_path")"
    else
        rail_step_failed
        rail_error_detail "not found at $(display_path "$binary_path")"
    fi
    rail_gap

    rail_step "Shell PATH"
    if remove_from_path; then
        rail_step_done
        rail_detail "entry removed from $(display_path "$config_file")"
    else
        rail_step_failed
        rail_error_detail "no shell config file at $(display_path "$config_file")"
    fi
    rail_gap

    rail_node "Primal SDK uninstalled"
    rail_gap

    rail_next_steps "restart your shell to drop the PATH entry"

    exit 0
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    local target_version=""
    local do_uninstall=false
    local os
    local arch
    local installed_version
    local installed_path
    local config_file
    local next_steps=()

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --help)
                show_help
                ;;
            --version)
                if [[ -z "$2" || "$2" == --* ]]; then
                    error_exit "--version requires a version number (e.g., --version 0.4.3)"
                fi
                target_version="$2"
                shift 2
                ;;
            --install-dir)
                if [[ -z "$2" || "$2" == --* ]]; then
                    error_exit "--install-dir requires a path"
                fi
                INSTALL_DIR="$2"
                shift 2
                ;;
            --uninstall)
                do_uninstall=true
                shift
                ;;
            *)
                error_exit "Unknown option: $1. Use --help for usage information."
                ;;
        esac
    done

    # Handle uninstall
    if [[ "$do_uninstall" == true ]]; then
        uninstall
    fi

    # Checked once up front: reporting it from inside a step would nest the
    # failure in a command substitution and close the rail twice.
    if ! has_command curl && ! has_command wget; then
        error_exit "Neither curl nor wget found. Please install one of them."
    fi

    os=$(detect_os)
    arch=$(detect_arch "$os")
    config_file=$(get_shell_config_file)

    rail_start "Primal SDK"
    rail_gap

    # Check for existing installation
    rail_step "Existing installation"
    installed_version=$(get_installed_version)
    rail_step_done
    if [[ -n "$installed_version" ]]; then
        rail_detail "v${installed_version}"
    else
        rail_detail "none found"
    fi
    rail_gap

    # Determine target version
    if [[ -n "$target_version" ]]; then
        rail_step "Requested release"
        rail_step_done
    else
        rail_step "Latest release"
        target_version=$(get_latest_version)
        if [[ -z "$target_version" ]]; then
            error_exit "Failed to determine latest version"
        fi
        rail_step_done
    fi
    rail_detail "v${target_version}"
    rail_gap

    # Check if already up to date
    if [[ "$installed_version" == "$target_version" ]]; then
        rail_end "Already up to date (v${target_version})"
        exit 0
    fi

    # Download
    rail_step "Downloading ${BINARY_NAME}-${os}-${arch}"
    download_binary "$target_version" "$os" "$arch"
    rail_step_done
    rail_detail "$(download_summary "$DOWNLOAD_SIZE")"
    rail_gap

    # Install
    rail_step "Installed"
    installed_path=$(install_binary "$os")
    rail_step_done
    rail_detail "$(display_path "$installed_path")"

    # Update PATH if needed (only on fresh install)
    if [[ -z "$installed_version" ]]; then
        rail_gap
        rail_step "Shell PATH"
        if path_contains_install_dir; then
            rail_step_done
            rail_detail "already contains $(display_path "$INSTALL_DIR")"
        else
            add_to_path
            rail_step_done
            if [[ "$PATH_WAS_MODIFIED" == true ]]; then
                rail_detail "added to $(display_path "$config_file")"
            else
                rail_detail "already configured in $(display_path "$config_file")"
            fi
        fi
    fi

    # Verify installation
    rail_gap
    rail_step "Verified"
    if ! verify_installation; then
        error_exit "Installation verification failed. Please check the installation manually."
    fi
    rail_step_done
    rail_detail "$VERIFIED_VERSION"
    rail_gap

    if [[ "$PATH_WAS_MODIFIED" == true ]]; then
        next_steps+=("source $(display_path "$config_file")")
    fi

    if [[ "$os" == "windows" ]]; then
        next_steps+=("${BINARY_NAME}.exe --version")
    else
        next_steps+=("${BINARY_NAME} --version")
    fi

    if [[ -n "$installed_version" ]]; then
        rail_node "Primal v${installed_version} ${GLYPH_ARROW} v${target_version}"
    else
        rail_node "Primal v${target_version} ready"
    fi
    rail_gap

    rail_next_steps "${next_steps[@]}"
}

main "$@"
