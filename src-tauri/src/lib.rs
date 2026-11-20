use std::fs;
use std::path::{Path, PathBuf};

use percent_encoding::percent_decode_str;
use tauri::ipc::{InvokeBody, Request, Response};

/// Reads a file and returns its raw bytes (sent as a binary IPC response, not JSON).
#[tauri::command]
fn read_file(path: String) -> Result<Response, String> {
    fs::read(&path)
        .map(Response::new)
        .map_err(|e| format!("Could not read {path}: {e}"))
}

/// Writes the raw request body to the path given in the `x-path` header
/// (percent-encoded so non-ASCII paths survive). Writes to a temp file first
/// and renames it over the target so a failed save never corrupts the original.
#[tauri::command]
fn write_file(request: Request<'_>) -> Result<(), String> {
    let InvokeBody::Raw(data) = request.body() else {
        return Err("Expected a binary request body".into());
    };
    let encoded = request
        .headers()
        .get("x-path")
        .ok_or("Missing x-path header")?
        .to_str()
        .map_err(|e| e.to_string())?;
    let path = PathBuf::from(
        percent_decode_str(encoded)
            .decode_utf8()
            .map_err(|e| e.to_string())?
            .into_owned(),
    );

    let file_name = path
        .file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy()
        .into_owned();
    let tmp = path.with_file_name(format!(".{file_name}.saving"));
    fs::write(&tmp, data).map_err(|e| format!("Could not write {}: {e}", path.display()))?;
    if let Err(e) = fs::rename(&tmp, &path) {
        let _ = fs::remove_file(&tmp);
        return Err(format!("Could not save {}: {e}", path.display()));
    }
    Ok(())
}

/// The PDF passed on the command line (e.g. via "Open with"), if any.
#[tauri::command]
fn initial_file() -> Option<String> {
    std::env::args().skip(1).find(|arg| {
        let p = Path::new(arg);
        p.is_file()
            && p.extension()
                .is_some_and(|ext| ext.eq_ignore_ascii_case("pdf"))
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_file, write_file, initial_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
